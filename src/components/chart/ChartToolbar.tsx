"use client";

import Link from "next/link";

const SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "AVAXUSDT",
  "ADAUSDT", "DOGEUSDT", "LINKUSDT", "XRPUSDT", "DOTUSDT",
];

const INTERVALS = [
  { value: "1m", label: "1m" }, { value: "5m", label: "5m" },
  { value: "15m", label: "15m" }, { value: "1h", label: "1H" },
  { value: "4h", label: "4H" }, { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
];

export default function ChartToolbar({
  symbol, onSymbolChange, interval, onIntervalChange,
  currentPrice, priceChange, loading, lastUpdate, candleCount,
}: {
  symbol: string;
  onSymbolChange: (s: string) => void;
  interval: string;
  onIntervalChange: (i: string) => void;
  currentPrice: number | null;
  priceChange: number;
  loading: boolean;
  lastUpdate: Date | null;
  candleCount?: number;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-[#2a2a3a] bg-[#111118]">
      <span className="text-sm font-bold text-[#6366f1]">QuantDash</span>
      <div className="h-4 w-px bg-[#2a2a3a]" />

      <select
        value={symbol}
        onChange={(e) => onSymbolChange(e.target.value)}
        className="bg-[#1a1a24] text-sm px-2 py-1 rounded border border-[#2a2a3a] text-[#e8e8ef]"
      >
        {SYMBOLS.map((s) => (
          <option key={s} value={s}>{s.replace("USDT", "/USDT")}</option>
        ))}
      </select>

      <div className="flex gap-1">
        {INTERVALS.map((i) => (
          <button
            key={i.value}
            onClick={() => onIntervalChange(i.value)}
            className={`px-2 py-1 text-xs rounded ${
              interval === i.value
                ? "bg-[#6366f1] text-white"
                : "bg-[#1a1a24] text-[#8888a0] hover:text-[#e8e8ef]"
            }`}
          >
            {i.label}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-[#2a2a3a]" />

      {currentPrice !== null && (
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`text-sm font-medium ${priceChange >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
            {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
          </span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-3 text-xs text-[#8888a0]">
        <Link
          href="/academy"
          className="px-3 py-1 rounded bg-[#1a1a24] text-[#6366f1] border border-[#2a2a3a] hover:bg-[#6366f1] hover:text-white transition-colors font-medium"
        >
          Academy
        </Link>
        {loading && <span className="animate-pulse text-[#eab308]">fetching...</span>}
        {candleCount !== undefined && candleCount > 0 && (
          <span className="text-[#6366f1]">{candleCount.toLocaleString()} candles</span>
        )}
        {lastUpdate && <span>updated {lastUpdate.toLocaleTimeString()}</span>}
        <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" title="Live polling" />
      </div>
    </div>
  );
}
