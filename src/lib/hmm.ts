// Hidden Markov Model — 3-state Gaussian, Baum-Welch EM
// Paper: Hamilton (1989), Ang & Bekaert (2002)

export type HMMResult = {
  states: number[];         // state index per bar
  means: number[];          // mean return per state
  stds: number[];           // std per state
  transitionMatrix: number[][]; // A[i][j]
  stateLabels: string[];
};

export function fitHMM(returns: number[], nStates = 3, maxIter = 100): HMMResult {
  const T = returns.length;
  if (T < 30) {
    return {
      states: new Array(T).fill(1),
      means: [0, 0, 0], stds: [0.01, 0.01, 0.01],
      transitionMatrix: [[0.9, 0.05, 0.05], [0.05, 0.9, 0.05], [0.05, 0.05, 0.9]],
      stateLabels: ["BEAR", "SIDEWAYS", "BULL"],
    };
  }

  const X = [...returns];

  // Initialize via sorted tercile split
  const sorted = [...X].sort((a, b) => a - b);
  const chunk = Math.floor(T / nStates);
  const mu = new Array(nStates);
  const sigma2 = new Array(nStates);

  for (let k = 0; k < nStates; k++) {
    const slice = sorted.slice(k * chunk, (k + 1) * chunk);
    mu[k] = slice.reduce((a, b) => a + b, 0) / slice.length;
    sigma2[k] = Math.max(slice.reduce((s, v) => s + (v - mu[k]) ** 2, 0) / slice.length, 1e-10);
  }

  // Transition matrix — sticky diagonals
  const A: number[][] = [];
  for (let i = 0; i < nStates; i++) {
    A[i] = new Array(nStates);
    for (let j = 0; j < nStates; j++) {
      A[i][j] = i === j ? 0.90 : 0.10 / (nStates - 1);
    }
  }

  const pi = new Array(nStates).fill(1 / nStates);

  const gaussPDF = (x: number, m: number, s2: number) =>
    Math.exp(-0.5 * (x - m) ** 2 / s2) / Math.sqrt(2 * Math.PI * s2);

  // EM iterations
  for (let iter = 0; iter < maxIter; iter++) {
    // Emissions
    const B: number[][] = [];
    for (let t = 0; t < T; t++) {
      B[t] = new Array(nStates);
      for (let k = 0; k < nStates; k++) {
        B[t][k] = Math.max(gaussPDF(X[t], mu[k], sigma2[k]), 1e-300);
      }
    }

    // Forward (scaled)
    const alpha: number[][] = [];
    const scale: number[] = [];
    alpha[0] = new Array(nStates);
    for (let k = 0; k < nStates; k++) alpha[0][k] = pi[k] * B[0][k];
    scale[0] = Math.max(alpha[0].reduce((a, b) => a + b, 0), 1e-300);
    for (let k = 0; k < nStates; k++) alpha[0][k] /= scale[0];

    for (let t = 1; t < T; t++) {
      alpha[t] = new Array(nStates);
      for (let k = 0; k < nStates; k++) {
        let s = 0;
        for (let j = 0; j < nStates; j++) s += alpha[t - 1][j] * A[j][k];
        alpha[t][k] = s * B[t][k];
      }
      scale[t] = Math.max(alpha[t].reduce((a, b) => a + b, 0), 1e-300);
      for (let k = 0; k < nStates; k++) alpha[t][k] /= scale[t];
    }

    // Backward (scaled)
    const beta: number[][] = [];
    beta[T - 1] = new Array(nStates).fill(1);
    for (let t = T - 2; t >= 0; t--) {
      beta[t] = new Array(nStates);
      for (let k = 0; k < nStates; k++) {
        let s = 0;
        for (let j = 0; j < nStates; j++) s += A[k][j] * B[t + 1][j] * beta[t + 1][j];
        beta[t][k] = s / scale[t + 1];
      }
    }

    // Gamma (state posteriors)
    const gamma: number[][] = [];
    for (let t = 0; t < T; t++) {
      gamma[t] = new Array(nStates);
      let gSum = 0;
      for (let k = 0; k < nStates; k++) {
        gamma[t][k] = alpha[t][k] * beta[t][k];
        gSum += gamma[t][k];
      }
      gSum = Math.max(gSum, 1e-300);
      for (let k = 0; k < nStates; k++) gamma[t][k] /= gSum;
    }

    // Xi (transition posteriors)
    const xi: number[][] = Array.from({ length: nStates }, () => new Array(nStates).fill(0));
    for (let t = 0; t < T - 1; t++) {
      let denom = 0;
      const numer: number[][] = Array.from({ length: nStates }, () => new Array(nStates).fill(0));
      for (let i = 0; i < nStates; i++) {
        for (let j = 0; j < nStates; j++) {
          numer[i][j] = alpha[t][i] * A[i][j] * B[t + 1][j] * beta[t + 1][j];
          denom += numer[i][j];
        }
      }
      denom = Math.max(denom, 1e-300);
      for (let i = 0; i < nStates; i++) {
        for (let j = 0; j < nStates; j++) {
          xi[i][j] += numer[i][j] / denom;
        }
      }
    }

    // M-step
    for (let k = 0; k < nStates; k++) {
      let gSum = 0, wSum = 0, vSum = 0;
      for (let t = 0; t < T; t++) {
        gSum += gamma[t][k];
        wSum += gamma[t][k] * X[t];
      }
      gSum = Math.max(gSum, 1e-10);
      mu[k] = wSum / gSum;
      for (let t = 0; t < T; t++) {
        vSum += gamma[t][k] * (X[t] - mu[k]) ** 2;
      }
      sigma2[k] = Math.max(vSum / gSum, 1e-10);
    }

    // Update transition matrix
    for (let i = 0; i < nStates; i++) {
      let rowSum = Math.max(xi[i].reduce((a, b) => a + b, 0), 1e-10);
      for (let j = 0; j < nStates; j++) {
        A[i][j] = xi[i][j] / rowSum;
      }
    }

    // Update pi
    const g0Sum = Math.max(gamma[0].reduce((a, b) => a + b, 0), 1e-10);
    for (let k = 0; k < nStates; k++) pi[k] = gamma[0][k] / g0Sum;
  }

  // Sort states by mean
  const order = mu.map((m, i) => ({ m, i })).sort((a, b) => a.m - b.m).map((x) => x.i);
  const sortedMu = order.map((i) => mu[i]);
  const sortedStd = order.map((i) => Math.sqrt(sigma2[i]));
  const sortedA = order.map((i) => order.map((j) => A[i][j]));

  // Decode states
  // Recompute gamma with final params for decoding
  const states: number[] = [];
  const B2: number[][] = [];
  for (let t = 0; t < T; t++) {
    B2[t] = new Array(nStates);
    for (let k = 0; k < nStates; k++) {
      B2[t][k] = Math.max(gaussPDF(X[t], sortedMu[k], sortedStd[k] ** 2), 1e-300);
    }
    let bestK = 0, bestP = 0;
    for (let k = 0; k < nStates; k++) {
      if (B2[t][k] > bestP) { bestP = B2[t][k]; bestK = k; }
    }
    states.push(bestK);
  }

  const labels = nStates === 2
    ? ["BEAR", "BULL"]
    : nStates === 3
      ? ["BEAR", "SIDEWAYS", "BULL"]
      : ["CRASH", "BEAR", "SIDEWAYS", "BULL"];

  return {
    states,
    means: sortedMu,
    stds: sortedStd,
    transitionMatrix: sortedA,
    stateLabels: labels,
  };
}

// ─── Regime breakdown of trades ───
export function regimeBreakdown(
  trades: { entryBar: number; returnPct: number }[],
  states: number[],
  stateLabels: string[]
): { label: string; count: number; avgReturn: number; winRate: number }[] {
  const byState: Record<number, number[]> = {};
  for (const t of trades) {
    const s = states[t.entryBar] ?? 1;
    if (!byState[s]) byState[s] = [];
    byState[s].push(t.returnPct);
  }

  return stateLabels.map((label, k) => {
    const rets = byState[k] || [];
    return {
      label,
      count: rets.length,
      avgReturn: rets.length > 0 ? rets.reduce((a, b) => a + b, 0) / rets.length : 0,
      winRate: rets.length > 0 ? (rets.filter((r) => r > 0).length / rets.length) * 100 : 0,
    };
  });
}
