"use client";

import type { IndicatorData } from "@/hooks/useIndicators";

export default function IndicatorPanel({ indicators }: { indicators: IndicatorData }) {
  const n = indicators.rsi.length;
  const rsiVal = indicators.rsi[n - 1];
  const atrVal = indicators.atr[n - 1];
  const pvVal = indicators.parkinsonVol[n - 1];
  const vpinVal = indicators.vpin[n - 1];
  const macdHist = indicators.macd.histogram[n - 1];

  return (
    <div className="space-y-2 text-xs">
      {rsiVal !== null && (
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[#8888a0]">RSI (14)</span>
            <span className={rsiVal > 70 ? "text-[#ef4444]" : rsiVal < 30 ? "text-[#22c55e]" : "text-[#e8e8ef]"}>
              {rsiVal.toFixed(1)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#1a1a24] rounded-full">
            <div
              className="h-full rounded-full"
              style={{ width: `${rsiVal}%`, background: rsiVal > 70 ? "#ef4444" : rsiVal < 30 ? "#22c55e" : "#6366f1" }}
            />
          </div>
        </div>
      )}

      {atrVal !== null && (
        <div className="flex justify-between">
          <span className="text-[#8888a0]">ATR (14)</span>
          <span>${atrVal.toFixed(2)}</span>
        </div>
      )}

      {pvVal !== null && (
        <div className="flex justify-between">
          <span className="text-[#8888a0]">Parkinson Vol</span>
          <span>{pvVal.toFixed(1)}%</span>
        </div>
      )}

      {vpinVal !== null && (
        <div className="flex justify-between">
          <span className="text-[#8888a0]">VPIN <span className="text-[6px] opacity-60">heuristic</span></span>
          <span className={vpinVal > 0.45 ? "text-[#ef4444] font-bold" : ""}>
            {vpinVal.toFixed(3)} {vpinVal > 0.45 ? "TOXIC" : ""}
          </span>
        </div>
      )}

      {macdHist !== null && (
        <div className="flex justify-between">
          <span className="text-[#8888a0]">MACD Hist</span>
          <span className={macdHist > 0 ? "text-[#22c55e]" : "text-[#ef4444]"}>
            {macdHist > 0 ? "+" : ""}{macdHist.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
