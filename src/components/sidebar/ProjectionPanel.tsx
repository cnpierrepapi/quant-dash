"use client";

export default function ProjectionPanel({
  enabled, onToggle, horizon, onHorizonChange,
  nPaths, onPathsChange, computing, onRegenerate,
}: {
  enabled: boolean;
  onToggle: () => void;
  horizon: number;
  onHorizonChange: (h: number) => void;
  nPaths: number;
  onPathsChange: (n: number) => void;
  computing: boolean;
  onRegenerate: () => void;
}) {
  return (
    <div className="space-y-2">
      <button
        onClick={onToggle}
        className={`w-full text-xs px-2 py-1.5 rounded font-medium ${
          enabled
            ? "bg-[#6366f1] text-white"
            : "bg-[#1a1a24] text-[#8888a0] hover:text-[#e8e8ef] border border-[#2a2a3a]"
        }`}
      >
        {computing ? "Computing..." : enabled ? "Projection ON" : "Enable Projection"}
      </button>

      {enabled && (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8888a0]">Horizon</span>
            <select
              value={horizon}
              onChange={(e) => onHorizonChange(Number(e.target.value))}
              className="bg-[#1a1a24] text-xs px-1 py-0.5 rounded border border-[#2a2a3a] text-[#e8e8ef]"
            >
              <option value={50}>50 candles</option>
              <option value={100}>100 candles</option>
              <option value={200}>200 candles</option>
            </select>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8888a0]">Paths</span>
            <select
              value={nPaths}
              onChange={(e) => onPathsChange(Number(e.target.value))}
              className="bg-[#1a1a24] text-xs px-1 py-0.5 rounded border border-[#2a2a3a] text-[#e8e8ef]"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <button
            onClick={onRegenerate}
            className="w-full text-xs px-2 py-1 rounded bg-[#1a1a24] text-[#8888a0] hover:text-[#e8e8ef] border border-[#2a2a3a]"
          >
            Regenerate
          </button>

          <p className="text-[10px] text-[#8888a0]">
            GARCH-lite + OHLC microstructure bootstrap with Poisson jump layer.
            Barone-Adesi (2008), Merton (1976).
          </p>
        </>
      )}
    </div>
  );
}
