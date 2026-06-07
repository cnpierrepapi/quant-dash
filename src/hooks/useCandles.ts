"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  takerBuyVol: number;
};

const POLL_INTERVALS: Record<string, number> = {
  "1m": 5000, "5m": 10000, "15m": 15000, "1h": 30000,
  "4h": 60000, "1d": 120000, "1w": 300000,
};

export function useCandles(symbol: string, interval: string) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState(0);
  const pollRef = useRef<number | null>(null);

  const fetchCandles = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`
      );
      const raw = await res.json();
      if (!Array.isArray(raw)) { setLoading(false); return null; }

      const parsed: Candle[] = raw.map((k: number[]) => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(String(k[1])),
        high: parseFloat(String(k[2])),
        low: parseFloat(String(k[3])),
        close: parseFloat(String(k[4])),
        volume: parseFloat(String(k[5])),
        takerBuyVol: parseFloat(String(k[9])),
      }));

      setCandles(parsed);
      setLastUpdate(new Date());
      setLoading(false);

      if (parsed.length > 1) {
        const last = parsed[parsed.length - 1].close;
        const prev = parsed[parsed.length - 2].close;
        setCurrentPrice(last);
        setPriceChange(((last - prev) / prev) * 100);
      }
      return parsed;
    } catch {
      setLoading(false);
      return null;
    }
  }, [symbol, interval]);

  // Initial fetch
  useEffect(() => { fetchCandles(true); }, [fetchCandles]);

  // Polling
  useEffect(() => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    const ms = POLL_INTERVALS[interval] || 30000;
    pollRef.current = window.setInterval(() => { fetchCandles(false); }, ms);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [interval, fetchCandles]);

  return { candles, loading, lastUpdate, currentPrice, priceChange, refetch: fetchCandles };
}
