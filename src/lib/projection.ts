// Future Candle Projection Engine
// Based on: Filtered Historical Simulation + OHLC Microstructure Preservation
// Papers: Barone-Adesi et al. (2008), Gatheral (2018)
// Enhanced with Poisson jump-diffusion (Merton 1976, Kou 2002)

import { normalRandom, poissonRandom, mean, stddev, percentile } from "./math-utils";

export type CandleShape = {
  ret: number;     // close/open - 1
  highExt: number; // high/body_top - 1 (upper wick extension)
  lowExt: number;  // body_bot/low - 1 (lower wick extension)
};

export type ProjectedCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type FanBands = {
  time: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}[];

export type ProjectionResult = {
  paths: ProjectedCandle[][];
  fan: FanBands;
  medianPath: ProjectedCandle[];
};

// ─── Decompose real candles into shapes ───
export function decomposeCandles(
  candles: { open: number; high: number; low: number; close: number }[]
): CandleShape[] {
  return candles.map((c) => {
    const bodyTop = Math.max(c.open, c.close);
    const bodyBot = Math.min(c.open, c.close);
    return {
      ret: c.close / c.open - 1,
      highExt: bodyTop > 0 ? c.high / bodyTop - 1 : 0,
      lowExt: bodyBot > 0 && c.low > 0 ? bodyBot / c.low - 1 : 0,
    };
  });
}

// ─── Pool candles by trailing vol regime ───
export function poolByVolRegime(
  candles: { open: number; high: number; low: number; close: number }[],
  window = 20
): { low: CandleShape[]; mid: CandleShape[]; high: CandleShape[]; terciles: [number, number] } {
  const shapes = decomposeCandles(candles);
  const returns = shapes.map((s) => s.ret);

  // Compute trailing vol for each bar
  const trailingVols: number[] = [];
  for (let i = 0; i < returns.length; i++) {
    if (i < window) {
      trailingVols.push(NaN);
    } else {
      trailingVols.push(stddev(returns.slice(i - window, i)));
    }
  }

  // Compute terciles
  const validVols = trailingVols.filter((v) => !isNaN(v));
  if (validVols.length < 10) {
    // Not enough data — put everything in mid pool
    return { low: shapes, mid: shapes, high: shapes, terciles: [0, Infinity] };
  }

  const t33 = percentile(validVols, 33);
  const t66 = percentile(validVols, 66);

  const low: CandleShape[] = [];
  const mid: CandleShape[] = [];
  const high: CandleShape[] = [];

  for (let i = window; i < shapes.length; i++) {
    const v = trailingVols[i];
    if (v <= t33) low.push(shapes[i]);
    else if (v <= t66) mid.push(shapes[i]);
    else high.push(shapes[i]);
  }

  // Ensure no empty pools
  if (low.length === 0) low.push(...shapes.slice(0, 10));
  if (mid.length === 0) mid.push(...shapes.slice(0, 10));
  if (high.length === 0) high.push(...shapes.slice(0, 10));

  return { low, mid, high, terciles: [t33, t66] };
}

// ─── Separate jump candles (>3σ moves) ───
export function extractJumpPool(
  shapes: CandleShape[]
): { normalShapes: CandleShape[]; jumpShapes: CandleShape[]; jumpFrequency: number } {
  const rets = shapes.map((s) => s.ret);
  const sigma = stddev(rets);
  const threshold = 3 * sigma;

  const normalShapes: CandleShape[] = [];
  const jumpShapes: CandleShape[] = [];

  for (const s of shapes) {
    if (Math.abs(s.ret) > threshold) {
      jumpShapes.push(s);
    } else {
      normalShapes.push(s);
    }
  }

  // Jump frequency = number of jumps / total candles (as Poisson lambda per candle)
  const jumpFrequency = jumpShapes.length / shapes.length;

  return { normalShapes, jumpShapes, jumpFrequency };
}

// ─── GARCH-lite conditional volatility ───
function garchSigma(
  prevSigma: number,
  prevReturn: number,
  omega: number,
  alpha: number,
  beta: number
): number {
  return omega + alpha * Math.abs(prevReturn) + beta * prevSigma;
}

