"use client";

import { useState, useCallback } from "react";
import type { Candle } from "./useCandles";
import type { IndicatorData } from "./useIndicators";
import type { Strategy, BacktestResult } from "@/lib/strategy-types";
import { runBacktest } from "@/lib/backtest";

export function useBacktest() {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback((strategy: Strategy, candles: Candle[], indicators: IndicatorData) => {
    if (strategy.entryLong.conditions.length === 0) return;
    setRunning(true);
    requestAnimationFrame(() => {
      const r = runBacktest(strategy, candles, indicators);
      setResult(r);
      setRunning(false);
    });
  }, []);

  const clear = useCallback(() => setResult(null), []);

  return { result, running, run, clear };
}
