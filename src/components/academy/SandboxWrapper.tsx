"use client";

import { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type HistogramData,
  ColorType,
  LineStyle,
  type Time,
} from "lightweight-charts";
import { useCandles } from "@/hooks/useCandles";
import { useIndicators } from "@/hooks/useIndicators";
import SandboxController, { type SandboxStep } from "./SandboxController";
import type { LessonContent } from "@/data/academy/lessons";

const ALL_OVERLAYS = [
  { key: "ema20", label: "EMA 20", color: "#f59e0b" },
  { key: "ema50", label: "EMA 50", color: "#3b82f6" },
  { key: "ema200", label: "EMA 200", color: "#ef4444" },
  { key: "sma20", label: "SMA 20", color: "#f59e0b" },
  { key: "sma50", label: "SMA 50", color: "#3b82f6" },
  { key: "bbUpper", label: "BB Upper", color: "#6366f1" },
  { key: "bbLower", label: "BB Lower", color: "#6366f1" },
  { key: "vwap", label: "VWAP", color: "#a855f7" },
];

function getOverlayData(key: string, indicators: ReturnType<typeof useIndicators>): (number | null)[] {
  if (!indicators) return [];
  const map: Record<string, (number | null)[]> = {
    ema20: indicators.ema20, ema50: indicators.ema50, ema200: indicators.ema200,
    sma20: indicators.sma20, sma50: indicators.sma50,
    bbUpper: indicators.bollinger.upper, bbLower: indicators.bollinger.lower,
    vwap: indicators.vwap,
  };
  return map[key] || [];
}

