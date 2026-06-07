"use client";

type CompositeData = {
  score: number;
  signals: Record<string, { value: number; weight: number; label: string }>;
  verdict: string;
};

export default function CompositePanel({ composite }: { composite: CompositeData }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className={`text-3xl font-bold ${
          composite.score > 15 ? "text-[#22c55e]" : composite.score < -15 ? "text-[#ef4444]" : "text-[#eab308]"
        }`}>
          {composite.score > 0 ? "+" : ""}{composite.score}
        </div>
        <div>
          <div className={`text-sm font-bold ${
            composite.verdict.includes("BUY") ? "text-[#22c55e]" :
            composite.verdict.includes("SELL") ? "text-[#ef4444]" : "text-[#eab308]"
          }`}>
            {composite.verdict}
          </div>
          <div className="text-xs text-[#8888a0]">weighted signal</div>
        </div>
      </div>

      <div className="w-full h-2 bg-[#1a1a24] rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.abs(composite.score) / 2 + 50}%`,
            marginLeft: composite.score < 0 ? `${50 - Math.abs(composite.score) / 2}%` : "50%",
            background: composite.score > 0 ? "#22c55e" : "#ef4444",
          }}
        />
      </div>

      <div className="space-y-1">
        {Object.entries(composite.signals).map(([key, sig]) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <span className="text-[#8888a0] capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
            <div className="flex items-center gap-2">
              <span className={
                sig.value > 15 ? "text-[#22c55e]" :
                sig.value < -15 ? "text-[#ef4444]" : "text-[#eab308]"
              }>
                {sig.label}
              </span>
              <span className="text-[#8888a0] w-8 text-right">{Math.round(sig.weight * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
