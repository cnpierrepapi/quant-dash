"use client";

const OVERLAY_OPTIONS = [
  { key: "ema20", label: "EMA 20", color: "#f59e0b" },
  { key: "ema50", label: "EMA 50", color: "#3b82f6" },
  { key: "ema200", label: "EMA 200", color: "#ef4444" },
  { key: "sma20", label: "SMA 20", color: "#f59e0b" },
  { key: "sma50", label: "SMA 50", color: "#3b82f6" },
  { key: "sma200", label: "SMA 200", color: "#ef4444" },
  { key: "vwap", label: "VWAP", color: "#a855f7" },
  { key: "bbUpper", label: "BB Upper", color: "#6366f1" },
  { key: "bbLower", label: "BB Lower", color: "#6366f1" },
];

export default function OverlayPanel({
  overlays, onToggle, showSR, onToggleSR,
}: {
  overlays: Set<string>;
  onToggle: (key: string) => void;
  showSR: boolean;
  onToggleSR: () => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-1">
        {OVERLAY_OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => onToggle(o.key)}
            className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
              overlays.has(o.key)
                ? "bg-[#1a1a24] text-[#e8e8ef] border border-[#2a2a3a]"
                : "text-[#8888a0] hover:text-[#e8e8ef]"
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: o.color }} />
            {o.label}
          </button>
        ))}
      </div>
      <button
        onClick={onToggleSR}
        className={`mt-1 text-xs px-2 py-1 rounded w-full text-left ${
          showSR ? "bg-[#1a1a24] text-[#e8e8ef] border border-[#2a2a3a]" : "text-[#8888a0]"
        }`}
      >
        S/R Levels
      </button>
    </div>
  );
}

export { OVERLAY_OPTIONS };
