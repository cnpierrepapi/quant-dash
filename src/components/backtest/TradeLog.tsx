"use client";

import type { Trade } from "@/lib/strategy-types";

export default function TradeLog({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return <div className="p-4 text-xs text-[#8888a0] text-center">No trades generated</div>;
  }

  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-[#111118]">
        <tr className="text-[#8888a0] border-b border-[#2a2a3a]">
          <th className="px-3 py-1.5 text-left">#</th>
          <th className="px-3 py-1.5 text-left">Entry</th>
          <th className="px-3 py-1.5 text-left">Exit</th>
          <th className="px-3 py-1.5 text-right">Entry $</th>
          <th className="px-3 py-1.5 text-right">Exit $</th>
          <th className="px-3 py-1.5 text-right">Return</th>
          <th className="px-3 py-1.5 text-right">Bars</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((t, i) => (
          <tr key={i} className={`border-b border-[#1a1a24] ${t.returnPct >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
            <td className="px-3 py-1 text-[#8888a0]">{i + 1}</td>
            <td className="px-3 py-1 text-[#e8e8ef]">{new Date(t.entryTime * 1000).toLocaleDateString()}</td>
            <td className="px-3 py-1 text-[#e8e8ef]">{new Date(t.exitTime * 1000).toLocaleDateString()}</td>
            <td className="px-3 py-1 text-right text-[#e8e8ef]">${t.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
            <td className="px-3 py-1 text-right text-[#e8e8ef]">${t.exitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
            <td className="px-3 py-1 text-right font-medium">
              {t.returnPct >= 0 ? "+" : ""}{t.returnPct.toFixed(2)}%
            </td>
            <td className="px-3 py-1 text-right text-[#8888a0]">{t.duration}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
