// Academic-grade indicator library
// Each function documents its paper reference

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  takerBuyVol: number;
};

// ─── EMA (Exponential Moving Average) ───
// Standard recursive: EMA_t = α * price + (1-α) * EMA_{t-1}, α = 2/(n+1)
export function ema(closes: number[], period: number): (number | null)[] {
  const alpha = 2 / (period + 1);
  const result: (number | null)[] = [];
  let prev: number | null = null;
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (prev === null) {
      prev = closes.slice(0, period).reduce((a, b) => a + b) / period;
      result.push(prev);
    } else {
      prev = alpha * closes[i] + (1 - alpha) * prev;
      result.push(prev);
    }
  }
  return result;
}

// ─── SMA (Simple Moving Average) ───
export function sma(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b) / period);
    }
  }
  return result;
}

// ─── RSI (Relative Strength Index) ───
// Wilder (1978). Smoothed average of gains vs losses.
export function rsi(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = [null];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    gains.push(delta > 0 ? delta : 0);
    losses.push(delta < 0 ? -delta : 0);

    if (i < period) {
      result.push(null);
    } else if (i === period) {
      const avgGain = gains.reduce((a, b) => a + b) / period;
      const avgLoss = losses.reduce((a, b) => a + b) / period;
      result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
    } else {
      const delta2 = closes[i] - closes[i - 1];
      const gain = delta2 > 0 ? delta2 : 0;
      const loss = delta2 < 0 ? -delta2 : 0;
      // Wilder smoothing
      const prevRsi = result[i - 1]!;
      const prevAvgGain = (100 / (100 - prevRsi) - 1) > 0
        ? gains.slice(-period).reduce((a, b) => a + b) / period : 0;
      const prevAvgLoss = losses.slice(-period).reduce((a, b) => a + b) / period;
      const avgGain = (prevAvgGain * (period - 1) + gain) / period;
      const avgLoss = (prevAvgLoss * (period - 1) + loss) / period;
      result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
    }
  }
  return result;
}

// ─── MACD ───
// Appel (1979). Signal = EMA(12) - EMA(26), Signal line = EMA(9) of MACD
export function macd(closes: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine: (number | null)[] = [];
  const macdValues: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (emaFast[i] !== null && emaSlow[i] !== null) {
      const v = emaFast[i]! - emaSlow[i]!;
      macdLine.push(v);
      macdValues.push(v);
    } else {
      macdLine.push(null);
    }
  }

  const signalLine = ema(macdValues, signal);
  // Align signal line with macd line
  const signalAligned: (number | null)[] = [];
  let si = 0;
  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] !== null) {
      signalAligned.push(signalLine[si] ?? null);
      si++;
    } else {
      signalAligned.push(null);
    }
  }

  const histogram: (number | null)[] = macdLine.map((m, i) =>
    m !== null && signalAligned[i] !== null ? m - signalAligned[i]! : null
  );

  return { macd: macdLine, signal: signalAligned, histogram };
}

// ─── Bollinger Bands ───
// Bollinger (1983). SMA ± k * σ
export function bollinger(closes: number[], period = 20, k = 2) {
  const mid = sma(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (mid[i] === null) {
      upper.push(null);
      lower.push(null);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = mid[i]!;
      const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
      upper.push(mean + k * std);
      lower.push(mean - k * std);
    }
  }
  return { upper, mid, lower };
}

// ─── ATR (Average True Range) ───
// Wilder (1978). Volatility measure.
export function atr(candles: Candle[], period = 14): (number | null)[] {
  const trs: number[] = [];
  const result: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      trs.push(candles[i].high - candles[i].low);
      result.push(null);
    } else {
      const tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      );
      trs.push(tr);
      if (i < period) {
        result.push(null);
      } else if (i === period) {
        result.push(trs.reduce((a, b) => a + b) / period);
      } else {
        result.push((result[i - 1]! * (period - 1) + tr) / period);
      }
    }
  }
  return result;
}

