"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  createChart, type IChartApi, type ISeriesApi,
  type CandlestickData, type LineData, type HistogramData,
  ColorType, LineStyle, type Time,
} from "lightweight-charts";
import { useStaticCandles } from "@/hooks/useStaticCandles";
import { useIndicators } from "@/hooks/useIndicators";
import { useStrategy } from "@/hooks/useStrategy";
import { useBacktest } from "@/hooks/useBacktest";
import SandboxController from "../SandboxController";
import type { LessonContent } from "@/data/academy/lessons";

export default function StrategyLabSandbox({ content }: { content: LessonContent }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartApi = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const overlaySeries = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const fittedRef = useRef(false);

  const { candles } = useStaticCandles(content.staticDataKey);
  const indicators = useIndicators(candles);
  const strategyHook = useStrategy();
  const backtest = useBacktest();

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const steps = content.tutorialSteps || [];
  const sampleDSL = content.sampleDSL || "";

  // Step validation
  useEffect(() => {
    const newCompleted = new Set(completedSteps);
    for (let i = 0; i < steps.length; i++) {
      if (newCompleted.has(i)) continue;
      const v = steps[i].validate;
      if (v === "sample_loaded" && strategyHook.dslText.length > 0) newCompleted.add(i);
      if (v === "strategy_parsed" && strategyHook.strategy.entryLong.conditions.length > 0) newCompleted.add(i);
      if (v === "backtest_complete" && backtest.result !== null) newCompleted.add(i);
    }
    if (newCompleted.size !== completedSteps.size) setCompletedSteps(newCompleted);
  }, [strategyHook.dslText, strategyHook.strategy, backtest.result, steps, completedSteps]);

  // Create chart
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
    const ro = new ResizeObserver(() => {
      if (chartRef.current && chartApi.current) {
        try { chartApi.current.applyOptions({ width: chartRef.current.clientWidth, height: chartRef.current.clientHeight }); } catch {}
      }
    });
    ro.observe(chartRef.current);
    return () => { ro.disconnect(); try { chart.remove(); } catch {} chartApi.current = null; candleSeriesRef.current = null; overlaySeries.current.clear(); };
  }, []);

  // Set candle data
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return;
    try {
      candleSeriesRef.current.setData(candles.map((c) => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close })) as CandlestickData[]);
      if (!fittedRef.current && chartApi.current) { chartApi.current.timeScale().fitContent(); fittedRef.current = true; }
    } catch {}
  }, [candles]);

  // Show EMA overlays when strategy is loaded
  useEffect(() => {
    if (!chartApi.current || !indicators || strategyHook.dslText.length === 0) return;
    const chart = chartApi.current;
    try {
      overlaySeries.current.forEach((s) => { try { chart.removeSeries(s); } catch {} });
      overlaySeries.current.clear();
      // Always show EMA 20 and EMA 50 when strategy is loaded
      const overlayConfigs = [
        { key: "ema20", data: indicators.ema20, color: "#f59e0b" },
        { key: "ema50", data: indicators.ema50, color: "#3b82f6" },
      ];
      for (const cfg of overlayConfigs) {
        const series = chart.addLineSeries({ color: cfg.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
        const ld: LineData[] = [];
        for (let i = 0; i < candles.length; i++) {
          if (cfg.data[i] !== null) ld.push({ time: candles[i].time as Time, value: cfg.data[i]! });
        }
        series.setData(ld);
        overlaySeries.current.set(cfg.key, series);
      }
    } catch {}
  }, [candles, indicators, strategyHook.dslText]);

  // Show trade markers when backtest completes
  useEffect(() => {
    if (!candleSeriesRef.current || !backtest.result) return;
    const trades = backtest.result.trades;
    if (trades.length === 0) return;
    const markers = trades.flatMap((t) => [
      { time: t.entryTime as Time, position: "belowBar" as const, color: "#22c55e", shape: "arrowUp" as const, text: "BUY" },
      { time: t.exitTime as Time, position: "aboveBar" as const, color: "#ef4444", shape: "arrowDown" as const, text: "SELL" },
    ]);
    try { candleSeriesRef.current.setMarkers(markers.sort((a, b) => (a.time as number) - (b.time as number))); } catch {}
  }, [backtest.result]);

  const handleLoadSample = () => {
    strategyHook.updateFromDSL(sampleDSL);
  };

  const handleRunBacktest = () => {
    if (indicators) backtest.run(strategyHook.strategy, candles, indicators);
  };

  const acknowledgeObservation = () => {
    const idx = steps.findIndex((s, i) => !completedSteps.has(i) && s.validate === "observation_acknowledged");
    if (idx !== -1) setCompletedSteps((prev) => new Set(prev).add(idx));
  };

  const result = backtest.result;
  const hasStrategy = strategyHook.dslText.length > 0;
  const hasParsed = strategyHook.strategy.entryLong.conditions.length > 0;

  return (
    <div className="mt-6 border border-[#2a2a3a] rounded-lg overflow-hidden">
      <div className="bg-[#111118] px-3 py-2 border-b border-[#2a2a3a] flex items-center justify-between">
        <span className="text-xs font-bold text-[#6366f1]">Strategy Lab</span>
        <span className="text-[10px] text-[#8888a0]">Static dataset — 300 candles</span>
      </div>

      <SandboxController steps={steps} completedSteps={completedSteps} />

      {/* Chart */}
      <div className="h-52 relative">
        <div ref={chartRef} className="absolute inset-0" />
      </div>

      {/* Strategy panel */}
      <div className="bg-[#111118] border-t border-[#2a2a3a] px-3 py-3">
        {/* Load button */}
        <div className="flex items-center gap-2 mb-3">
          <button onClick={handleLoadSample}
            className={`text-xs px-3 py-1.5 rounded font-medium ${hasStrategy ? "bg-[#1a1a24] text-[#8888a0] border border-[#2a2a3a]" : "bg-[#6366f1] text-white hover:bg-[#818cf8]"}`}>
            {hasStrategy ? "Sample Loaded" : "Load Sample Strategy"}
          </button>
          {hasStrategy && !result && (
            <button onClick={handleRunBacktest} disabled={backtest.running || !hasParsed}
              className="text-xs px-3 py-1.5 rounded font-medium bg-[#22c55e] text-white hover:bg-[#16a34a] disabled:opacity-50">
              {backtest.running ? "Running..." : "Run Backtest"}
            </button>
          )}
        </div>

        {/* DSL code display */}
        {hasStrategy && (
          <div className="mb-3">
            <div className="text-[10px] text-[#8888a0] uppercase font-bold mb-1">DSL Code</div>
            <pre className="bg-[#0a0a0f] border border-[#2a2a3a] rounded p-2 text-xs text-[#6366f1] overflow-x-auto">
              {strategyHook.dslText}
            </pre>
          </div>
        )}

        {/* Parsed conditions */}
        {hasParsed && (
          <div className="mb-3">
            <div className="text-[10px] text-[#8888a0] uppercase font-bold mb-1">Parsed Conditions</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#0a0a0f] border border-[#2a2a3a] rounded p-2">
                <div className="text-[10px] text-[#22c55e] font-bold mb-1">Entry ({strategyHook.strategy.entryLong.logic})</div>
                {strategyHook.strategy.entryLong.conditions.map((c) => (
                  <div key={c.id} className="text-[10px] text-[#e8e8ef]">
                    {c.left.type === "indicator" ? `${c.left.ref.name}(${c.left.ref.params.join(",")})` : c.left.type === "price" ? "price" : c.left.value}
                    {" "}<span className="text-[#8888a0]">{c.op.replace("_", " ")}</span>{" "}
                    {c.right.type === "indicator" ? `${c.right.ref.name}(${c.right.ref.params.join(",")})` : c.right.type === "price" ? "price" : c.right.value}
                  </div>
                ))}
              </div>
              <div className="bg-[#0a0a0f] border border-[#2a2a3a] rounded p-2">
                <div className="text-[10px] text-[#ef4444] font-bold mb-1">Exit ({strategyHook.strategy.exitLong.logic})</div>
                {strategyHook.strategy.exitLong.conditions.map((c) => (
                  <div key={c.id} className="text-[10px] text-[#e8e8ef]">
                    {c.left.type === "indicator" ? `${c.left.ref.name}(${c.left.ref.params.join(",")})` : c.left.type === "price" ? "price" : c.left.value}
                    {" "}<span className="text-[#8888a0]">{c.op.replace("_", " ")}</span>{" "}
                    {c.right.type === "indicator" ? `${c.right.ref.name}(${c.right.ref.params.join(",")})` : c.right.type === "price" ? "price" : c.right.value}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Backtest results */}
        {result && (
          <div>
            <div className="text-[10px] text-[#8888a0] uppercase font-bold mb-1">Backtest Results</div>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-[#0a0a0f] border border-[#2a2a3a] rounded p-2 text-center">
                <div className="text-[10px] text-[#8888a0]">Total Return</div>
                <div className={`text-sm font-bold ${result.totalReturn > 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                  {result.totalReturn > 0 ? "+" : ""}{result.totalReturn.toFixed(1)}%
                </div>
              </div>
              <div className="bg-[#0a0a0f] border border-[#2a2a3a] rounded p-2 text-center">
                <div className="text-[10px] text-[#8888a0]">Trades</div>
                <div className="text-sm font-bold text-[#e8e8ef]">{result.totalTrades}</div>
              </div>
              <div className="bg-[#0a0a0f] border border-[#2a2a3a] rounded p-2 text-center">
                <div className="text-[10px] text-[#8888a0]">Win Rate</div>
                <div className={`text-sm font-bold ${result.winRate > 50 ? "text-[#22c55e]" : "text-[#eab308]"}`}>
                  {result.winRate.toFixed(0)}%
                </div>
              </div>
              <div className="bg-[#0a0a0f] border border-[#2a2a3a] rounded p-2 text-center">
                <div className="text-[10px] text-[#8888a0]">Avg/Trade</div>
                <div className={`text-sm font-bold ${result.totalReturn / Math.max(result.totalTrades, 1) > 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                  {(result.totalReturn / Math.max(result.totalTrades, 1)).toFixed(2)}%
                </div>
              </div>
            </div>
            {result.trades.length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] text-[#8888a0] uppercase font-bold mb-1">Trade Log</div>
                <div className="max-h-24 overflow-y-auto">
                  {result.trades.map((t, i) => (
                    <div key={i} className="flex justify-between text-[10px] py-0.5 border-b border-[#1a1a24]">
                      <span className="text-[#8888a0]">#{i + 1}</span>
                      <span className="text-[#e8e8ef]">${t.entryPrice.toFixed(0)} → ${t.exitPrice.toFixed(0)}</span>
                      <span className={t.returnPct > 0 ? "text-[#22c55e]" : "text-[#ef4444]"}>
                        {t.returnPct > 0 ? "+" : ""}{t.returnPct.toFixed(2)}%
                      </span>
                      <span className="text-[#8888a0]">{t.duration} bars</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Got it button */}
      {steps.some((s) => s.validate === "observation_acknowledged") && (
        <div className="bg-[#111118] px-3 py-2 border-t border-[#2a2a3a] flex justify-end">
          <button onClick={acknowledgeObservation}
            className="text-[10px] px-2 py-0.5 rounded bg-[#6366f1] text-white">
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
