// Stress test — run strategy on projected future candle paths
// Tests leverage sweep and survival probability

import type { ProjectionResult } from "./projection";
import { mean, percentile, stddev } from "./math-utils";

export type StressResult = {
  leverage: number;
  medianReturn: number;
  p5Return: number;
  p95Return: number;
  ruinPct: number;
  maxDDMedian: number;
  avgCBTrips: number;
};

export function stressTest(
  projectionPaths: { close: number }[][],
  leverageLevels = [1, 3, 5]
): StressResult[] {
  const results: StressResult[] = [];

  for (const lev of leverageLevels) {
    const finals: number[] = [];
    const maxDDs: number[] = [];
    let ruinCount = 0;
    const cbTrips: number[] = [];

    for (const path of projectionPaths) {
      let equity = 1;
      let peak = 1;
      let maxDD = 0;
      let cbs = 0;
      let cbCooldown = 0;

      for (let i = 1; i < path.length; i++) {
        if (cbCooldown > 0) { cbCooldown--; continue; }

        const ret = path[i].close / path[i - 1].close - 1;
        const leveragedRet = ret * lev;
        const fee = 0.001; // simplified
        equity *= (1 + leveragedRet - fee * Math.abs(ret > 0 ? 1 : 0));

        peak = Math.max(peak, equity);
        const dd = (equity - peak) / peak;
        maxDD = Math.min(maxDD, dd);

        // Circuit breakers
        if (leveragedRet < -0.03) { cbCooldown = 1; cbs++; }
        if (dd < -0.15) { cbCooldown = 5; cbs++; }
        if (equity < 0.05) { ruinCount++; break; }
      }

      finals.push(equity);
      maxDDs.push(maxDD);
      cbTrips.push(cbs);
    }

    results.push({
      leverage: lev,
      medianReturn: (percentile(finals, 50) - 1) * 100,
      p5Return: (percentile(finals, 5) - 1) * 100,
      p95Return: (percentile(finals, 95) - 1) * 100,
      ruinPct: (ruinCount / projectionPaths.length) * 100,
      maxDDMedian: percentile(maxDDs, 50) * 100,
      avgCBTrips: mean(cbTrips),
    });
  }

  return results;
}