// ─── VWAP (Volume-Weighted Average Price) ───
// Reset daily. Cumulative (price * volume) / cumulative volume
export function vwap(candles: Candle[]): (number | null)[] {
  let cumPV = 0;
  let cumVol = 0;
  const result: (number | null)[] = [];

  for (const c of candles) {
    const typical = (c.high + c.low + c.close) / 3;
    cumPV += typical * c.volume;
    cumVol += c.volume;
    result.push(cumVol > 0 ? cumPV / cumVol : null);
  }
  return result;
}

// ─── Support / Resistance (pivot-based) ───
// Identifies local extremes over a lookback window
export function supportResistance(candles: Candle[], lookback = 20) {
  const levels: { price: number; type: "support" | "resistance"; strength: number }[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i];
    const window = candles.slice(i - lookback, i + lookback + 1);
    const isHigh = window.every((w) => c.high >= w.high);
    const isLow = window.every((w) => c.low <= w.low);

    if (isHigh) {
      // Check if near existing level
      const existing = levels.find(
        (l) => l.type === "resistance" && Math.abs(l.price - c.high) / c.high < 0.005
      );
      if (existing) {
        existing.strength++;
        existing.price = (existing.price + c.high) / 2;
      } else {
        levels.push({ price: c.high, type: "resistance", strength: 1 });
      }
    }
    if (isLow) {
      const existing = levels.find(
        (l) => l.type === "support" && Math.abs(l.price - c.low) / c.low < 0.005
      );
      if (existing) {
        existing.strength++;
        existing.price = (existing.price + c.low) / 2;
      } else {
        levels.push({ price: c.low, type: "support", strength: 1 });
      }
    }
  }

  return levels.sort((a, b) => b.strength - a.strength).slice(0, 10);
}

// ─── Parkinson Volatility ───
// Parkinson (1980). Range-based, ~5x more efficient than close-to-close.
export function parkinsonVol(candles: Candle[], window = 30): (number | null)[] {
  const result: (number | null)[] = [];
  const factor = 1 / (4 * Math.log(2));

  for (let i = 0; i < candles.length; i++) {
    if (i < window - 1) {
      result.push(null);
    } else {
      const slice = candles.slice(i - window + 1, i + 1);
      const avg = slice.reduce((s, c) => s + factor * Math.log(c.high / c.low) ** 2, 0) / window;
      result.push(Math.sqrt(avg * 365) * 100); // Annualized %
    }
  }
  return result;
}

// ─── VPIN (simplified from volume buckets) ───
// Easley, López de Prado, O'Hara (2012)
export function vpinSimple(candles: Candle[], window = 50): (number | null)[] {
  const imbalances: number[] = [];
  const result: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const buyVol = c.takerBuyVol;
    const sellVol = c.volume - c.takerBuyVol;
    const imb = c.volume > 0 ? Math.abs(buyVol - sellVol) / c.volume : 0;
    imbalances.push(imb);

    if (i < window - 1) {
      result.push(null);
    } else {
      const avg = imbalances.slice(i - window + 1, i + 1).reduce((a, b) => a + b) / window;
      result.push(avg);
    }
  }
  return result;
}