// ─── Generate one synthetic path ───
function generateOnePath(
  pools: { low: CandleShape[]; mid: CandleShape[]; high: CandleShape[] },
  terciles: [number, number],
  jumpPool: CandleShape[],
  jumpFrequency: number,
  horizon: number,
  startPrice: number,
  startSigma: number,
  garchParams: { omega: number; alpha: number; beta: number },
  startTime: number,
  timeStep: number
): ProjectedCandle[] {
  const path: ProjectedCandle[] = [];
  let price = startPrice;
  let sigma = startSigma;
  const trailingVol: number[] = new Array(20).fill(startSigma);

  for (let t = 0; t < horizon; t++) {
    // Determine regime from trailing vol
    const avgVol = mean(trailingVol);
    let pool: CandleShape[];
    let poolSigma: number;
    if (avgVol <= terciles[0]) {
      pool = pools.low;
      poolSigma = stddev(pools.low.map((s) => s.ret)) || startSigma;
    } else if (avgVol <= terciles[1]) {
      pool = pools.mid;
      poolSigma = stddev(pools.mid.map((s) => s.ret)) || startSigma;
    } else {
      pool = pools.high;
      poolSigma = stddev(pools.high.map((s) => s.ret)) || startSigma;
    }

    // Check for Poisson jump
    const nJumps = poissonRandom(jumpFrequency);
    let candle: CandleShape;
    if (nJumps > 0 && jumpPool.length > 0) {
      // Sample from jump pool
      candle = jumpPool[Math.floor(Math.random() * jumpPool.length)];
    } else {
      // Sample from regime pool
      candle = pool[Math.floor(Math.random() * pool.length)];
    }

    // Update GARCH sigma
    if (t > 0) {
      const prevRet = path[t - 1].close / path[t - 1].open - 1;
      sigma = garchSigma(sigma, prevRet, garchParams.omega, garchParams.alpha, garchParams.beta);
    }

    // Scale return by conditional vol ratio
    const volScale = poolSigma > 0 ? sigma / poolSigma : 1;
    const volInnovation = normalRandom(0, startSigma * 0.05);
    const adjustedScale = volScale * (1 + volInnovation);

    const scaledRet = candle.ret * adjustedScale;
    const scaledHighExt = candle.highExt * Math.abs(adjustedScale);
    const scaledLowExt = candle.lowExt * Math.abs(adjustedScale);

    // Build OHLC
    const o = price;
    const c = o * (1 + scaledRet);
    const bodyTop = Math.max(o, c);
    const bodyBot = Math.min(o, c);
    const h = bodyTop * (1 + scaledHighExt);
    const l = (1 + scaledLowExt) > 0 ? bodyBot / (1 + scaledLowExt) : bodyBot * 0.95;

    path.push({
      time: startTime + (t + 1) * timeStep,
      open: o,
      high: h,
      low: l,
      close: c,
    });

    price = c;
    trailingVol.shift();
    trailingVol.push(Math.abs(scaledRet));
  }

  return path;
}

// ─── Main: Generate N projection paths ───
export function generateProjection(
  candles: { time: number; open: number; high: number; low: number; close: number }[],
  nPaths = 50,
  horizon = 100
): ProjectionResult {
  if (candles.length < 50) {
    return { paths: [], fan: [], medianPath: [] };
  }

  // Pool candles
  const pools = poolByVolRegime(candles);
  const allShapes = decomposeCandles(candles);
  const { jumpShapes, jumpFrequency } = extractJumpPool(allShapes);

  // GARCH parameters from recent data
  const recentReturns = candles.slice(-90).map((c) => c.close / c.open - 1);
  const absReturns = recentReturns.map(Math.abs);
  // Autocorrelation of |returns| at lag 1
  let ac1 = 0;
  if (absReturns.length > 2) {
    const m = mean(absReturns);
    let num = 0, den = 0;
    for (let i = 1; i < absReturns.length; i++) {
      num += (absReturns[i] - m) * (absReturns[i - 1] - m);
      den += (absReturns[i] - m) ** 2;
    }
    ac1 = den > 0 ? num / den : 0;
  }

  const alpha = Math.max(ac1 * 0.5, 0.05);
  const beta = 0.85;
  const recentVol = stddev(recentReturns);
  const omega = recentVol * (1 - alpha - beta);
  const garchParams = { omega: Math.max(omega, 0), alpha, beta };

  // Start conditions
  const lastCandle = candles[candles.length - 1];
  const startPrice = lastCandle.close;
  const startTime = lastCandle.time;

  // Estimate time step from last two candles
  const timeStep = candles.length >= 2
    ? candles[candles.length - 1].time - candles[candles.length - 2].time
    : 3600;

  // Generate paths
  const paths: ProjectedCandle[][] = [];
  for (let i = 0; i < nPaths; i++) {
    paths.push(generateOnePath(
      pools, pools.terciles, jumpShapes, jumpFrequency,
      horizon, startPrice, recentVol, garchParams,
      startTime, timeStep
    ));
  }

  // Compute fan bands
  const fan: FanBands = [];
  for (let t = 0; t < horizon; t++) {
    const closes = paths.map((p) => p[t].close).sort((a, b) => a - b);
    fan.push({
      time: startTime + (t + 1) * timeStep,
      p10: percentile(closes, 10),
      p25: percentile(closes, 25),
      p50: percentile(closes, 50),
      p75: percentile(closes, 75),
      p90: percentile(closes, 90),
    });
  }

  // Median path (use p50 closes to reconstruct)
  const medianPath: ProjectedCandle[] = fan.map((f) => ({
    time: f.time,
    open: f.p50,
    high: f.p75,
    low: f.p25,
    close: f.p50,
  }));

  return { paths, fan, medianPath };
}
