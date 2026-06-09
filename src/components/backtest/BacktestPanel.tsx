"use client";

import { useState, useEffect, useRef } from "react";
import {
  createChart, type IChartApi, ColorType, type Time,
} from "lightweight-charts";
import type { BacktestResult } from "@/lib/strategy-types";
import type { PerformanceMetrics } from "@/lib/performance";
import TradeLog from "./TradeLog";
import Tabs from "@/components/ui/Tabs";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "trades", label: "List of Trades" },
  { key: "performance", label: "Performance Summary" },
];

function MetricBox({
  label, value, sub, color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "green" | "red" | "neutral";
}) {
  const textColor = color === "green" ? "text-[#22c55e]" : color === "red" ? "text-[#ef4444]" : "text-[#e8e8ef]";
  return (
    <div className="bg-[#0d0d14] rounded p-2.5 border border-[#1a1a24]">
      <div className="text-[10px] text-[#8888a0] uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-base font-bold ${textColor}`}>{value}</div>
      {sub && <div className="text-[10px] text-[#8888a0] mt-0.5">{sub}</div>}
    </div>
  );
}

function MiniEquityCurve({ equityCurve }: { equityCurve: { time: number; equity: number }[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartApi = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartRef.current || equityCurve.length < 2) return;

    const chart = createChart(chartRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#0d0d14" }, textColor: "#8888a0", fontSize: 9 },
      grid: { vertLines: { visible: false }, horzLines: { color: "#1a1a2410" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderVisible: false, visible: false },
      crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
      handleScroll: false, handleScale: false,
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight,
    });
    chartApi.current = chart;

    const finalEquity = equityCurve[equityCurve.length - 1].equity;
    const startEquity = equityCurve[0].equity;
    const isPositive = finalEquity >= startEquity;

    const area = chart.addAreaSeries({
      topColor: isPositive ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
      bottomColor: isPositive ? "rgba(34, 197, 94, 0.02)" : "rgba(239, 68, 68, 0.02)",
      lineColor: isPositive ? "#22c55e" : "#ef4444",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    area.setData(equityCurve.map((e) => ({
      time: e.time as Time,
      value: e.equity,
    })));

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (chartRef.current && chartApi.current) {
        try { chartApi.current.applyOptions({ width: chartRef.current.clientWidth }); } catch {}
      }
    });
    ro.observe(chartRef.current);

    return () => { ro.disconnect(); try { chart.remove(); } catch {} chartApi.current = null; };
  }, [equityCurve]);

  return <div ref={chartRef} className="w-full h-full" />;
}

