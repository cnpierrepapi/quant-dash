import { useMemo } from "react";
import { STATIC_DATASETS, type StaticCandle } from "@/data/academy/static-candles";
import type { Candle } from "./useCandles";

export function useStaticCandles(datasetKey: string | undefined) {
  const candles = useMemo<Candle[]>(() => {
    if (!datasetKey) return [];
    const data = STATIC_DATASETS[datasetKey];
    if (!data) return [];
    return data as Candle[];
  }, [datasetKey]);

  return { candles, loading: false as const };
}
