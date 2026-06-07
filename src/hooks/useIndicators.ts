"use client";

import { useMemo } from "react";
import type { Candle } from "./useCandles";
import {
  type Candle as IndCandle,
  ema, sma, rsi, macd, bollinger, atr, vwap,
  supportResistance, parkinsonVol, vpinSimple, compositeScore,
} from "@/lib/indicators";

export type IndicatorData = {
  ema20: (number | null)[];
  ema50: (number | null)[];
  ema200: (number | null)[];
  sma20: (number | null)[];
  sma50: (number | null)[];
  sma200: (number | null)[];
  rsi: (number | null)[];
  macd: { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] };
  bollinger: { upper: (number | null)[]; mid: (number | null)[]; lower: (number | null)[] };
  atr: (number | null)[];
  vwap: (number | null)[];
  parkinsonVol: (number | null)[];
  vpin: (number | null)[];
  supportResistance: { price: number; type: string; strength: number }[];
  composite: {
    score: number;
    signals: Record<string, { value: number; weight: number; label: string }>;
    verdict: string;
  };
};

export function useIndicators(candles: Candle[]): IndicatorData | null {
  return useMemo(() => {
    if (candles.length < 10) return null;

    const indCandles: IndCandle[] = candles.map((c) => ({
      time: c.time, open: c.open, high: c.high, low: c.low,
      close: c.close, volume: c.volume, takerBuyVol: c.takerBuyVol,
    }));
    const closes = candles.map((c) => c.close);

    return {
      ema20: ema(closes, 20),
      ema50: ema(closes, 50),
      ema200: ema(closes, 200),
      sma20: sma(closes, 20),
      sma50: sma(closes, 50),
      sma200: sma(closes, 200),
      rsi: rsi(closes, 14),
      macd: macd(closes),
      bollinger: bollinger(closes, 20, 2),
      atr: atr(indCandles, 14),
      vwap: vwap(indCandles),
      parkinsonVol: parkinsonVol(indCandles, 30),
      vpin: vpinSimple(indCandles, 50),
      supportResistance: supportResistance(indCandles, 20),
      composite: compositeScore(indCandles),
    };
  }, [candles]);
}
