"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Strategy } from "@/lib/strategy-types";
import type { Candle } from "./useCandles";
import type { IndicatorData } from "./useIndicators";
import { runBacktest } from "@/lib/backtest";
import { executeTrade, getPositions } from "@/lib/exec-client";

export type ExecutionLogEntry = {
  time: string;
  action: "BUY" | "SELL" | "CLOSE";
  symbol: string;
  message: string;
  success: boolean;
  orderId?: string;
};

export type LivePosition = {
  symbol: string;
  side: "LONG" | "SHORT";
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  leverage: number;
};

export function useLiveStrategy() {
  const [active, setActive] = useState(false);
  const [paperMode, setPaperMode] = useState(true);
  const [log, setLog] = useState<ExecutionLogEntry[]>([]);
  const [positions, setPositions] = useState<LivePosition[]>([]);
  const [positionPct, setPositionPct] = useState(5);
  const [leverage, setLeverage] = useState(10);
  const [stopLossPct, setStopLossPct] = useState(2);
  const [takeProfitPct, setTakeProfitPct] = useState(4);
  const lastSignalBar = useRef<number>(0);
  const lastAction = useRef<"BUY" | "SELL" | null>(null);

  const addLog = useCallback((entry: Omit<ExecutionLogEntry, "time">) => {
    setLog((prev) => [{ ...entry, time: new Date().toISOString() }, ...prev].slice(0, 100));
  }, []);

  // Evaluate strategy conditions on latest candle
  const evaluate = useCallback(async (
    strategy: Strategy,
    candles: Candle[],
    indicators: IndicatorData,
    symbol: string,
    apiKey: string,
    apiSecret: string,
  ) => {
    if (!active || candles.length === 0) return;

    const lastBar = candles.length - 1;
    // Only evaluate once per new candle
    if (lastBar <= lastSignalBar.current) return;

    // Run the backtest engine on just the last few bars to check conditions
    const result = runBacktest(strategy, candles, indicators, symbol, "1h");
    const trades = result.trades;

    if (trades.length === 0) return;

    const latestTrade = trades[trades.length - 1];
    const isEntry = latestTrade.exitBar === undefined || latestTrade.exitBar >= lastBar - 1;
    const isNewEntry = latestTrade.entryBar >= lastBar - 2 && lastAction.current !== "BUY";
    const isNewExit = latestTrade.exitBar >= lastBar - 2 && lastAction.current === "BUY";

    if (isNewEntry) {
      lastSignalBar.current = lastBar;
      lastAction.current = "BUY";

      if (paperMode) {
        addLog({ action: "BUY", symbol, message: `PAPER BUY @ ${candles[lastBar].close.toFixed(2)}`, success: true });
        return;
      }

      try {
        const result = await executeTrade({
          apiKey, apiSecret, action: "BUY", symbol, positionPct: positionPct, leverage, stopLossPct, takeProfitPct,
        });
        addLog({ action: "BUY", symbol, message: result.message, success: result.success, orderId: result.orderId });
      } catch (e) {
        addLog({ action: "BUY", symbol, message: (e as Error).message, success: false });
      }
    } else if (isNewExit) {
      lastSignalBar.current = lastBar;
      lastAction.current = null;

      if (paperMode) {
        addLog({ action: "SELL", symbol, message: `PAPER SELL @ ${candles[lastBar].close.toFixed(2)}`, success: true });
        return;
      }

      try {
        const result = await executeTrade({ apiKey, apiSecret, action: "CLOSE", symbol });
        addLog({ action: "CLOSE", symbol, message: result.message, success: result.success, orderId: result.orderId });
      } catch (e) {
        addLog({ action: "CLOSE", symbol, message: (e as Error).message, success: false });
      }
    }
  }, [active, paperMode, positionPct, leverage, stopLossPct, takeProfitPct, addLog]);

  // Refresh positions
  const refreshPositions = useCallback(async (apiKey: string, apiSecret: string) => {
    if (!apiKey || !apiSecret) return;
    try {
      const pos = await getPositions(apiKey, apiSecret);
      setPositions(pos);
    } catch { /* silent */ }
  }, []);

  const start = useCallback(() => {
    setActive(true);
    lastSignalBar.current = 0;
    lastAction.current = null;
    addLog({ action: "BUY", symbol: "—", message: `Strategy ${paperMode ? "PAPER" : "LIVE"} mode activated`, success: true });
  }, [paperMode, addLog]);

  const stop = useCallback(() => {
    setActive(false);
    addLog({ action: "CLOSE", symbol: "—", message: "Strategy stopped", success: true });
  }, [addLog]);

  return {
    active, paperMode, setPaperMode, log, positions,
    positionPct, setPositionPct, leverage, setLeverage,
    stopLossPct, setStopLossPct, takeProfitPct, setTakeProfitPct,
    start, stop, evaluate, refreshPositions,
  };
}
