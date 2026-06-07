// Statistical tests — runs test, Stationary Block Bootstrap, Expected Shortfall
// Papers: Wald-Wolfowitz (1940), Politis & Romano (1994) SBB, Basel III/IV ES

import { normalCDF, normalInverse, mean, stddev, skewness, kurtosis, percentile } from "./math-utils";

// ─── Wald-Wolfowitz Runs Test ───
// Tests if sequence of W/L is random
export function runsTest(returns: number[]): {
  runs: number; expected: number; z: number; pValue: number; isRandom: boolean;
} {
  const binary = returns.map((r) => (r > 0 ? 1 : 0));
  const n = binary.length;
  const n1 = binary.filter((b) => b === 1).length;
  const n2 = n - n1;

  if (n1 === 0 || n2 === 0 || n < 10) {
    return { runs: 0, expected: 0, z: 0, pValue: 1, isRandom: true };
  }

  let runs = 1;
  for (let i = 1; i < n; i++) {
    if (binary[i] !== binary[i - 1]) runs++;
  }

  const expected = (2 * n1 * n2) / n + 1;
  const variance = (2 * n1 * n2 * (2 * n1 * n2 - n)) / (n * n * (n - 1));
  const std = Math.sqrt(variance);
  const z = std > 0 ? (runs - expected) / std : 0;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  return { runs, expected, z, pValue, isRandom: pValue > 0.05 };
}

// ─── Stationary Block Bootstrap (SBB) ───
// Politis & Romano (1994). Preserves serial dependence by resampling
// in geometrically-distributed random-length blocks.
// Standard shuffle destroys autocorrelation → underestimates drawdowns
// for momentum strategies. SBB fixes this.
export function stationaryBlockBootstrap(tradeReturns: number[], nSims = 5000, avgBlockLen = 5): {
  actualReturn: number;
  medianReturn: number;
  p5: number;
  p95: number;
  percentileRank: number;
  pctProfitable: number;
} {
  if (tradeReturns.length < 5) {
    return { actualReturn: 0, medianReturn: 0, p5: 0, p95: 0, percentileRank: 50, pctProfitable: 50 };
  }

  const n = tradeReturns.length;
  const actualReturn = tradeReturns.reduce((prod, r) => prod * (1 + r / 100), 1) - 1;
  const simReturns: number[] = [];

  // Geometric block probability: P(block ends) = 1/avgBlockLen
  const pEnd = 1 / avgBlockLen;

  for (let sim = 0; sim < nSims; sim++) {
    const sampled: number[] = [];
    let pos = Math.floor(Math.random() * n); // random start

    while (sampled.length < n) {
      sampled.push(tradeReturns[pos]);

      // With probability pEnd, jump to a new random position (new block)
      // Otherwise, advance sequentially (continue block)
      if (Math.random() < pEnd) {
        pos = Math.floor(Math.random() * n);
      } else {
        pos = (pos + 1) % n; // wrap around
      }
    }

    const simReturn = sampled.reduce((prod, r) => prod * (1 + r / 100), 1) - 1;
    simReturns.push(simReturn);
  }

  const rank = simReturns.filter((r) => r < actualReturn).length / nSims * 100;
  const profitable = simReturns.filter((r) => r > 0).length / nSims * 100;

  return {
    actualReturn: actualReturn * 100,
    medianReturn: percentile(simReturns, 50) * 100,
    p5: percentile(simReturns, 5) * 100,
    p95: percentile(simReturns, 95) * 100,
    percentileRank: rank,
    pctProfitable: profitable,
  };
}

// ─── Expected Shortfall (ES) + VaR ───
// Basel III/IV mandates ES over VaR. ES = avg loss beyond VaR threshold.
// CF expansion used internally for analytical computation.
export type RiskResult = {
  // Expected Shortfall (primary — Basel III/IV standard)
  es97_5: number;        // ES at 97.5% (Basel standard)
  es95: number;          // ES at 95%
  // VaR (secondary — computed via Cornish-Fisher)
  varHistorical: number;
  varCornishFisher: number;
};

export function computeRisk(returns: number[]): RiskResult {
  if (returns.length < 10) {
    return { es97_5: 0, es95: 0, varHistorical: 0, varCornishFisher: 0 };
  }

  const mu = mean(returns);
  const sigma = stddev(returns);

  // Historical VaR at 95%
  const varHistorical = percentile(returns, 5);

  // Cornish-Fisher VaR at 95% (skew + kurtosis adjusted)
  const s = skewness(returns);
  const k = kurtosis(returns);
  const z95 = normalInverse(0.05);
  const zCF = z95 + (z95 * z95 - 1) * s / 6 + (z95 ** 3 - 3 * z95) * k / 24
    - (2 * z95 ** 3 - 5 * z95) * s * s / 36;
  const varCornishFisher = mu + zCF * sigma;

  // Expected Shortfall at 95%: mean of returns below VaR
  const belowVar95 = returns.filter((r) => r <= varHistorical);
  const es95 = belowVar95.length > 0 ? mean(belowVar95) : varHistorical;

  // Expected Shortfall at 97.5% (Basel III standard)
  const var97_5 = percentile(returns, 2.5);
  const belowVar97_5 = returns.filter((r) => r <= var97_5);
  const es97_5 = belowVar97_5.length > 0 ? mean(belowVar97_5) : var97_5;

  return { es97_5, es95, varHistorical, varCornishFisher };
}

// ─── VPIN Correlation ───
// Easley, López de Prado, O'Hara (2012). NOTE: Andersen & Bondarenko (2014)
// showed VPIN is mechanically correlated with volume. Treat as directional
// heuristic for order flow imbalance, not a predictive signal.
export function vpinCorrelation(
  vpinValues: (number | null)[],
  returns: number[],
  lookahead = 5
): { correlation: number; highVpinAvgMove: number; lowVpinAvgMove: number; ratio: number } {
  const validPairs: { vpin: number; move: number }[] = [];

  for (let i = 0; i < vpinValues.length - lookahead; i++) {
    const v = vpinValues[i];
    if (v === null) continue;
    let sumAbs = 0;
    for (let j = 1; j <= lookahead && i + j < returns.length; j++) {
      sumAbs += Math.abs(returns[i + j]);
    }
    validPairs.push({ vpin: v, move: sumAbs / lookahead });
  }

  if (validPairs.length < 20) {
    return { correlation: 0, highVpinAvgMove: 0, lowVpinAvgMove: 0, ratio: 1 };
  }

  const sorted = [...validPairs].sort((a, b) => a.vpin - b.vpin);
  const q80 = Math.floor(sorted.length * 0.8);
  const highVpin = sorted.slice(q80);
  const lowVpin = sorted.slice(0, sorted.length - q80);

  const highAvg = mean(highVpin.map((p) => p.move));
  const lowAvg = mean(lowVpin.map((p) => p.move));

  const vpins = validPairs.map((p) => p.vpin);
  const moves = validPairs.map((p) => p.move);
  const mV = mean(vpins), mM = mean(moves);
  let num = 0, dV = 0, dM = 0;
  for (let i = 0; i < vpins.length; i++) {
    num += (vpins[i] - mV) * (moves[i] - mM);
    dV += (vpins[i] - mV) ** 2;
    dM += (moves[i] - mM) ** 2;
  }
  const corr = Math.sqrt(dV * dM) > 0 ? num / Math.sqrt(dV * dM) : 0;

  return {
    correlation: corr,
    highVpinAvgMove: highAvg * 100,
    lowVpinAvgMove: lowAvg * 100,
    ratio: lowAvg > 0 ? highAvg / lowAvg : 1,
  };
}
