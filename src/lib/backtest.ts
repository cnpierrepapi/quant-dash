// Backtest engine — runs strategy conditions against candle data

import type { Strategy, Condition, ConditionGroup, Operand, Trade, BacktestResult } from "./strategy-types";
import type { IndicatorData } from "@/hooks/useIndicators";
import type { Candle } from "@/hooks/useCandles";

// ─── Resolve an operand to a numeric value at bar index ───
function resolveOperand(op: Operand, candles: Candle[], indicators: IndicatorData, idx: number): number | null {
  if (op.type === "price") return candles[idx].close;
  if (op.type === "literal") return op.value;

  const { name, params } = op.ref;
  const p = params[0] || 14;

  const lookup: Record<string, (number | null)[]> = {
    ema: p === 20 ? indicators.ema20 : p === 50 ? indicators.ema50 : indicators.ema200,
    sma: p === 20 ? indicators.sma20 : p === 50 ? indicators.sma50 : indicators.sma200,
    rsi: indicators.rsi,
    atr: indicators.atr,
    vwap: indicators.vwap,
    vpin: indicators.vpin,
    parkinson_vol: indicators.parkinsonVol,
    macd_histogram: indicators.macd.histogram,
    bb_upper: indicators.bollinger.upper,
    bb_lower: indicators.bollinger.lower,
    bb_mid: indicators.bollinger.mid,
  };

  const series = lookup[name];
  if (!series || idx >= series.length) return null;
  return series[idx];
}

// ─── Evaluate a single condition ───
function evalCondition(cond: Condition, candles: Candle[], indicators: IndicatorData, idx: number): boolean {
  const leftNow = resolveOperand(cond.left, candles, indicators, idx);
  const rightNow = resolveOperand(cond.right, candles, indicators, idx);
  if (leftNow === null || rightNow === null) return false;

  switch (cond.op) {
    case "is_above": return leftNow > rightNow;
    case "is_below": return leftNow < rightNow;
    case "equals": return Math.abs(leftNow - rightNow) < 0.0001;
    case "crosses_above": {
      if (idx < 1) return false;
      const leftPrev = resolveOperand(cond.left, candles, indicators, idx - 1);
      const rightPrev = resolveOperand(cond.right, candles, indicators, idx - 1);
      if (leftPrev === null || rightPrev === null) return false;
      return leftPrev <= rightPrev && leftNow > rightNow;
    }
    case "crosses_below": {
      if (idx < 1) return false;
      const leftPrev = resolveOperand(cond.left, candles, indicators, idx - 1);
      const rightPrev = resolveOperand(cond.right, candles, indicators, idx - 1);
      if (leftPrev === null || rightPrev === null) return false;
      return leftPrev >= rightPrev && leftNow < rightNow;
    }
  }
}

// ─── Evaluate a condition group ───
function evalGroup(group: ConditionGroup, candles: Candle[], indicators: IndicatorData, idx: number): boolean {
  if (group.conditions.length === 0) return false;
  if (group.logic === "AND") {
    return group.conditions.every((c) => evalCondition(c, candles, indicators, idx));
  }
  return group.conditions.some((c) => evalCondition(c, candles, indicators, idx));
}

// ─── Compute minimum warmup bars from strategy indicators ───
// The warmup must be at least as large as the longest indicator period used
const INDICATOR_WARMUP: Record<string, number> = {
  ema: 0,   // param IS the warmup (ema20 = 20 bars)
  sma: 0,
  rsi: 14,
  atr: 14,
  vwap: 1,
  vpin: 50,
  parkinson_vol: 30,
  macd_histogram: 26, // slow EMA period
  bb_upper: 20,
  bb_lower: 20,
  bb_mid: 20,
};

function getWarmupFromOperand(op: Operand): number {
  if (op.type !== "indicator") return 0;
  const { name, params } = op.ref;
  const base = INDICATOR_WARMUP[name] ?? 14;
  // For EMA/SMA, the period IS the warmup
  if ((name === "ema" || name === "sma") && params[0]) return params[0];
  return base;
}

function computeWarmup(strategy: Strategy): number {
  let maxWarmup = 0;
  const allConditions = [
    ...strategy.entryLong.conditions,
    ...strategy.exitLong.conditions,
  ];
  for (const cond of allConditions) {
    maxWarmup = Math.max(maxWarmup, getWarmupFromOperand(cond.left));
    maxWarmup = Math.max(maxWarmup, getWarmupFromOperand(cond.right));
  }
  // Add 1 bar buffer for crosses_above/below which look back 1 bar
  return Math.max(maxWarmup + 1, 2);
}

// ─── Run full backtest ───
export function runBacktest(
  strategy: Strategy,
  candles: Candle[],
  indicators: IndicatorData,
  symbol: string,
  interval: string,
  initialCapital = 10000
): BacktestResult {
  const trades: Trade[] = [];
  const equityCurve: { time: number; equity: number }[] = [];
  let equity = initialCapital;
  let inPosition = false;
  let entryBar = 0;
  let entryPrice = 0;

  // Dynamic warmup based on indicators used by this strategy
  const startBar = computeWarmup(strategy);

  // Fee: 0.1% per side = 0.2% round trip (Binance spot/futures taker)
  const feePerTrade = 0.2;

  for (let i = startBar; i < candles.length; i++) {
    if (!inPosition) {
      if (evalGroup(strategy.entryLong, candles, indicators, i)) {
        inPosition = true;
        entryBar = i;
        entryPrice = candles[i].close;
      }
    } else {
      if (evalGroup(strategy.exitLong, candles, indicators, i)) {
        const exitPrice = candles[i].close;
        const returnPct = (exitPrice - entryPrice) / entryPrice * 100;
        const netReturn = returnPct - feePerTrade;

        trades.push({
          entryTime: candles[entryBar].time,
          exitTime: candles[i].time,
          direction: "long",
          entryPrice,
          exitPrice,
          returnPct: netReturn,
          duration: i - entryBar,
          entryBar,
          exitBar: i,
        });

        equity *= (1 + netReturn / 100);
        inPosition = false;
      }
    }

    equityCurve.push({ time: candles[i].time, equity });
  }

  const totalReturn = (equity / initialCapital - 1) * 100;
  const wins = trades.filter((t) => t.returnPct > 0).length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

  return { trades, equityCurve, totalReturn, winRate, totalTrades: trades.length, symbol, interval };
}
