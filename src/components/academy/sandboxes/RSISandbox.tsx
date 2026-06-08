"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  createChart, type IChartApi, type ISeriesApi,
  type CandlestickData, type LineData, type HistogramData,
  ColorType, LineStyle, type Time, type LogicalRange,
} from "lightweight-charts";
import { useStaticCandles } from "@/hooks/useStaticCandles";
import { useIndicators } from "@/hooks/useIndicators";
import SandboxController from "../SandboxController";
import type { LessonContent } from "@/data/academy/lessons";

const OVERLAYS = [
  { key: "ema20", label: "EMA 20", color: "#f59e0b" },
  { key: "ema50", label: "EMA 50", color: "#3b82f6" },
];

export default function RSISandbox({ content }: { content: LessonContent }) {
  const priceRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const priceChart = useRef<IChartApi | null>(null);
  const rsiChart = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const overlaySeries = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const rsiLineSeries = useRef<ISeriesApi<"Line"> | null>(null);
  const fittedRef = useRef(false);
  const syncingRef = useRef(false);

  const { candles } = useStaticCandles(content.staticDataKey);
  const indicators = useIndicators(candles);

  const [overlays, setOverlays] = useState<Set<string>>(new Set());
  const [showRSI, setShowRSI] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const steps = content.tutorialSteps || [];

  // Step validation
  useEffect(() => {
    const newCompleted = new Set(completedSteps);
    for (let i = 0; i < steps.length; i++) {
      if (newCompleted.has(i)) continue;
      const v = steps[i].validate;
      if (v.startsWith("overlay_") && v.endsWith("_on")) {
        const key = v.replace("overlay_", "").replace("_on", "");
        if (overlays.has(key)) newCompleted.add(i);
      }
      if (v === "rsi_panel_shown" && showRSI) newCompleted.add(i);
    }
    if (newCompleted.size !== completedSteps.size) setCompletedSteps(newCompleted);
  }, [overlays, showRSI, steps, completedSteps]);

  // Price chart
  useLayoutEffect(() => {
    if (!priceRef.current) return;
    const chart = createChart(priceRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#0a0a0f" }, textColor: "#8888a0", fontSize: 10 },
      grid: { vertLines: { color: "#1a1a24" }, horzLines: { color: "#1a1a24" } },
      rightPriceScale: { borderColor: "#2a2a3a" },
      timeScale: { borderColor: "#2a2a3a", timeVisible: true },
      width: priceRef.current.clientWidth, height: priceRef.current.clientHeight,
    });
    priceChart.current = chart;
    const cs = chart.addCandlestickSeries({
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });
    candleSeries.current = cs;
    const vs = chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "vol" });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    const ro = new ResizeObserver(() => {
      if (priceRef.current && priceChart.current) {
        try { priceChart.current.applyOptions({ width: priceRef.current.clientWidth }); } catch {}
      }
    });
    ro.observe(priceRef.current);
    return () => { ro.disconnect(); try { chart.remove(); } catch {} priceChart.current = null; candleSeries.current = null; overlaySeries.current.clear(); };
  }, []);

  // Set price data
  useEffect(() => {
    if (!candleSeries.current || candles.length === 0) return;
    try {
      candleSeries.current.setData(candles.map((c) => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close })) as CandlestickData[]);
      if (!fittedRef.current && priceChart.current) { priceChart.current.timeScale().fitContent(); fittedRef.current = true; }
    } catch {}
  }, [candles]);

  // Overlays
  useEffect(() => {
    if (!priceChart.current || !indicators) return;
    const chart = priceChart.current;
    try {
      overlaySeries.current.forEach((s) => { try { chart.removeSeries(s); } catch {} });
      overlaySeries.current.clear();
      for (const key of overlays) {
        const cfg = OVERLAYS.find((o) => o.key === key);
        if (!cfg) continue;
        const data = key === "ema20" ? indicators.ema20 : indicators.ema50;
        const series = chart.addLineSeries({ color: cfg.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
        const ld: LineData[] = [];
        for (let i = 0; i < candles.length; i++) {
          if (data[i] !== null) ld.push({ time: candles[i].time as Time, value: data[i]! });
        }
        series.setData(ld);
        overlaySeries.current.set(key, series);
      }
    } catch {}
  }, [candles, indicators, overlays]);

  // RSI chart (created when showRSI = true)
  useLayoutEffect(() => {
    if (!showRSI || !rsiRef.current) return;
    const chart = createChart(rsiRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#0a0a0f" }, textColor: "#8888a0", fontSize: 9 },
      grid: { vertLines: { color: "#1a1a24" }, horzLines: { color: "#1a1a24" } },
      rightPriceScale: { borderColor: "#2a2a3a", scaleMargins: { top: 0.05, bottom: 0.05 } },
      timeScale: { borderColor: "#2a2a3a", timeVisible: true, visible: true },
      width: rsiRef.current.clientWidth, height: rsiRef.current.clientHeight,
    });
    rsiChart.current = chart;

    // Overbought zone (70-100) — red tint
    const obZone = chart.addAreaSeries({
      topColor: "rgba(239, 68, 68, 0.15)", bottomColor: "rgba(239, 68, 68, 0.02)",
      lineColor: "rgba(239, 68, 68, 0.3)", lineWidth: 1,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
    });
    // Oversold zone (0-30) — green tint
    const osZone = chart.addAreaSeries({
      topColor: "rgba(34, 197, 94, 0.02)", bottomColor: "rgba(34, 197, 94, 0.15)",
      lineColor: "rgba(34, 197, 94, 0.3)", lineWidth: 1,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
    });
    // RSI line
    const rsiLine = chart.addLineSeries({
      color: "#a855f7", lineWidth: 2,
      priceLineVisible: false, lastValueVisible: true,
    });
    rsiLineSeries.current = rsiLine;

    // 70 and 30 reference lines
    const line70 = chart.addLineSeries({ color: "#ef444450", lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    const line30 = chart.addLineSeries({ color: "#22c55e50", lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });

    if (indicators && candles.length > 0) {
      const rsiData = indicators.rsi;
      const times = candles.map((c) => c.time as Time);
      const rsiLD: LineData[] = [];
      const obLD: LineData[] = [];
      const osLD: LineData[] = [];
      const l70: LineData[] = [];
      const l30: LineData[] = [];

      for (let i = 0; i < candles.length; i++) {
        const t = times[i];
        l70.push({ time: t, value: 70 });
        l30.push({ time: t, value: 30 });
        if (rsiData[i] !== null) {
          rsiLD.push({ time: t, value: rsiData[i]! });
          obLD.push({ time: t, value: Math.max(rsiData[i]!, 70) });
          osLD.push({ time: t, value: Math.min(rsiData[i]!, 30) });
        }
      }
      rsiLine.setData(rsiLD);
      obZone.setData(obLD);
      osZone.setData(osLD);
      line70.setData(l70);
      line30.setData(l30);
    }

    chart.timeScale().fitContent();

    // Sync time scales
    const syncFromPrice = (range: LogicalRange | null) => {
      if (syncingRef.current || !range || !rsiChart.current) return;
      syncingRef.current = true;
      try { rsiChart.current.timeScale().setVisibleLogicalRange(range); } catch {}
      syncingRef.current = false;
    };
    const syncFromRSI = (range: LogicalRange | null) => {
      if (syncingRef.current || !range || !priceChart.current) return;
      syncingRef.current = true;
      try { priceChart.current.timeScale().setVisibleLogicalRange(range); } catch {}
      syncingRef.current = false;
    };
    priceChart.current?.timeScale().subscribeVisibleLogicalRangeChange(syncFromPrice);
    chart.timeScale().subscribeVisibleLogicalRangeChange(syncFromRSI);

    const ro = new ResizeObserver(() => {
      if (rsiRef.current && rsiChart.current) {
        try { rsiChart.current.applyOptions({ width: rsiRef.current.clientWidth }); } catch {}
      }
    });
    ro.observe(rsiRef.current);

    return () => {
      ro.disconnect();
      priceChart.current?.timeScale().unsubscribeVisibleLogicalRangeChange(syncFromPrice);
      try { chart.remove(); } catch {}
      rsiChart.current = null;
      rsiLineSeries.current = null;
    };
  }, [showRSI, indicators, candles]);

  const toggleOverlay = (key: string) => {
    setOverlays((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  };

  const acknowledgeObservation = () => {
    const idx = steps.findIndex((s, i) => !completedSteps.has(i) && s.validate === "observation_acknowledged");
    if (idx !== -1) setCompletedSteps((prev) => new Set(prev).add(idx));
  };

  const handleSolveStep = (validate: string) => {
    if (validate.startsWith("overlay_") && validate.endsWith("_on")) {
      const key = validate.replace("overlay_", "").replace("_on", "");
      setOverlays((prev) => new Set(prev).add(key));
    }
    if (validate === "rsi_panel_shown") setShowRSI(true);
    if (validate === "observation_acknowledged") acknowledgeObservation();
  };

  return (
    <div className="mt-6 border border-[#2a2a3a] rounded-lg overflow-hidden">
      <div className="bg-[#111118] px-3 py-2 border-b border-[#2a2a3a] flex items-center justify-between">
        <span className="text-xs font-bold text-[#6366f1]">Interactive Lab — RSI</span>
        <span className="text-[10px] text-[#8888a0]">Static dataset</span>
      </div>

      <SandboxController steps={steps} completedSteps={completedSteps} onSolveStep={handleSolveStep} />

      {/* Price chart */}
      <div className={showRSI ? "h-40 relative" : "h-64 relative"}>
        <div ref={priceRef} className="absolute inset-0" />
      </div>

      {/* RSI sub-chart */}
      {showRSI && (
        <div className="h-28 relative border-t border-[#2a2a3a]">
          <div className="absolute left-2 top-1 z-10 text-[9px] text-[#a855f7] font-bold">RSI(14)</div>
          <div ref={rsiRef} className="absolute inset-0" />
        </div>
      )}

      {/* Controls */}
      <div className="bg-[#111118] px-3 py-2 border-t border-[#2a2a3a]">
        <div className="flex flex-wrap gap-1">
          {OVERLAYS.map((o) => (
            <button key={o.key} onClick={() => toggleOverlay(o.key)}
              className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 ${overlays.has(o.key) ? "bg-[#1a1a24] text-[#e8e8ef] border border-[#2a2a3a]" : "text-[#8888a0] hover:text-[#e8e8ef]"}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: o.color }} />
              {o.label}
            </button>
          ))}

          <button onClick={() => setShowRSI(!showRSI)}
            className={`text-[10px] px-2 py-0.5 rounded ml-auto ${showRSI ? "bg-[#a855f7] text-white" : "text-[#a855f7] border border-[#a855f740]"}`}>
            {showRSI ? "Hide" : "Show"} RSI Panel
          </button>

          {steps.some((s) => s.validate === "observation_acknowledged") && (
            <button onClick={acknowledgeObservation}
              className="text-[10px] px-2 py-0.5 rounded bg-[#6366f1] text-white">
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
