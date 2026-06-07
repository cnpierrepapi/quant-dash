// Statistical tests — runs test, Monte Carlo bootstrap, VaR/CVaR
// Papers: Wald-Wolfowitz (1940), Easley/López de Prado (2012), Cornish-Fisher (1937)

import { normalCDF, normalInverse, mean, stddev, skewness, kurtosis, percentile, shuffle } from "./math-utils";

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

  // Count runs
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

// ─── Monte Carlo Bootstrap ───
// Shuffle trade returns N times, compare actual result to distribution
export function monteCarloBootstrap(tradeReturns: number[], nSims = 10000): {
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

  const actualReturn = tradeReturns.reduce((prod, r) => prod * (1 + r / 100), 1) - 1;
  const simReturns: number[] = [];

  for (let i = 0; i < nSims; i++) {
    const shuffled = shuffle(tradeReturns);
    const simReturn = shuffled.reduce((prod, r) => prod * (1 + r / 100), 1) - 1;
    simReturns.push(simReturn);
  }

  const sorted = [...simReturns].sort((a, b) => a - b);
  const rank = sorted.filter((r) => r < actualReturn).length / nSims * 100;
  const profitable = sorted.filter((r) => r > 0).length / nSims * 100;

  return {
    actualReturn: actualReturn * 100,
    medianReturn: percentile(simReturns, 50) * 100,
    p5: percentile(simReturns, 5) * 100,
    p95: percentile(simReturns, 95) * 100,
    percentileRank: rank,
    pctProfitable: profitable,
  };
}

// ─── Value at Risk ───
export type VaRResult = {
  historical: number;
  parametric: number;
  cornishFisher: number;
  cvar: number;
};

export function computeVaR(returns: number[], confidence = 0.95): VaRResult {
  const alpha = 1 - confidence;
  const mu = mean(returns);
  const sigma = stddev(returns);
  const z = normalInverse(alpha);

  // Historical
  const historical = percentile(returns, alpha * 100);

  // Parametric (Gaussian)
  const parametric = mu + z * sigma;

  // Cornish-Fisher (skew + kurtosis adjusted)
  const s = skewness(returns);
  const k = kurtosis(returns);
  const zCF = z + (z * z - 1) * s / 6 + (z * z * z - 3 * z) * k / 24
    - (2 * z * z * z - 5 * z) * s * s / 36;
  const cornishFisher = mu + zCF * sigma;

  // CVaR (Expected Shortfall)
  const belowVaR = returns.filter((r) => r <= historical);
  const cvar = belowVaR.length > 0 ? mean(belowVaR) : historical;

  return { historical, parametric, cornishFisher, cvar };
}

// ─── VPIN Correlation ───
// Correlate VPIN levels with subsequent return magnitudes
export function vpinCorrelation(
  vpinValues: (number | null)[],
  returns: number[],
  lookahead = 5
): { correlation: number; highVpinAvgMove: number; lowVpinAvgMove: number; ratio: number } {
  const validPairs: { vpin: number; move: number }[] = [];

  for (let i = 0; i < vpinValues.length - lookahead; i++) {
    const v = vpinValues[i];
    if (v === null) continue;
    // Average absolute return over next `lookahead` bars
    let sumAbs = 0;
    for (let j = 1; j <= lookahead && i + j < returns.length; j++) {
      sumAbs += Math.abs(returns[i + j]);
    }
    validPairs.push({ vpin: v, move: sumAbs / lookahead });
  }

  if (validPairs.length < 20) {
    return { correlation: 0, highVpinAvgMove: 0, lowVpinAvgMove: 0, ratio: 1 };
  }

  // Split by VPIN quintile
  const sorted = [...validPairs].sort((a, b) => a.vpin - b.vpin);
  const q80 = Math.floor(sorted.length * 0.8);
  const highVpin = sorted.slice(q80);
  const lowVpin = sorted.slice(0, sorted.length - q80);

  const highAvg = mean(highVpin.map((p) => p.move));
  const lowAvg = mean(lowVpin.map((p) => p.move));

  // Simple correlation
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
