"use client";

import { useMemo } from "react";
import type { ProjectionResult } from "@/lib/projection";
import { stressTest, type StressResult } from "@/lib/stress-test";

export default function StressTestPanel({ projection }: { projection: ProjectionResult | null }) {
  const results = useMemo<StressResult[]>(() => {
    if (!projection || projection.paths.length === 0) return [];
    return stressTest(projection.paths, [1, 3, 5]);
  }, [projection]);

  if (results.length === 0) {
    return (
      <div className="p-3 text-xs text-[#8888a0] text-center">
        Enable projection to run stress test
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <h4 className="text-[10px] font-bold text-[#8888a0] uppercase">Leverage Stress Test</h4>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[#8888a0]">
            <th className="text-left py-1">Lev</th>
            <th className="text-right py-1">Median</th>
            <th className="text-right py-1">P5/P95</th>
            <th className="text-right py-1">Ruin</th>
            <th className="text-right py-1">MaxDD</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.leverage} className="border-t border-[#1a1a24]">
              <td className="py-1 text-[#e8e8ef]">{r.leverage}x</td>
              <td className={`py-1 text-right ${r.medianReturn >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                {r.medianReturn >= 0 ? "+" : ""}{r.medianReturn.toFixed(1)}%
              </td>
              <td className="py-1 text-right text-[#8888a0]">
                {r.p5Return.toFixed(0)}% / {r.p95Return.toFixed(0)}%
              </td>
              <td className={`py-1 text-right ${r.ruinPct > 5 ? "text-[#ef4444] font-bold" : "text-[#22c55e]"}`}>
                {r.ruinPct.toFixed(1)}%
              </td>
              <td className="py-1 text-right text-[#8888a0]">{r.maxDDMedian.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-[#8888a0]">
        {results[0]?.ruinPct <= 1 && results[1]?.ruinPct <= 5
          ? `Safe up to ${results.findLast((r) => r.ruinPct <= 1)?.leverage || 1}x (<=1% ruin)`
          : "High ruin risk — reduce leverage"
        }
      </p>
    </div>
  );
}
