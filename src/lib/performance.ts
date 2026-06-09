// Performance metrics — Sharpe, Sortino, Calmar, break-even, drawdowns

import { mean, stddev } from "./math-utils";
import type { Trade, BacktestResult, BARS_PER_YEAR } from "./strategy-types";
import { BARS_PER_YEAR as BPY } from "./strategy-types";

export type PerformanceMetrics = {
  sharpe: number;
  sortino: number;
  calmar: number;
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  rrRatio: number;
  breakEvenWR: number;
  edge: number; // actual WR - breakeven WR
  profitFactor: number;
  totalTrades: number;
  buyAndHoldReturn: number;
  drawdowns: DrawdownEvent[];
};

export type DrawdownEvent = {
  startTime: number;
  troughTime: number;
  endTime: number;
  depth: number;   // % from peak
  duration: number; // bars
};

export function computePerformance(
  result: BacktestResult,
  candles: { time: number; close: number }[],
  interval?: string
): PerformanceMetrics {
  const barsPerYear = BPY[interval || result.interval || "1d"] || 365;
  const { trades, equityCurve, totalReturn } = result;

  // Returns per bar
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    returns.push(equityCurve[i].equity / equityCurve[i - 1].equity - 1);
  }

  // Sharpe
  const mu = returns.length > 0 ? mean(returns) : 0;
  const sigma = returns.length > 1 ? stddev(returns) : 1;
  const sharpe = sigma > 0 ? (mu / sigma) * Math.sqrt(barsPerYear) : 0;

  // Sortino (downside deviation only)
  const downReturns = returns.filter((r) => r < 0);
  const downDev = downReturns.length > 0 ? stddev(downReturns) : sigma;
  const sortino = downDev > 0 ? (mu / downDev) * Math.sqrt(barsPerYear) : 0;

  // Max drawdown
  let peak = equityCurve[0]?.equity || 1;
  let maxDD = 0;
  const ddSeries: number[] = [];
  for (const pt of equityCurve) {
    peak = Math.max(peak, pt.equity);
    const dd = (pt.equity - peak) / peak;
    ddSeries.push(dd);
    maxDD = Math.min(maxDD, dd);
  }

  // Calmar
  const annReturn = returns.length > 0 ? ((1 + mu) ** barsPerYear - 1) * 100 : 0;
  const calmar = maxDD !== 0 ? annReturn / (Math.abs(maxDD) * 100) : 0;

  // Win/loss stats
  const wins = trades.filter((t) => t.returnPct > 0);
  const losses = trades.filter((t) => t.returnPct <= 0);
  const avgWin = wins.length > 0 ? mean(wins.map((t) => t.returnPct)) : 0;
  const avgLoss = losses.length > 0 ? mean(losses.map((t) => Math.abs(t.returnPct))) : 0;
  const rrRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
  const breakEvenWR = rrRatio > 0 ? (1 / (1 + rrRatio)) * 100 : 50;
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const edge = winRate - breakEvenWR;

  // Profit factor
  const grossProfit = wins.reduce((s, t) => s + t.returnPct, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.returnPct, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

  // Buy and hold — start from first equity curve bar (matches backtest start)
  const bhStartIdx = equityCurve.length > 0
    ? candles.findIndex((c) => c.time === equityCurve[0].time)
    : 0;
  const buyAndHoldReturn = candles.length > 1 && bhStartIdx >= 0
    ? (candles[candles.length - 1].close / candles[bhStartIdx].close - 1) * 100
    : 0;

  // Drawdown events (top 5)
  const drawdowns = findDrawdowns(ddSeries, equityCurve);

  return {
    sharpe, sortino, calmar, totalReturn, annualizedReturn: annReturn,
    maxDrawdown: maxDD * 100, winRate, avgWin, avgLoss, rrRatio,
    breakEvenWR, edge, profitFactor, totalTrades: trades.length,
    buyAndHoldReturn, drawdowns,
  };
}

function findDrawdowns(
  ddSeries: number[],
  equityCurve: { time: number; equity: number }[]
): DrawdownEvent[] {
  const events: DrawdownEvent[] = [];
  let inDD = false;
  let startIdx = 0;
  let troughIdx = 0;
  let troughVal = 0;

  for (let i = 0; i < ddSeries.length; i++) {
    if (ddSeries[i] < -0.01 && !inDD) {
      inDD = true;
      startIdx = i;
      troughIdx = i;
      troughVal = ddSeries[i];
    } else if (inDD) {
      if (ddSeries[i] < troughVal) {
        troughIdx = i;
        troughVal = ddSeries[i];
      }
      if (ddSeries[i] >= -0.001 || i === ddSeries.length - 1) {
        events.push({
          startTime: equityCurve[startIdx]?.time || 0,
          troughTime: equityCurve[troughIdx]?.time || 0,
          endTime: equityCurve[i]?.time || 0,
          depth: troughVal * 100,
          duration: i - startIdx,
        });
        inDD = false;
      }
    }
  }

  return events.sort((a, b) => a.depth - b.depth).slice(0, 5);
}
