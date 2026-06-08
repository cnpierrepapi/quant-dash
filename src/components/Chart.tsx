"use client";

import { useEffect, useRef, useCallback, useState } from "react";
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
import { useIndicators, type IndicatorData } from "@/hooks/useIndicators";
import { useProjection } from "@/hooks/useProjection";
import { useStrategy } from "@/hooks/useStrategy";
import { useBacktest } from "@/hooks/useBacktest";
import { usePerformance } from "@/hooks/usePerformance";
import ChartToolbar from "./chart/ChartToolbar";
import Sidebar from "./sidebar/Sidebar";
import StrategyPanel from "./strategy/StrategyPanel";
import BacktestPanel from "./backtest/BacktestPanel";
import PerformanceReport from "./report/PerformanceReport";

// ── Overlay config ──
const OVERLAY_COLORS: Record<string, { color: string; dashed?: boolean }> = {
  ema20: { color: "#f59e0b" }, ema50: { color: "#3b82f6" }, ema200: { color: "#ef4444" },
  sma20: { color: "#f59e0b", dashed: true }, sma50: { color: "#3b82f6", dashed: true }, sma200: { color: "#ef4444", dashed: true },
  vwap: { color: "#a855f7" }, bbUpper: { color: "#6366f1" }, bbLower: { color: "#6366f1" },
};

function getOverlayData(key: string, inds: IndicatorData): (number | null)[] {
  const map: Record<string, (number | null)[]> = {
    ema20: inds.ema20, ema50: inds.ema50, ema200: inds.ema200,
    sma20: inds.sma20, sma50: inds.sma50, sma200: inds.sma200,
    vwap: inds.vwap, bbUpper: inds.bollinger.upper, bbLower: inds.bollinger.lower,
  };
  return map[key] || [];
}