export default function BacktestPanel({
  result, metrics, onClear,
}: {
  result: BacktestResult;
  metrics: PerformanceMetrics | null;
  onClear: () => void;
}) {
  const [tab, setTab] = useState("overview");

  const wins = result.trades.filter((t) => t.returnPct > 0);
  const losses = result.trades.filter((t) => t.returnPct <= 0);
  const grossProfit = wins.reduce((s, t) => s + t.returnPct, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.returnPct, 0));
  const avgBars = result.trades.length > 0
    ? Math.round(result.trades.reduce((s, t) => s + t.duration, 0) / result.trades.length)
    : 0;
  const largestWin = wins.length > 0 ? Math.max(...wins.map((t) => t.returnPct)) : 0;
  const largestLoss = losses.length > 0 ? Math.min(...losses.map((t) => t.returnPct)) : 0;
  const maxConsecWins = (() => {
    let max = 0, curr = 0;
    for (const t of result.trades) { if (t.returnPct > 0) { curr++; max = Math.max(max, curr); } else curr = 0; }
    return max;
  })();
  const maxConsecLosses = (() => {
    let max = 0, curr = 0;
    for (const t of result.trades) { if (t.returnPct <= 0) { curr++; max = Math.max(max, curr); } else curr = 0; }
    return max;
  })();

  return (
    <div className="border-t border-[#2a2a3a] bg-[#111118]">
      {/* Header bar — TradingView style */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#2a2a3a]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#e8e8ef]">Strategy Tester</span>
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
        <button onClick={onClear} data-testid="clear-backtest" className="text-xs text-[#8888a0] hover:text-[#ef4444]" title="Clear results">x</button>
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="p-3">
          {/* Top row: equity curve + key numbers */}
          <div className="flex gap-3 mb-3">
            {/* Equity curve */}
            <div className="flex-1 bg-[#0d0d14] rounded border border-[#1a1a24] p-2">
              <div className="text-[10px] text-[#8888a0] uppercase mb-1">Equity Curve</div>
              <div className="h-24">
                <MiniEquityCurve equityCurve={result.equityCurve} />
              </div>
            </div>

            {/* Net profit + key stats */}
            <div className="w-44 flex flex-col gap-1.5">
              <div className="bg-[#0d0d14] rounded p-2.5 border border-[#1a1a24]">
                <div className="text-[10px] text-[#8888a0] uppercase tracking-wide">Net Profit</div>
                <div className={`text-xl font-bold ${result.totalReturn >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                  {result.totalReturn >= 0 ? "+" : ""}{result.totalReturn.toFixed(2)}%
                </div>
              </div>
              <div className="flex gap-1.5">
                <div className="flex-1 bg-[#0d0d14] rounded p-2 border border-[#1a1a24] text-center">
                  <div className="text-[9px] text-[#8888a0]">Trades</div>
                  <div className="text-sm font-bold text-[#e8e8ef]">{result.totalTrades}</div>
                </div>
                <div className="flex-1 bg-[#0d0d14] rounded p-2 border border-[#1a1a24] text-center">
                  <div className="text-[9px] text-[#8888a0]">Win %</div>
                  <div className={`text-sm font-bold ${result.winRate >= 50 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                    {result.winRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metric grid */}
          <div className="grid grid-cols-4 gap-1.5">
            <MetricBox
              label="Gross Profit"
              value={`+${grossProfit.toFixed(2)}%`}
              color="green"
            />
            <MetricBox
              label="Gross Loss"
              value={`-${grossLoss.toFixed(2)}%`}
              color="red"
            />
            <MetricBox
              label="Profit Factor"
              value={metrics ? metrics.profitFactor.toFixed(2) : "—"}
              color={metrics && metrics.profitFactor >= 1.5 ? "green" : metrics && metrics.profitFactor < 1 ? "red" : "neutral"}
            />
            <MetricBox
              label="Max Drawdown"
              value={metrics ? `${metrics.maxDrawdown.toFixed(1)}%` : "—"}
              color="red"
            />
            <MetricBox
              label="Sharpe Ratio"
              value={metrics ? metrics.sharpe.toFixed(2) : "—"}
              color={metrics && metrics.sharpe > 1 ? "green" : metrics && metrics.sharpe < 0 ? "red" : "neutral"}
            />
            <MetricBox
              label="Sortino Ratio"
              value={metrics ? metrics.sortino.toFixed(2) : "—"}
              color={metrics && metrics.sortino > 1.5 ? "green" : "neutral"}
            />
            <MetricBox
              label="Avg Trade"
              value={result.totalTrades > 0 ? `${(result.totalReturn / result.totalTrades).toFixed(2)}%` : "—"}
              color={result.totalReturn >= 0 ? "green" : "red"}
            />
            <MetricBox
              label="Avg Bars in Trade"
              value={String(avgBars)}
              color="neutral"
            />
          </div>

          {/* Win/Loss bar */}
          {result.totalTrades > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-[#1a1a24]">
                <div className="bg-[#22c55e] h-full" style={{ width: `${result.winRate}%` }} />
                <div className="bg-[#ef4444] h-full" style={{ width: `${100 - result.winRate}%` }} />
              </div>
              <span className="text-[10px] text-[#8888a0]">
                {wins.length}W / {losses.length}L
              </span>
            </div>
          )}

          {/* Buy & Hold comparison */}
          {metrics && (
            <div className="mt-2 flex items-center gap-3 text-[10px]">
              <span className="text-[#8888a0]">vs Buy & Hold:</span>
              <span className={metrics.buyAndHoldReturn >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}>
                {metrics.buyAndHoldReturn >= 0 ? "+" : ""}{metrics.buyAndHoldReturn.toFixed(1)}%
              </span>
              <span className={result.totalReturn > metrics.buyAndHoldReturn ? "text-[#22c55e]" : "text-[#ef4444]"}>
                ({result.totalReturn > metrics.buyAndHoldReturn ? "outperformed" : "underperformed"} by{" "}
                {Math.abs(result.totalReturn - metrics.buyAndHoldReturn).toFixed(1)}pp)
              </span>
            </div>
          )}
        </div>
      )}

      {/* List of Trades tab */}
      {tab === "trades" && (
        <div className="max-h-64 overflow-y-auto">
          <TradeLog trades={result.trades} />
        </div>
      )}

      {/* Performance Summary tab */}
      {tab === "performance" && metrics && (
        <div className="p-3">
          <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 text-xs">
            <div className="col-span-2 text-[10px] font-bold text-[#8888a0] uppercase mb-1 mt-1">Returns</div>
            <Row label="Net Profit" value={`${result.totalReturn >= 0 ? "+" : ""}${result.totalReturn.toFixed(2)}%`} color={result.totalReturn >= 0} />
            <Row label="Gross Profit" value={`+${grossProfit.toFixed(2)}%`} color={true} />
            <Row label="Gross Loss" value={`-${grossLoss.toFixed(2)}%`} color={false} />
            <Row label="Buy & Hold Return" value={`${metrics.buyAndHoldReturn >= 0 ? "+" : ""}${metrics.buyAndHoldReturn.toFixed(2)}%`} color={metrics.buyAndHoldReturn >= 0} />

            <div className="col-span-2 text-[10px] font-bold text-[#8888a0] uppercase mb-1 mt-3">Risk</div>
            <Row label="Max Drawdown" value={`${metrics.maxDrawdown.toFixed(2)}%`} color={false} />
            <Row label="Sharpe Ratio" value={metrics.sharpe.toFixed(3)} color={metrics.sharpe > 0} />
            <Row label="Sortino Ratio" value={metrics.sortino.toFixed(3)} color={metrics.sortino > 0} />
            <Row label="Calmar Ratio" value={metrics.calmar.toFixed(3)} color={metrics.calmar > 0} />
            <Row label="Profit Factor" value={metrics.profitFactor.toFixed(3)} color={metrics.profitFactor > 1} />

            <div className="col-span-2 text-[10px] font-bold text-[#8888a0] uppercase mb-1 mt-3">Trades</div>
            <Row label="Total Trades" value={String(result.totalTrades)} />
            <Row label="Winning Trades" value={`${wins.length} (${result.winRate.toFixed(1)}%)`} color={true} />
            <Row label="Losing Trades" value={`${losses.length} (${(100 - result.winRate).toFixed(1)}%)`} color={false} />
            <Row label="Avg Win" value={`+${metrics.avgWin.toFixed(2)}%`} color={true} />
            <Row label="Avg Loss" value={`-${metrics.avgLoss.toFixed(2)}%`} color={false} />
            <Row label="Largest Win" value={`+${largestWin.toFixed(2)}%`} color={true} />
            <Row label="Largest Loss" value={`${largestLoss.toFixed(2)}%`} color={false} />
            <Row label="Reward/Risk Ratio" value={metrics.rrRatio.toFixed(2)} color={metrics.rrRatio > 1} />
            <Row label="Break-Even Win Rate" value={`${metrics.breakEvenWR.toFixed(1)}%`} />
            <Row label="Edge" value={`${metrics.edge >= 0 ? "+" : ""}${metrics.edge.toFixed(1)}pp`} color={metrics.edge > 0} />
            <Row label="Avg Bars in Trade" value={String(avgBars)} />
            <Row label="Max Consec. Wins" value={String(maxConsecWins)} color={true} />
            <Row label="Max Consec. Losses" value={String(maxConsecLosses)} color={false} />
          </div>
        </div>
      )}

      {/* Fallback if no metrics yet */}
      {tab === "performance" && !metrics && (
        <div className="p-4 text-xs text-[#8888a0] text-center">Need at least 1 trade for performance metrics</div>
      )}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: boolean }) {
  return (
    <div className="flex justify-between py-0.5 border-b border-[#1a1a2440]">
      <span className="text-[#8888a0]">{label}</span>
      <span className={color === true ? "text-[#22c55e]" : color === false ? "text-[#ef4444]" : "text-[#e8e8ef]"}>
        {value}
      </span>
    </div>
  );
}
