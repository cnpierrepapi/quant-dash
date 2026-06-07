"use client";

import type { PerformanceMetrics } from "@/lib/performance";
import type { BacktestResult } from "@/lib/strategy-types";
import type { IndicatorData } from "@/hooks/useIndicators";
import { runsTest, stationaryBlockBootstrap, computeRisk, vpinCorrelation } from "@/lib/statistics";
import { fitHMM, regimeBreakdown } from "@/lib/hmm";
import type { Candle } from "@/hooks/useCandles";
import { useMemo } from "react";

function Card({ title, children, badge }: { title: string; children: React.ReactNode; badge?: string }) {
  return (
    <div className="bg-[#1a1a24] rounded-lg p-3 border border-[#2a2a3a]">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] font-bold text-[#8888a0] uppercase">{title}</h4>
        {badge && <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#2a2a3a] text-[#8888a0]">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-[#8888a0]">{label}</span>
      <span className={color || "text-[#e8e8ef]"}>{value}</span>
    </div>
  );
}

export default function PerformanceReport({
  metrics, result, candles, indicators,
}: {
  metrics: PerformanceMetrics;
  result: BacktestResult;
  candles: Candle[];
  indicators: IndicatorData;
}) {
  const tradeReturns = result.trades.map((t) => t.returnPct);
  const dailyReturns = candles.slice(1).map((c, i) => c.close / candles[i].close - 1);

  const runs = useMemo(() => runsTest(tradeReturns), [tradeReturns]);
  // SBB instead of standard shuffle — preserves serial dependence (Politis & Romano 1994)
  const sbb = useMemo(() => stationaryBlockBootstrap(tradeReturns, 5000, 5), [tradeReturns]);
  const equityReturns = result.equityCurve.slice(1).map((e, i) =>
    e.equity / result.equityCurve[i].equity - 1
  );
  // ES as primary risk metric (Basel III/IV standard)
  const risk = useMemo(() => equityReturns.length > 10 ? computeRisk(equityReturns) : null, [equityReturns]);
  const hmm = useMemo(() => dailyReturns.length > 50 ? fitHMM(dailyReturns, 3, 50) : null, [dailyReturns]);
  const regimes = useMemo(() =>
    hmm ? regimeBreakdown(result.trades, hmm.states, hmm.stateLabels) : null,
    [hmm, result.trades]
  );
  const vpinCorr = useMemo(() => {
    const rets = candles.slice(1).map((c, i) => c.close / candles[i].close - 1);
    return vpinCorrelation(indicators.vpin, rets);
  }, [candles, indicators.vpin]);

  return (
    <div className="border-t border-[#2a2a3a] bg-[#0a0a0f] p-4">
      <h3 className="text-sm font-bold text-[#6366f1] mb-3">Performance Report</h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Ratios */}
        <Card title="Risk-Adjusted Returns">
          <div className="space-y-1">
            <Stat label="Sharpe" value={metrics.sharpe.toFixed(2)} color={metrics.sharpe > 1 ? "text-[#22c55e]" : metrics.sharpe < 0 ? "text-[#ef4444]" : undefined} />
            <Stat label="Sortino" value={metrics.sortino.toFixed(2)} />
            <Stat label="Calmar" value={metrics.calmar.toFixed(2)} />
            <Stat label="Profit Factor" value={metrics.profitFactor.toFixed(2)} />
            <div className="border-t border-[#2a2a3a] mt-1 pt-1">
              <Stat label="Strategy" value={`${metrics.totalReturn >= 0 ? "+" : ""}${metrics.totalReturn.toFixed(1)}%`}
                color={metrics.totalReturn >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"} />
              <Stat label="Buy & Hold" value={`${metrics.buyAndHoldReturn >= 0 ? "+" : ""}${metrics.buyAndHoldReturn.toFixed(1)}%`} />
            </div>
          </div>
        </Card>

        {/* Break-Even */}
        <Card title="Break-Even Analysis">
          <div className="space-y-1">
            <Stat label="Avg Win" value={`+${metrics.avgWin.toFixed(2)}%`} color="text-[#22c55e]" />
            <Stat label="Avg Loss" value={`-${metrics.avgLoss.toFixed(2)}%`} color="text-[#ef4444]" />
            <Stat label="R:R Ratio" value={metrics.rrRatio.toFixed(2)} />
            <Stat label="Break-Even WR" value={`${metrics.breakEvenWR.toFixed(1)}%`} />
            <Stat label="Actual WR" value={`${metrics.winRate.toFixed(1)}%`}
              color={metrics.edge > 0 ? "text-[#22c55e]" : "text-[#ef4444]"} />
            <Stat label="Edge" value={`${metrics.edge >= 0 ? "+" : ""}${metrics.edge.toFixed(1)}pp`}
              color={metrics.edge > 0 ? "text-[#22c55e]" : "text-[#ef4444]"} />
          </div>
        </Card>

        {/* Runs Test */}
        <Card title="Wald-Wolfowitz Runs Test">
          <div className="space-y-1">
            <Stat label="Observed Runs" value={String(runs.runs)} />
            <Stat label="Expected Runs" value={runs.expected.toFixed(1)} />
            <Stat label="Z-score" value={runs.z.toFixed(2)} />
            <Stat label="P-value" value={runs.pValue.toFixed(4)} />
            <div className="mt-2 text-[10px] text-center font-medium rounded py-1" style={{
              background: runs.isRandom ? "#ef444420" : "#22c55e20",
              color: runs.isRandom ? "#ef4444" : "#22c55e",
            }}>
              {runs.isRandom ? "W/L sequence looks RANDOM" : "W/L sequence has STRUCTURE"}
            </div>
          </div>
        </Card>

        {/* SBB — replaces standard MC bootstrap */}
        <Card title="Block Bootstrap (5K paths)" badge="SBB">
          <div className="space-y-1">
            <Stat label="Actual Return" value={`${sbb.actualReturn >= 0 ? "+" : ""}${sbb.actualReturn.toFixed(1)}%`} />
            <Stat label="SBB Median" value={`${sbb.medianReturn >= 0 ? "+" : ""}${sbb.medianReturn.toFixed(1)}%`} />
            <Stat label="SBB 5th/95th" value={`${sbb.p5.toFixed(1)}% / ${sbb.p95.toFixed(1)}%`} />
            <Stat label="Percentile Rank" value={`${sbb.percentileRank.toFixed(0)}th`}
              color={sbb.percentileRank > 80 ? "text-[#22c55e]" : sbb.percentileRank < 20 ? "text-[#ef4444]" : undefined} />
            <div className="mt-2 text-[10px] text-center font-medium rounded py-1" style={{
              background: sbb.percentileRank > 80 ? "#22c55e20" : sbb.percentileRank < 20 ? "#ef444420" : "#eab30820",
              color: sbb.percentileRank > 80 ? "#22c55e" : sbb.percentileRank < 20 ? "#ef4444" : "#eab308",
            }}>
              {sbb.percentileRank > 80 ? "LIKELY REAL EDGE" : sbb.percentileRank > 50 ? "INCONCLUSIVE" : "LIKELY LUCK"}
            </div>
            <p className="text-[8px] text-[#8888a0] mt-1">Politis & Romano (1994). Preserves autocorrelation vs standard shuffle.</p>
          </div>
        </Card>

        {/* Expected Shortfall — primary risk metric (replaces VaR display) */}
        {risk && (
          <Card title="Expected Shortfall" badge="Basel III">
            <div className="space-y-1">
              <Stat label="ES 97.5%" value={`${(risk.es97_5 * 100).toFixed(3)}%`} color="text-[#ef4444]" />
              <Stat label="ES 95%" value={`${(risk.es95 * 100).toFixed(3)}%`} color="text-[#ef4444]" />
              <div className="border-t border-[#2a2a3a] mt-1 pt-1">
                <Stat label="VaR 95% (hist)" value={`${(risk.varHistorical * 100).toFixed(3)}%`} />
                <Stat label="VaR 95% (C-F)" value={`${(risk.varCornishFisher * 100).toFixed(3)}%`} />
              </div>
              <p className="text-[8px] text-[#8888a0] mt-1">
                ES = avg loss beyond VaR. More informative than VaR alone for fat-tailed crypto.
              </p>
            </div>
          </Card>
        )}

        {/* Regime Breakdown */}
        {regimes && (
          <Card title="HMM Regime Breakdown" badge="Hamilton 1989">
            <div className="space-y-1">
              {regimes.map((r) => (
                <div key={r.label} className="flex items-center justify-between text-xs">
                  <span className={
                    r.label === "BULL" ? "text-[#22c55e]" :
                    r.label === "BEAR" ? "text-[#ef4444]" : "text-[#eab308]"
                  }>{r.label}</span>
                  <span className="text-[#8888a0]">{r.count} trades</span>
                  <span className={r.avgReturn >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}>
                    {r.avgReturn >= 0 ? "+" : ""}{r.avgReturn.toFixed(2)}%
                  </span>
                  <span className="text-[#8888a0]">WR {r.winRate.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* VPIN — relabeled as heuristic */}
        <Card title="VPIN Flow Imbalance" badge="heuristic">
          <div className="space-y-1">
            <Stat label="Correlation" value={vpinCorr.correlation.toFixed(3)} />
            <Stat label="High VPIN avg |move|" value={`${vpinCorr.highVpinAvgMove.toFixed(3)}%`} />
            <Stat label="Low VPIN avg |move|" value={`${vpinCorr.lowVpinAvgMove.toFixed(3)}%`} />
            <Stat label="Ratio" value={`${vpinCorr.ratio.toFixed(2)}x`}
              color={vpinCorr.ratio > 1.3 ? "text-[#eab308]" : undefined} />
            {vpinCorr.ratio > 1.3 && (
              <p className="text-[10px] text-[#eab308]">High VPIN precedes {vpinCorr.ratio.toFixed(1)}x larger moves</p>
            )}
            <p className="text-[8px] text-[#8888a0] mt-1">
              Directional gauge, not predictive. Andersen & Bondarenko (2014) note mechanical vol correlation.
            </p>
          </div>
        </Card>

        {/* Drawdowns */}
        <Card title="Worst Drawdowns">
          <div className="space-y-1">
            <Stat label="Max Drawdown" value={`${metrics.maxDrawdown.toFixed(1)}%`} color="text-[#ef4444]" />
            {metrics.drawdowns.slice(0, 3).map((dd, i) => (
              <div key={i} className="text-[10px] text-[#8888a0]">
                #{i + 1}: {dd.depth.toFixed(1)}% over {dd.duration} bars
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
