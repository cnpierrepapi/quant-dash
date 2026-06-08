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

// Interval durations in ms — used for pagination math
const INTERVAL_MS: Record<string, number> = {
  "1m": 60_000, "5m": 300_000, "15m": 900_000, "1h": 3_600_000,
  "4h": 14_400_000, "1d": 86_400_000, "1w": 604_800_000,
};

// How many candles to fetch per timeframe (paginated in 1000-candle batches)
const CANDLE_TARGETS: Record<string, number> = {
  "1m": 1000, "5m": 2000, "15m": 3000, "1h": 4000,
  "4h": 4000, "1d": 3000, "1w": 1000,
};

function parseKline(k: number[]): Candle {
  return {
    time: Math.floor(k[0] / 1000),
    open: parseFloat(String(k[1])),
    high: parseFloat(String(k[2])),
    low: parseFloat(String(k[3])),
    close: parseFloat(String(k[4])),
    volume: parseFloat(String(k[5])),
    takerBuyVol: parseFloat(String(k[9])),
  };
}

export function useCandles(symbol: string, interval: string) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState(0);
  const pollRef = useRef<number | null>(null);

  // Full paginated fetch — runs on initial load or symbol/interval change
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      const target = CANDLE_TARGETS[interval] || 2000;
      const batchSize = 1000; // Binance max per request
      const batches = Math.ceil(target / batchSize);

      // Fetch newest batch first
      const nowRes = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${batchSize}`
      );
      const nowRaw = await nowRes.json();
      if (!Array.isArray(nowRaw)) { setLoading(false); return; }

      const allRaw: Candle[] = nowRaw.map(parseKline);

      // Paginate backwards for more history
      if (batches > 1 && allRaw.length > 0) {
        let endTime = allRaw[0].time * 1000 - 1;

        for (let b = 1; b < batches; b++) {
          const res = await fetch(
            `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${batchSize}&endTime=${endTime}`
          );
          const raw = await res.json();
          if (!Array.isArray(raw) || raw.length === 0) break;

          const batch = raw.map(parseKline);
          allRaw.unshift(...batch);
          endTime = batch[0].time * 1000 - 1;
        }
      }

      // Deduplicate by time
      const seen = new Set<number>();
      const deduped = allRaw.filter((c) => {
        if (seen.has(c.time)) return false;
        seen.add(c.time);
        return true;
      });
      deduped.sort((a, b) => a.time - b.time);

      setCandles(deduped);
      setLastUpdate(new Date());
      setLoading(false);

      if (deduped.length > 1) {
        const last = deduped[deduped.length - 1].close;
        const prev = deduped[deduped.length - 2].close;
        setCurrentPrice(last);
        setPriceChange(((last - prev) / prev) * 100);
      }
    } catch {
      setLoading(false);
    }
  }, [symbol, interval]);

  // Lightweight poll — only fetches latest 2 candles and merges into existing history
  const poll = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=2`
      );
      const raw = await res.json();
      if (!Array.isArray(raw)) return;

      const fresh = raw.map(parseKline);
      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        for (const c of fresh) {
          const idx = updated.findIndex((u) => u.time === c.time);
          if (idx !== -1) updated[idx] = c;       // update in-progress candle
          else if (c.time > updated[updated.length - 1].time) updated.push(c); // new candle
        }
        return updated;
      });
      setLastUpdate(new Date());

      if (fresh.length > 0) {
        const last = fresh[fresh.length - 1];
        setCurrentPrice(last.close);
        if (fresh.length > 1) {
          setPriceChange(((last.close - fresh[0].close) / fresh[0].close) * 100);
        }
      }
    } catch { /* silent — poll retry next interval */ }
  }, [symbol, interval]);

  // Initial full fetch
  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Polling — lightweight updates only
  useEffect(() => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    const ms = POLL_INTERVALS[interval] || 30000;
    pollRef.current = window.setInterval(poll, ms);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [interval, poll]);

  return { candles, loading, lastUpdate, currentPrice, priceChange, refetch: fetchAll };
}