export default function SandboxWrapper({ content }: { content: LessonContent }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartApi = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const overlaySeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const fittedRef = useRef(false);

  const sym = content.chartConfig.symbol || "BTCUSDT";
  const intv = content.chartConfig.interval || "1h";
  const { candles } = useCandles(sym, intv);
  const indicators = useIndicators(candles);

  // Start with NO overlays enabled — let the tutorial guide the user to toggle them
  const [overlays, setOverlays] = useState<Set<string>>(new Set());
  const [showComposite, setShowComposite] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Determine which overlay buttons to show based on lesson config
  const enabledControls = useMemo(() => {
    const cfg = content.chartConfig;
    const controls = new Set<string>();
    const suggested = cfg.overlays || [];
    for (const o of ALL_OVERLAYS) {
      if (suggested.includes(o.key)) controls.add(o.key);
    }
    if (suggested.some((s) => s.includes("ema"))) {
      controls.add("ema20"); controls.add("ema50"); controls.add("ema200");
    }
    if (suggested.some((s) => s.includes("bb"))) {
      controls.add("bbUpper"); controls.add("bbLower");
    }
    if (suggested.some((s) => s.includes("sma"))) {
      controls.add("sma20"); controls.add("sma50");
    }
    if (suggested.includes("vwap")) controls.add("vwap");
    if (controls.size === 0) {
      controls.add("ema20"); controls.add("ema50"); controls.add("bbUpper"); controls.add("bbLower");
    }
    return controls;
  }, [content.chartConfig]);

  // Sandbox steps based on lesson config
  const steps = useMemo<SandboxStep[]>(() => {
    const s: SandboxStep[] = [];
    const cfg = content.chartConfig;
    const suggested = cfg.overlays || [];

    const friendlyName = (key: string) =>
      ALL_OVERLAYS.find((o) => o.key === key)?.label || key;

    if (suggested.length > 0) {
      s.push({
        instruction: `Toggle ${friendlyName(suggested[0])} overlay on the chart.`,
        validate: `overlay_${suggested[0]}_on`,
        hint: `Click the "${friendlyName(suggested[0])}" button below the chart.`,
      });
    }
    if (suggested.length > 1) {
      s.push({
        instruction: `Now also enable ${friendlyName(suggested[1])} to compare.`,
        validate: `overlay_${suggested[1]}_on`,
        hint: `Click the second overlay button.`,
      });
    }
    if (suggested.length >= 2 && suggested.some((s) => s.includes("ema"))) {
      s.push({
        instruction: "Look at where the two lines cross. This crossover is a potential entry/exit signal.",
        validate: "observation_acknowledged",
        hint: "Just click 'Got it' below to confirm you've observed the crossover points.",
      });
    }
    if (cfg.showComposite) {
      s.push({
        instruction: "Expand the composite score panel to see how multiple indicators combine into one signal.",
        validate: "composite_expanded",
        hint: "Click 'Show Composite' below.",
      });
    }

    return s;
  }, [content.chartConfig]);

  // Validate steps against current state
  useEffect(() => {
    const newCompleted = new Set(completedSteps);
    for (let i = 0; i < steps.length; i++) {
      if (newCompleted.has(i)) continue;
      const v = steps[i].validate;
      if (v.startsWith("overlay_") && v.endsWith("_on")) {
        const key = v.replace("overlay_", "").replace("_on", "");
        if (overlays.has(key)) newCompleted.add(i);
      }
      if (v === "composite_expanded" && showComposite) newCompleted.add(i);
    }
    if (newCompleted.size !== completedSteps.size) setCompletedSteps(newCompleted);
  }, [overlays, showComposite, steps, completedSteps]);

  // Create chart ONCE on mount — useLayoutEffect so cleanup runs BEFORE React
  // removes the DOM container (lightweight-charts throws "Object is disposed"
  // if its container is gone when chart.remove() is called)
  useLayoutEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#0a0a0f" }, textColor: "#8888a0", fontSize: 10 },
      grid: { vertLines: { color: "#1a1a24" }, horzLines: { color: "#1a1a24" } },
      rightPriceScale: { borderColor: "#2a2a3a" },
      timeScale: { borderColor: "#2a2a3a", timeVisible: true },
      width: chartRef.current.clientWidth, height: chartRef.current.clientHeight,
    });
    chartApi.current = chart;

    const cs = chart.addCandlestickSeries({
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });
    candleSeriesRef.current = cs;

    const vs = chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "vol" });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    volumeSeriesRef.current = vs;

    const ro = new ResizeObserver(() => {
      if (chartRef.current && chartApi.current) {
        try {
          chartApi.current.applyOptions({ width: chartRef.current.clientWidth, height: chartRef.current.clientHeight });
        } catch { /* chart disposed */ }
      }
    });
    ro.observe(chartRef.current);

    return () => {
      ro.disconnect();
      try { chart.remove(); } catch { /* already disposed */ }
      chartApi.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      overlaySeriesRef.current.clear();
      fittedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update candle + volume data in-place (no chart rebuild)
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;
    try {
      candleSeriesRef.current.setData(candles.map((c) => ({
        time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close,
      })) as CandlestickData[]);
      volumeSeriesRef.current.setData(candles.map((c) => ({
        time: c.time as Time, value: c.volume, color: c.close >= c.open ? "#22c55e30" : "#ef444430",
      })) as HistogramData[]);
      if (!fittedRef.current && chartApi.current) {
        chartApi.current.timeScale().fitContent();
        fittedRef.current = true;
      }
    } catch { /* chart disposed during teardown */ }
  }, [candles]);

  // Update overlays (only when indicators or overlay selection changes)
  useEffect(() => {
    if (!chartApi.current || !indicators) return;
    const chart = chartApi.current;

    try {
      overlaySeriesRef.current.forEach((s) => { try { chart.removeSeries(s); } catch { /* ok */ } });
      overlaySeriesRef.current.clear();

      for (const key of overlays) {
        const cfg = ALL_OVERLAYS.find((o) => o.key === key);
        if (!cfg) continue;
        const data = getOverlayData(key, indicators);
        const series = chart.addLineSeries({
          color: cfg.color, lineWidth: 1,
          lineStyle: key.startsWith("sma") ? LineStyle.Dashed : LineStyle.Solid,
          priceLineVisible: false, lastValueVisible: false,
        });
        const ld: LineData[] = [];
        for (let i = 0; i < candles.length; i++) {
          if (data[i] !== null) ld.push({ time: candles[i].time as Time, value: data[i]! });
        }
        series.setData(ld);
        overlaySeriesRef.current.set(key, series);
      }
    } catch { /* chart disposed during teardown */ }
  }, [candles, indicators, overlays]);

  const toggleOverlay = (key: string) => {
    setOverlays((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  };

  const acknowledgeObservation = () => {
    const idx = steps.findIndex((s, i) => !completedSteps.has(i) && s.validate === "observation_acknowledged");
    if (idx !== -1) setCompletedSteps((prev) => new Set(prev).add(idx));
  };

  const composite = indicators?.composite;

  return (
    <div className="mt-6 border border-[#2a2a3a] rounded-lg overflow-hidden">
      <div className="bg-[#111118] px-3 py-2 border-b border-[#2a2a3a] flex items-center justify-between">
        <span className="text-xs font-bold text-[#6366f1]">Try It Yourself</span>
        <span className="text-[10px] text-[#8888a0]">{sym.replace("USDT", "/USDT")} {intv}</span>
      </div>

      <SandboxController steps={steps} completedSteps={completedSteps} />

      <div className="h-64 relative">
        <div ref={chartRef} className="absolute inset-0" />
      </div>

      {/* Scoped controls */}
      <div className="bg-[#111118] px-3 py-2 border-t border-[#2a2a3a]">
        <div className="flex flex-wrap gap-1">
          {ALL_OVERLAYS.filter((o) => enabledControls.has(o.key)).map((o) => (
            <button
              key={o.key}
              onClick={() => toggleOverlay(o.key)}
              className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 ${
                overlays.has(o.key)
                  ? "bg-[#1a1a24] text-[#e8e8ef] border border-[#2a2a3a]"
                  : "text-[#8888a0] hover:text-[#e8e8ef]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: o.color }} />
              {o.label}
            </button>
          ))}

          {steps.some((s) => s.validate === "observation_acknowledged") && (
            <button
              onClick={acknowledgeObservation}
              className="text-[10px] px-2 py-0.5 rounded bg-[#6366f1] text-white ml-auto"
            >
              Got it
            </button>
          )}

          {content.chartConfig.showComposite && (
            <button
              onClick={() => setShowComposite(!showComposite)}
              className={`text-[10px] px-2 py-0.5 rounded ml-auto ${
                showComposite ? "bg-[#6366f1] text-white" : "text-[#8888a0] border border-[#2a2a3a]"
              }`}
            >
              {showComposite ? "Hide" : "Show"} Composite
            </button>
          )}
        </div>
      </div>

      {/* Composite panel (if shown) */}
      {showComposite && composite && (
        <div className="bg-[#0a0a0f] px-3 py-2 border-t border-[#2a2a3a]">
          <div className="flex items-center gap-3 mb-1">
            <span className={`text-lg font-bold ${
              composite.score > 15 ? "text-[#22c55e]" : composite.score < -15 ? "text-[#ef4444]" : "text-[#eab308]"
            }`}>
              {composite.score > 0 ? "+" : ""}{composite.score}
            </span>
            <span className={`text-xs font-bold ${
              composite.verdict.includes("BUY") ? "text-[#22c55e]" :
              composite.verdict.includes("SELL") ? "text-[#ef4444]" : "text-[#eab308]"
            }`}>
              {composite.verdict}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {Object.entries(composite.signals).map(([key, sig]) => (
              <div key={key} className="flex justify-between text-[10px]">
                <span className="text-[#8888a0] capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                <span className={
                  sig.value > 15 ? "text-[#22c55e]" : sig.value < -15 ? "text-[#ef4444]" : "text-[#eab308]"
                }>{sig.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
