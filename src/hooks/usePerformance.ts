"use client";

import { useMemo } from "react";
import type { BacktestResult } from "@/lib/strategy-types";
import type { Candle } from "./useCandles";
import { computePerformance, type PerformanceMetrics } from "@/lib/performance";

export function usePerformance(
  result: BacktestResult | null,
  candles: Candle[],
  interval?: string
): PerformanceMetrics | null {
  return useMemo(() => {
    if (!result || result.trades.length === 0) return null;
    return computePerformance(result, candles, interval || result.interval);
  }, [result, candles, interval]);
}
