"use client";

import type { BacktestResult } from "@/lib/strategy-types";
import type { PerformanceMetrics } from "@/lib/performance";
import TradeLog from "./TradeLog";

export default function BacktestPanel({
  result, metrics, onClear,
}: {
  result: BacktestResult;
  metrics: PerformanceMetrics | null;
  onClear: () => void;
}) {
  return (
    <div className="border-t border-[#2a2a3a] bg-[#111118]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a3a]">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-[#8888a0] uppercase">Backtest Results</span>
          <div className="flex gap-3 text-xs">
            <span className={result.totalReturn >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}>
              {result.totalReturn >= 0 ? "+" : ""}{result.totalReturn.toFixed(2)}%
            </span>
            <span className="text-[#8888a0]">{result.totalTrades} trades</span>
            <span className="text-[#8888a0]">WR {result.winRate.toFixed(1)}%</span>
            {metrics && (
              <>
                <span className="text-[#8888a0]">Sharpe {metrics.sharpe.toFixed(2)}</span>
                <span className="text-[#8888a0]">MaxDD {metrics.maxDrawdown.toFixed(1)}%</span>
              </>
            )}
          </div>
        </div>
        <button onClick={onClear} className="text-xs text-[#8888a0] hover:text-[#ef4444]">Clear</button>
      </div>

      <div className="max-h-48 overflow-y-auto">
        <TradeLog trades={result.trades} />
      </div>
    </div>
  );
}
