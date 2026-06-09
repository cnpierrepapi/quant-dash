"use client";

import { useState } from "react";
import type { ExecutionLogEntry, LivePosition } from "@/hooks/useLiveStrategy";
import Tabs from "@/components/ui/Tabs";

const TABS = [
  { key: "controls", label: "Controls" },
  { key: "positions", label: "Positions" },
  { key: "log", label: "Execution Log" },
];

export default function LivePanel({
  active, paperMode, onPaperModeChange,
  onStart, onStop,
  positionPct, onPositionPctChange,
  leverage, onLeverageChange,
  stopLossPct, onStopLossPctChange,
  takeProfitPct, onTakeProfitPctChange,
  positions, log,
  connected, strategyName,
}: {
  active: boolean;
  paperMode: boolean;
  onPaperModeChange: (v: boolean) => void;
  onStart: () => void;
  onStop: () => void;
  positionPct: number;
  onPositionPctChange: (v: number) => void;
  leverage: number;
  onLeverageChange: (v: number) => void;
  stopLossPct: number;
  onStopLossPctChange: (v: number) => void;
  takeProfitPct: number;
  onTakeProfitPctChange: (v: number) => void;
  positions: LivePosition[];
  log: ExecutionLogEntry[];
  connected: boolean;
  strategyName: string;
}) {
  const [tab, setTab] = useState("controls");

  return (
    <div className="border-b border-[#2a2a3a]">
      <div className="flex items-center justify-between p-3 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#8888a0] uppercase">Go Live</span>
          {active && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
              paperMode ? "bg-[#eab30820] text-[#eab308]" : "bg-[#22c55e20] text-[#22c55e]"
            }`}>
              {paperMode ? "PAPER" : "LIVE"}
            </span>
          )}
        </div>
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {tab === "controls" && (
        <div className="px-3 pb-3 space-y-2.5">
          {/* Strategy info */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8888a0]">Strategy</span>
            <span className="text-[#e8e8ef] font-medium">{strategyName || "None"}</span>
          </div>

          {/* Paper mode toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8888a0]">Paper Mode</span>
            <button
              onClick={() => onPaperModeChange(!paperMode)}
              disabled={active}
              className={`w-10 h-5 rounded-full relative transition-colors ${
                paperMode ? "bg-[#eab308]" : "bg-[#6366f1]"
              } ${active ? "opacity-50" : ""}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                paperMode ? "left-0.5" : "left-5"
              }`} />
            </button>
          </div>

          {/* Order params — TradingView Strategy Properties style */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-[#8888a0] uppercase">Position %</label>
              <input type="number" value={positionPct} onChange={(e) => onPositionPctChange(Number(e.target.value))}
                disabled={active} min={1} max={25} step={1}
                className="w-full bg-[#0a0a0f] text-xs text-[#e8e8ef] px-2 py-1 rounded border border-[#2a2a3a] disabled:opacity-50" />
            </div>
            <div>
              <label className="text-[9px] text-[#8888a0] uppercase">Leverage</label>
              <select value={leverage} onChange={(e) => onLeverageChange(Number(e.target.value))}
                disabled={active}
                className="w-full bg-[#0a0a0f] text-xs text-[#e8e8ef] px-2 py-1 rounded border border-[#2a2a3a] disabled:opacity-50">
                {[1, 2, 3, 5, 10, 15, 20].map((l) => <option key={l} value={l}>{l}x</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-[#8888a0] uppercase">Stop Loss %</label>
              <input type="number" value={stopLossPct} onChange={(e) => onStopLossPctChange(Number(e.target.value))}
                disabled={active} min={0.5} max={20} step={0.5}
                className="w-full bg-[#0a0a0f] text-xs text-[#e8e8ef] px-2 py-1 rounded border border-[#2a2a3a] disabled:opacity-50" />
            </div>
            <div>
              <label className="text-[9px] text-[#8888a0] uppercase">Take Profit %</label>
              <input type="number" value={takeProfitPct} onChange={(e) => onTakeProfitPctChange(Number(e.target.value))}
                disabled={active} min={0.5} max={50} step={0.5}
                className="w-full bg-[#0a0a0f] text-xs text-[#e8e8ef] px-2 py-1 rounded border border-[#2a2a3a] disabled:opacity-50" />
            </div>
          </div>

          {/* Start/Stop button */}
          {!active ? (
            <button
              onClick={onStart}
              disabled={!connected && !paperMode}
              className={`w-full text-xs px-2 py-2 rounded font-bold ${
                !connected && !paperMode
                  ? "bg-[#1a1a24] text-[#8888a0] cursor-not-allowed"
                  : paperMode
                    ? "bg-[#eab308] text-black hover:bg-[#facc15]"
                    : "bg-[#22c55e] text-black hover:bg-[#16a34a]"
              }`}
            >
              {paperMode ? "Start Paper Trading" : "Start Live Trading"}
            </button>
          ) : (
            <button onClick={onStop}
              className="w-full text-xs px-2 py-2 rounded font-bold bg-[#ef4444] text-white hover:bg-[#dc2626]">
              Stop Strategy
            </button>
          )}

          {!connected && !paperMode && (
            <p className="text-[9px] text-[#ef4444]">Connect Binance API keys first, or enable Paper Mode</p>
          )}
        </div>
      )}

      {tab === "positions" && (
        <div className="px-3 pb-3">
          {positions.length === 0 ? (
            <div className="text-xs text-[#8888a0] text-center py-4">No open positions</div>
          ) : (
            <div className="space-y-1.5">
              {positions.map((p) => (
                <div key={p.symbol} className="bg-[#0a0a0f] rounded p-2 border border-[#1a1a24]">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#e8e8ef]">{p.symbol}</span>
                      <span className={`text-[9px] px-1 py-0.5 rounded ${
                        p.side === "LONG" ? "bg-[#22c55e20] text-[#22c55e]" : "bg-[#ef444420] text-[#ef4444]"
                      }`}>{p.side}</span>
                      <span className="text-[9px] text-[#8888a0]">{p.leverage}x</span>
                    </div>
                    <span className={`text-xs font-bold ${p.pnl >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                      {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#8888a0]">
                    <span>Size: {p.size}</span>
                    <span>Entry: ${p.entryPrice.toFixed(2)}</span>
                    <span>Mark: ${p.markPrice.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "log" && (
        <div className="px-3 pb-3 max-h-40 overflow-y-auto">
          {log.length === 0 ? (
            <div className="text-xs text-[#8888a0] text-center py-4">No executions yet</div>
          ) : (
            <div className="space-y-0.5">
              {log.map((entry, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px] py-0.5 border-b border-[#1a1a2440]">
                  <span className={entry.success ? "text-[#22c55e]" : "text-[#ef4444]"}>
                    {entry.success ? "\u2713" : "\u2717"}
                  </span>
                  <span className="text-[#8888a0] flex-shrink-0">
                    {new Date(entry.time).toLocaleTimeString()}
                  </span>
                  <span className={`font-medium flex-shrink-0 ${
                    entry.action === "BUY" ? "text-[#22c55e]" : entry.action === "SELL" || entry.action === "CLOSE" ? "text-[#ef4444]" : "text-[#8888a0]"
                  }`}>
                    {entry.action}
                  </span>
                  <span className="text-[#e8e8ef] truncate">{entry.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