export default function Chart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartApi = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);
  const overlaySeries = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const srLines = useRef<ISeriesApi<"Line">[]>([]);
  const projSeries = useRef<ISeriesApi<"Line">[]>([]);

  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("1h");
  const [overlays, setOverlays] = useState<Set<string>>(new Set(["ema20", "ema50"]));
  const [showSR, setShowSR] = useState(true);
  const [showReport, setShowReport] = useState(false);

  // Hooks
  const { candles, loading, lastUpdate, currentPrice, priceChange } = useCandles(symbol, interval);
  const indicators = useIndicators(candles);
  const projection = useProjection(candles);
  const strategyHook = useStrategy();
  const backtest = useBacktest();
  const metrics = usePerformance(backtest.result, candles);

  // ── Build chart ──
  const buildChart = useCallback(() => {
    if (!chartRef.current || candles.length === 0) return;
    if (chartApi.current) {
      try { chartApi.current.remove(); } catch { /* already disposed */ }
      chartApi.current = null;
      overlaySeries.current.clear();
      srLines.current = [];
      projSeries.current = [];
    }

    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0a0a0f" },
        textColor: "#8888a0", fontFamily: "var(--font-geist-mono), monospace", fontSize: 11,
      },
      grid: { vertLines: { color: "#1a1a24" }, horzLines: { color: "#1a1a24" } },
      crosshair: {
        vertLine: { color: "#6366f1", width: 1, style: LineStyle.Dashed },
        horzLine: { color: "#6366f1", width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: { borderColor: "#2a2a3a", scaleMargins: { top: 0.1, bottom: 0.25 } },
      timeScale: { borderColor: "#2a2a3a", timeVisible: true, secondsVisible: false },
      width: chartRef.current.clientWidth, height: chartRef.current.clientHeight,
    });
    chartApi.current = chart;

    const cs = chart.addCandlestickSeries({
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });
    cs.setData(candles.map((c) => ({
      time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close,
    })) as CandlestickData[]);
    candleSeries.current = cs;

    // Trade markers
    if (backtest.result && backtest.result.trades.length > 0) {
      const markers = backtest.result.trades.flatMap((t) => [
        {
          time: t.entryTime as Time,
          position: "belowBar" as const,
          color: "#22c55e",
          shape: "arrowUp" as const,
          text: "BUY",
        },
        {
          time: t.exitTime as Time,
          position: "aboveBar" as const,
          color: "#ef4444",
          shape: "arrowDown" as const,
          text: "SELL",
        },
      ]);
      cs.setMarkers(markers.sort((a, b) => (a.time as number) - (b.time as number)));
    }

    const vs = chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "vol" });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    vs.setData(candles.map((c) => ({
      time: c.time as Time, value: c.volume,
      color: c.close >= c.open ? "#22c55e40" : "#ef444440",
    })) as HistogramData[]);
    volumeSeries.current = vs;

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (chartRef.current && chartApi.current) {
        chartApi.current.applyOptions({ width: chartRef.current.clientWidth, height: chartRef.current.clientHeight });
      }
    });
    ro.observe(chartRef.current);
    return () => ro.disconnect();
  }, [candles, backtest.result]);

  // ── Update overlays + projection ──
  const updateOverlays = useCallback(() => {
    if (!chartApi.current || !indicators) return;
    const chart = chartApi.current;

    overlaySeries.current.forEach((s) => { try { chart.removeSeries(s); } catch { /* ok */ } });
    overlaySeries.current.clear();
    srLines.current.forEach((s) => { try { chart.removeSeries(s); } catch { /* ok */ } });
    srLines.current = [];
    projSeries.current.forEach((s) => { try { chart.removeSeries(s); } catch { /* ok */ } });
    projSeries.current = [];

    // Indicator overlays
    for (const key of overlays) {
      const cfg = OVERLAY_COLORS[key];
      if (!cfg) continue;
      const data = getOverlayData(key, indicators);
      const series = chart.addLineSeries({
        color: cfg.color, lineWidth: 1,
        lineStyle: cfg.dashed ? LineStyle.Dashed : LineStyle.Solid,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      const ld: LineData[] = [];
      for (let i = 0; i < candles.length; i++) {
        if (data[i] !== null) ld.push({ time: candles[i].time as Time, value: data[i]! });
      }
      series.setData(ld);
      overlaySeries.current.set(key, series);
    }

    // S/R lines
    if (showSR && indicators.supportResistance) {
      for (const level of indicators.supportResistance.slice(0, 6)) {
        const s = chart.addLineSeries({
          color: level.type === "support" ? "#22c55e50" : "#ef444450",
          lineWidth: 1, lineStyle: LineStyle.Dotted,
          priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false,
        });
        s.setData([
          { time: candles[0].time as Time, value: level.price },
          { time: candles[candles.length - 1].time as Time, value: level.price },
        ]);
        srLines.current.push(s);
      }
    }

    // Projection fan
    if (projection.enabled && projection.result && projection.result.fan.length > 0) {
      const fan = projection.result.fan;

      // P10-P90 band (wide, faint)
      const bandOuter = chart.addLineSeries({
        color: "#6366f120", lineWidth: 1, priceLineVisible: false,
        lastValueVisible: false, crosshairMarkerVisible: false,
      });
      bandOuter.setData(fan.map((f) => ({ time: f.time as Time, value: f.p90 })));
      projSeries.current.push(bandOuter);

      const bandOuterLow = chart.addLineSeries({
        color: "#6366f120", lineWidth: 1, priceLineVisible: false,
        lastValueVisible: false, crosshairMarkerVisible: false,
      });
      bandOuterLow.setData(fan.map((f) => ({ time: f.time as Time, value: f.p10 })));
      projSeries.current.push(bandOuterLow);

      // P25-P75 band (tighter, brighter)
      const bandInner = chart.addLineSeries({
        color: "#6366f140", lineWidth: 1, lineStyle: LineStyle.Dotted,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      bandInner.setData(fan.map((f) => ({ time: f.time as Time, value: f.p75 })));
      projSeries.current.push(bandInner);

      const bandInnerLow = chart.addLineSeries({
        color: "#6366f140", lineWidth: 1, lineStyle: LineStyle.Dotted,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      bandInnerLow.setData(fan.map((f) => ({ time: f.time as Time, value: f.p25 })));
      projSeries.current.push(bandInnerLow);

      // Median line (bold)
      const median = chart.addLineSeries({
        color: "#6366f1", lineWidth: 2,
        priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false,
      });
      median.setData(fan.map((f) => ({ time: f.time as Time, value: f.p50 })));
      projSeries.current.push(median);
    }
  }, [candles, indicators, overlays, showSR, projection.enabled, projection.result]);

  useEffect(() => buildChart(), [buildChart]);
  useEffect(() => { updateOverlays(); }, [updateOverlays]);

  // Update data in-place on polling
  useEffect(() => {
    if (!candleSeries.current || candles.length === 0) return;
    candleSeries.current.setData(candles.map((c) => ({
      time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close,
    })) as CandlestickData[]);
    if (volumeSeries.current) {
      volumeSeries.current.setData(candles.map((c) => ({
        time: c.time as Time, value: c.volume,
        color: c.close >= c.open ? "#22c55e40" : "#ef444440",
      })) as HistogramData[]);
    }
  }, [candles]);

  const toggleOverlay = (key: string) => {
    setOverlays((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  };

  const handleRunBacktest = () => {
    if (indicators) backtest.run(strategyHook.strategy, candles, indicators);
  };

  return (
    <div className="flex flex-col h-screen">
      <ChartToolbar
        symbol={symbol} onSymbolChange={setSymbol}
        interval={interval} onIntervalChange={setInterval}
        currentPrice={currentPrice} priceChange={priceChange}
        loading={loading} lastUpdate={lastUpdate}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative">
            <div ref={chartRef} className="absolute inset-0" />
          </div>

          {/* Strategy + Backtest panels below chart */}
          <StrategyPanel
            strategy={strategyHook.strategy}
            dslText={strategyHook.dslText}
            parseError={strategyHook.parseError}
            onBuilderChange={strategyHook.updateFromBuilder}
            onDSLChange={strategyHook.updateFromDSL}
            onFileUpload={strategyHook.loadFile}
            presetNames={strategyHook.presetNames}
            onLoadPreset={strategyHook.loadPreset}
            onRunBacktest={handleRunBacktest}
            backtestRunning={backtest.running}
          />

          {backtest.result && (
            <BacktestPanel result={backtest.result} metrics={metrics} onClear={backtest.clear} />
          )}

          {backtest.result && metrics && (
            <div className="flex items-center justify-between px-4 py-1 border-t border-[#2a2a3a] bg-[#111118]">
              <button
                onClick={() => setShowReport(!showReport)}
                className="text-xs text-[#6366f1] hover:text-[#818cf8] font-medium"
              >
                {showReport ? "Hide" : "Show"} Academic Report
              </button>
            </div>
          )}

          {showReport && backtest.result && metrics && indicators && (
            <PerformanceReport metrics={metrics} result={backtest.result} candles={candles} indicators={indicators} />
          )}
        </div>

        <Sidebar
          indicators={indicators}
          overlays={overlays} onToggleOverlay={toggleOverlay}
          showSR={showSR} onToggleSR={() => setShowSR(!showSR)}
          projectionEnabled={projection.enabled}
          onToggleProjection={projection.toggle}
          projectionHorizon={projection.horizon}
          onProjectionHorizonChange={projection.setHorizon}
          projectionPaths={projection.nPaths}
          onProjectionPathsChange={projection.setNPaths}
          projectionComputing={projection.computing}
          onProjectionRegenerate={projection.regenerate}
          projectionResult={projection.result}
        />
      </div>
    </div>
  );
}