// ─── Academic Composite Score ───
// Combines multiple indicators into a single conviction signal [-100, +100]
export function compositeScore(candles: Candle[]) {
  const closes = candles.map((c) => c.close);
  const n = closes.length;
  if (n < 30) return { score: 0, signals: {}, verdict: "INSUFFICIENT DATA" };

  const signals: Record<string, { value: number; weight: number; label: string }> = {};

  // 1. Trend (EMA cross): EMA20 vs EMA50
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  if (e20[n - 1] !== null && e50[n - 1] !== null) {
    const spread = ((e20[n - 1]! - e50[n - 1]!) / e50[n - 1]!) * 100;
    signals.trend = {
      value: Math.max(-100, Math.min(100, spread * 20)),
      weight: 0.20,
      label: spread > 0 ? "BULLISH" : "BEARISH",
    };
  }

  // 2. Momentum (RSI)
  const r = rsi(closes, 14);
  const rsiVal = r[n - 1];
  if (rsiVal !== null) {
    const momentum = (rsiVal - 50) * 2; // -100 to +100
    signals.momentum = {
      value: momentum,
      weight: 0.15,
      label: rsiVal > 70 ? "OVERBOUGHT" : rsiVal < 30 ? "OVERSOLD" : "NEUTRAL",
    };
  }

  // 3. MACD signal
  const m = macd(closes);
  if (m.histogram[n - 1] !== null) {
    const histNorm = Math.max(-100, Math.min(100, m.histogram[n - 1]! * 1000 / closes[n - 1]));
    signals.macd = {
      value: histNorm,
      weight: 0.15,
      label: m.histogram[n - 1]! > 0 ? "BULLISH" : "BEARISH",
    };
  }

  // 4. Volatility regime (Parkinson)
  const pv = parkinsonVol(candles, 30);
  const pvShort = parkinsonVol(candles, 7);
  if (pv[n - 1] !== null && pvShort[n - 1] !== null) {
    const volRatio = pvShort[n - 1]! / pv[n - 1]!;
    signals.volatility = {
      value: Math.max(-100, Math.min(100, (1 - volRatio) * 100)),
      weight: 0.15,
      label: volRatio > 1.3 ? "EXPANDING" : volRatio < 0.7 ? "CONTRACTING" : "STABLE",
    };
  }

  // 5. Order flow (VPIN)
  const vp = vpinSimple(candles, 50);
  if (vp[n - 1] !== null) {
    const toxicity = vp[n - 1]!;
    const buyPct = candles[n - 1].volume > 0 ? candles[n - 1].takerBuyVol / candles[n - 1].volume : 0.5;
    const flowSignal = (buyPct - 0.5) * 200 * (1 - toxicity); // Directional, dampened by toxicity
    signals.orderFlow = {
      value: Math.max(-100, Math.min(100, flowSignal)),
      weight: 0.15,
      label: toxicity > 0.45 ? "TOXIC" : buyPct > 0.55 ? "BUY PRESSURE" : buyPct < 0.45 ? "SELL PRESSURE" : "BALANCED",
    };
  }

  // 6. Bollinger position
  const bb = bollinger(closes, 20, 2);
  if (bb.upper[n - 1] !== null && bb.lower[n - 1] !== null) {
    const range = bb.upper[n - 1]! - bb.lower[n - 1]!;
    const pos = range > 0 ? (closes[n - 1] - bb.lower[n - 1]!) / range : 0.5;
    signals.bbPosition = {
      value: (pos - 0.5) * 200,
      weight: 0.10,
      label: pos > 0.8 ? "UPPER BAND" : pos < 0.2 ? "LOWER BAND" : "MID RANGE",
    };
  }

  // 7. Volume trend
  const volSma20 = sma(candles.map((c) => c.volume), 20);
  if (volSma20[n - 1] !== null) {
    const volRatio = candles[n - 1].volume / volSma20[n - 1]!;
    signals.volumeTrend = {
      value: Math.max(-100, Math.min(100, (volRatio - 1) * 100)),
      weight: 0.10,
      label: volRatio > 1.5 ? "HIGH VOLUME" : volRatio < 0.5 ? "LOW VOLUME" : "AVERAGE",
    };
  }

  // Weighted composite
  let totalWeight = 0;
  let weightedSum = 0;
  for (const sig of Object.values(signals)) {
    weightedSum += sig.value * sig.weight;
    totalWeight += sig.weight;
  }
  const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  let verdict = "NEUTRAL";
  if (score > 40) verdict = "STRONG BUY";
  else if (score > 15) verdict = "BUY";
  else if (score < -40) verdict = "STRONG SELL";
  else if (score < -15) verdict = "SELL";

  return { score, signals, verdict };
}
