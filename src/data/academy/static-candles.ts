// Static candle datasets for interactive tutorials
// Each dataset is crafted to clearly illustrate a specific concept

export type StaticCandle = {
  time: number; open: number; high: number; low: number;
  close: number; volume: number; takerBuyVol: number;
};

// Seeded PRNG for deterministic generation
function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// Generate candles following a prescribed trend template
function generateCandles(
  seed: number,
  segments: { bars: number; drift: number; vol: number }[],
  startPrice: number,
  baseTime: number,
): StaticCandle[] {
  const rng = seededRandom(seed);
  const candles: StaticCandle[] = [];
  let price = startPrice;

  for (const seg of segments) {
    for (let i = 0; i < seg.bars; i++) {
      const ret = seg.drift + seg.vol * (rng() - 0.5) * 2;
      const open = price;
      const close = open * (1 + ret);
      const wickUp = open * seg.vol * rng() * 0.8;
      const wickDown = open * seg.vol * rng() * 0.8;
      const high = Math.max(open, close) + wickUp;
      const low = Math.min(open, close) - wickDown;
      const volume = 50 + rng() * 200 + (Math.abs(ret) > seg.vol ? 150 : 0);
      const takerBuyVol = volume * (0.3 + rng() * 0.4);

      candles.push({
        time: baseTime + candles.length * 3600,
        open: +open.toFixed(2),
        high: +high.toFixed(2),
        low: +low.toFixed(2),
        close: +close.toFixed(2),
        volume: +volume.toFixed(2),
        takerBuyVol: +takerBuyVol.toFixed(2),
      });
      price = close;
    }
  }
  return candles;
}

// ═══════════════════════════════════════════════
// DATASET 1: SMA vs EMA — Clear golden cross & death cross
// Downtrend → consolidation → golden cross → uptrend → death cross → decline
// ═══════════════════════════════════════════════
export const SMA_EMA_DATASET: StaticCandle[] = generateCandles(
  42,
  [
    { bars: 70, drift: -0.002, vol: 0.008 },    // downtrend
    { bars: 40, drift: 0.0005, vol: 0.005 },     // flat consolidation
    { bars: 25, drift: 0.004, vol: 0.006 },      // rising — EMA20 crosses above EMA50 (golden cross)
    { bars: 60, drift: 0.003, vol: 0.007 },      // sustained uptrend
    { bars: 20, drift: -0.001, vol: 0.005 },     // topping
    { bars: 25, drift: -0.004, vol: 0.008 },     // EMA20 crosses below EMA50 (death cross)
    { bars: 60, drift: -0.002, vol: 0.007 },     // decline
  ],
  45000,
  1700000000,
);

// ═══════════════════════════════════════════════
// DATASET 2: Bollinger Bands — Squeeze → breakout
// Normal vol → squeeze (bands contract) → explosive breakout → trend walk → mean reversion
// ═══════════════════════════════════════════════
export const BOLLINGER_DATASET: StaticCandle[] = generateCandles(
  137,
  [
    { bars: 80, drift: 0.0005, vol: 0.012 },     // normal volatility, slight uptrend
    { bars: 30, drift: 0.0002, vol: 0.008 },     // vol starts contracting
    { bars: 50, drift: 0.0001, vol: 0.003 },     // tight squeeze — very low vol
    { bars: 10, drift: 0.008, vol: 0.015 },      // BREAKOUT — sharp expansion
    { bars: 50, drift: 0.004, vol: 0.010 },      // trend walk along upper band
    { bars: 30, drift: -0.001, vol: 0.008 },     // mean reversion back to middle
    { bars: 50, drift: 0.0003, vol: 0.009 },     // settling back to normal
  ],
  42000,
  1700000000,
);

// ═══════════════════════════════════════════════
// DATASET 3: RSI — Clear overbought and oversold zones
// Rally to overbought → pullback → neutral → selloff to oversold → oversold bounce
// ═══════════════════════════════════════════════
export const RSI_DATASET: StaticCandle[] = generateCandles(
  256,
  [
    { bars: 30, drift: 0.001, vol: 0.006 },      // gentle rise
    { bars: 40, drift: 0.006, vol: 0.005 },      // strong rally → RSI > 70
    { bars: 15, drift: 0.002, vol: 0.004 },      // extended overbought
    { bars: 30, drift: -0.003, vol: 0.007 },     // pullback from overbought
    { bars: 30, drift: 0.0002, vol: 0.005 },     // neutral consolidation
    { bars: 40, drift: -0.006, vol: 0.006 },     // sharp selloff → RSI < 30
    { bars: 15, drift: -0.002, vol: 0.004 },     // extended oversold
    { bars: 25, drift: 0.005, vol: 0.008 },      // oversold BOUNCE — RSI crosses above 30
    { bars: 75, drift: 0.001, vol: 0.006 },      // recovery
  ],
  48000,
  1700000000,
);

// ═══════════════════════════════════════════════
// DATASET 4: Strategy Upload — Trending with clear crossovers + RSI extremes
// Produces 4-6 clear trades for golden-cross-with-RSI-filter backtest
// ═══════════════════════════════════════════════
export const STRATEGY_UPLOAD_DATASET: StaticCandle[] = generateCandles(
  777,
  [
    { bars: 40, drift: -0.002, vol: 0.007 },     // decline (RSI drops)
    { bars: 15, drift: 0.001, vol: 0.005 },      // consolidation
    { bars: 30, drift: 0.004, vol: 0.006 },      // rally — golden cross #1
    { bars: 25, drift: 0.002, vol: 0.007 },      // continue up
    { bars: 20, drift: -0.003, vol: 0.008 },     // selloff — death cross #1
    { bars: 15, drift: -0.001, vol: 0.005 },     // bottom
    { bars: 30, drift: 0.005, vol: 0.007 },      // strong rally — golden cross #2
    { bars: 30, drift: 0.001, vol: 0.006 },      // hold
    { bars: 25, drift: -0.004, vol: 0.009 },     // drop — death cross #2
    { bars: 20, drift: 0.0005, vol: 0.005 },     // consolidation
    { bars: 25, drift: 0.003, vol: 0.006 },      // rise — golden cross #3
    { bars: 25, drift: 0.002, vol: 0.007 },      // final uptrend
  ],
  44000,
  1700000000,
);

// Dataset registry
export const STATIC_DATASETS: Record<string, StaticCandle[]> = {
  "sma-ema": SMA_EMA_DATASET,
  "bollinger": BOLLINGER_DATASET,
  "rsi": RSI_DATASET,
  "strategy-upload": STRATEGY_UPLOAD_DATASET,
};
