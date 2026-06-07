"use client";

export default function SRPanel({ levels }: { levels: { price: number; type: string; strength: number }[] }) {
  return (
    <div className="space-y-1 text-xs">
      {levels.slice(0, 6).map((level, i) => (
        <div key={i} className="flex justify-between">
          <span className={level.type === "support" ? "text-[#22c55e]" : "text-[#ef4444]"}>
            {level.type === "support" ? "S" : "R"}
          </span>
          <span>${level.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          <span className="text-[#8888a0]">x{level.strength}</span>
        </div>
      ))}
    </div>
  );
}
