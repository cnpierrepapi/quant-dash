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
import {
  type Candle as IndicatorCandle,
  ema, sma, rsi, macd, bollinger, atr, vwap,
  supportResistance, parkinsonVol, vpinSimple, compositeScore,
} from "@/lib/indicators";

// ── Types ──
type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  takerBuyVol: number;
};

type IndicatorData = {
  ema20: (number | null)[];
  ema50: (number | null)[];
  ema200: (number | null)[];
  sma20: (number | null)[];
  sma50: (number | null)[];
  sma200: (number | null)[];
  rsi: (number | null)[];
  macd: { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] };
  bollinger: { upper: (number | null)[]; mid: (number | null)[]; lower: (number | null)[] };
  atr: (number | null)[];
  vwap: (number | null)[];
  parkinsonVol: (number | null)[];
  vpin: (number | null)[];
  supportResistance: { price: number; type: string; strength: number }[];
  composite: {
    score: number;
    signals: Record<string, { value: number; weight: number; label: string }>;
    verdict: string;
  };
};

const SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "AVAXUSDT",
  "ADAUSDT", "DOGEUSDT", "LINKUSDT", "XRPUSDT", "DOTUSDT",
];

const INTERVALS = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
];

const POLL_INTERVALS: Record<string, number> = {
  "1m": 5000,
  "5m": 10000,
  "15m": 15000,
  "1h": 30000,
  "4h": 60000,
  "1d": 120000,
  "1w": 300000,
};

const OVERLAY_OPTIONS = [
  { key: "ema20", label: "EMA 20", color: "#f59e0b" },
  { key: "ema50", label: "EMA 50", color: "#3b82f6" },
  { key: "ema200", label: "EMA 200", color: "#ef4444" },
  { key: "sma20", label: "SMA 20", color: "#f59e0b", dash: true },
  { key: "sma50", label: "SMA 50", color: "#3b82f6", dash: true },
  { key: "sma200", label: "SMA 200", color: "#ef4444", dash: true },
  { key: "vwap", label: "VWAP", color: "#a855f7" },
  { key: "bbUpper", label: "BB Upper", color: "#6366f1" },
  { key: "bbLower", label: "BB Lower", color: "#6366f1" },
];

export default function Chart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartApi = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);
  const overlaySeries = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const srLines = useRef<ISeriesApi<"Line">[]>([]);
  const pollRef = useRef<number | null>(null);
  const candlesRef = useRef<Candle[]>([]);

  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("1h");
  const [indicators, setIndicators] = useState<IndicatorData | null>(null);
  const [overlays, setOverlays] = useState<Set<string>>(new Set(["ema20", "ema50"]));
  const [showSR, setShowSR] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);

  // ── Fetch data direct from Binance (no server proxy needed) ──
  const fetchData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);

      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`
      );
      const raw = await res.json();

      if (!Array.isArray(raw)) {
        setLoading(false);
        return null;
      }

      const candles: Candle[] = raw.map((k: number[]) => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(String(k[1])),
        high: parseFloat(String(k[2])),
        low: parseFloat(String(k[3])),
        close: parseFloat(String(k[4])),
        volume: parseFloat(String(k[5])),
        takerBuyVol: parseFloat(String(k[9])),
      }));

      // Compute indicators client-side
      const indCandles: IndicatorCandle[] = candles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        takerBuyVol: c.takerBuyVol ?? 0,
      }));
      const closes = candles.map((c) => c.close);

      const inds: IndicatorData = {
        ema20: ema(closes, 20),
        ema50: ema(closes, 50),
        ema200: ema(closes, 200),
        sma20: sma(closes, 20),
        sma50: sma(closes, 50),
        sma200: sma(closes, 200),
        rsi: rsi(closes, 14),
        macd: macd(closes),
        bollinger: bollinger(closes, 20, 2),
        atr: atr(indCandles, 14),
        vwap: vwap(indCandles),
        parkinsonVol: parkinsonVol(indCandles, 30),
        vpin: vpinSimple(indCandles, 50),
        supportResistance: supportResistance(indCandles, 20),
        composite: compositeScore(indCandles),
      };

      candlesRef.current = candles;
      setIndicators(inds);
      setLastUpdate(new Date());
      setLoading(false);

      if (candles.length > 1) {
        const last = candles[candles.length - 1].close;
        const prev = candles[candles.length - 2].close;
        setCurrentPrice(last);
        setPriceChange(((last - prev) / prev) * 100);
      }

      return { candles, inds };
    } catch {
      setLoading(false);
      return null;
    }
  }, [symbol, interval]);

  // ── Build chart ──
  const buildChart = useCallback((candles: Candle[], inds: IndicatorData) => {
    if (!chartRef.current) return;

    // Destroy old chart
    if (chartApi.current) {
      chartApi.current.remove();
      chartApi.current = null;
      overlaySeries.current.clear();
      srLines.current = [];
    }

    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0a0a0f" },
        textColor: "#8888a0",
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1a1a24" },
        horzLines: { color: "#1a1a24" },
      },
      crosshair: {
        vertLine: { color: "#6366f1", width: 1, style: LineStyle.Dashed },
        horzLine: { color: "#6366f1", width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: "#2a2a3a",
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: "#2a2a3a",
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight,
    });

    chartApi.current = chart;

    // Candlesticks
    const cs = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    cs.setData(
      candles.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })) as CandlestickData[]
    );
    candleSeries.current = cs;

    // Volume
    const vs = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    vs.setData(
      candles.map((c) => ({
        time: c.time as Time,
        value: c.volume,
        color: c.close >= c.open ? "#22c55e40" : "#ef444440",
      })) as HistogramData[]
    );
    volumeSeries.current = vs;

    // Apply overlays
    updateOverlays(candles, inds);

    chart.timeScale().fitContent();

    // Resize
    const ro = new ResizeObserver(() => {
      if (chartRef.current && chart) {
        chart.applyOptions({
          width: chartRef.current.clientWidth,
          height: chartRef.current.clientHeight,
        });
      }
    });
    ro.observe(chartRef.current);

    return () => ro.disconnect();
  }, []);

  // ── Update overlays ──
  const updateOverlays = useCallback((candles: Candle[], inds: IndicatorData) => {
    if (!chartApi.current) return;
    const chart = chartApi.current;

    // Remove old overlay series
    overlaySeries.current.forEach((s) => {
      try { chart.removeSeries(s); } catch { /* already removed */ }
    });
    overlaySeries.current.clear();
    srLines.current.forEach((s) => {
      try { chart.removeSeries(s); } catch { /* already removed */ }
    });
    srLines.current = [];

    const addLine = (key: string, data: (number | null)[], color: string, dashed = false) => {
      if (!overlays.has(key)) return;
      const series = chart.addLineSeries({
        color,
        lineWidth: 1,
        lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      const lineData: LineData[] = [];
      for (let i = 0; i < candles.length; i++) {
        if (data[i] !== null) {
          lineData.push({ time: candles[i].time as Time, value: data[i]! });
        }
      }
      series.setData(lineData);
      overlaySeries.current.set(key, series);
    };

    addLine("ema20", inds.ema20, "#f59e0b");
    addLine("ema50", inds.ema50, "#3b82f6");
    addLine("ema200", inds.ema200, "#ef4444");
    addLine("sma20", inds.sma20, "#f59e0b", true);
    addLine("sma50", inds.sma50, "#3b82f6", true);
    addLine("sma200", inds.sma200, "#ef4444", true);
    addLine("vwap", inds.vwap, "#a855f7");
    addLine("bbUpper", inds.bollinger.upper, "#6366f1");
    addLine("bbLower", inds.bollinger.lower, "#6366f1");

    // S/R lines
    if (showSR && inds.supportResistance) {
      for (const level of inds.supportResistance.slice(0, 6)) {
        const s = chart.addLineSeries({
          color: level.type === "support" ? "#22c55e50" : "#ef444450",
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          priceLineVisible: false,
          lastValueVisible: true,
          crosshairMarkerVisible: false,
        });
        const ld: LineData[] = [
          { time: candles[0].time as Time, value: level.price },
          { time: candles[candles.length - 1].time as Time, value: level.price },
        ];
        s.setData(ld);
        srLines.current.push(s);
      }
    }
  }, [overlays, showSR]);

  // ── Initial load ──
  useEffect(() => {
    (async () => {
      const result = await fetchData(true);
      if (result) {
        buildChart(result.candles, result.inds);
      }
    })();
  }, [fetchData, buildChart]);

  // ── Polling ──
  useEffect(() => {
    if (pollRef.current) window.clearInterval(pollRef.current);

    const pollInterval = POLL_INTERVALS[interval] || 30000;
    const cb = async () => {
      const result = await fetchData(false);
      if (result && candleSeries.current) {
        const newCandles = result.candles.map((c) => ({
          time: c.time as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })) as CandlestickData[];
        candleSeries.current.setData(newCandles);

        if (volumeSeries.current) {
          volumeSeries.current.setData(
            result.candles.map((c) => ({
              time: c.time as Time,
              value: c.volume,
              color: c.close >= c.open ? "#22c55e40" : "#ef444440",
            })) as HistogramData[]
          );
        }

        updateOverlays(result.candles, result.inds);
      }
    };
    pollRef.current = window.setInterval(cb, pollInterval);

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [interval, fetchData, updateOverlays]);

  // ── Overlay toggle ──
  const toggleOverlay = (key: string) => {
    setOverlays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Re-apply overlays when selection changes
  useEffect(() => {
    if (candlesRef.current.length && indicators) {
      updateOverlays(candlesRef.current, indicators);
    }
  }, [overlays, showSR, indicators, updateOverlays]);

  const composite = indicators?.composite;

  return (
    <div className="flex flex-col h-screen">
      {/* ── Top Bar ── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#2a2a3a] bg-[#111118]">
        <span className="text-sm font-bold text-[#6366f1]">QuantDash</span>
        <div className="h-4 w-px bg-[#2a2a3a]" />

        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="bg-[#1a1a24] text-sm px-2 py-1 rounded border border-[#2a2a3a] text-[#e8e8ef]"
        >
          {SYMBOLS.map((s) => (
            <option key={s} value={s}>{s.replace("USDT", "/USDT")}</option>
          ))}
        </select>

        <div className="flex gap-1">
          {INTERVALS.map((i) => (
            <button
              key={i.value}
              onClick={() => setInterval(i.value)}
              className={`px-2 py-1 text-xs rounded ${
                interval === i.value
                  ? "bg-[#6366f1] text-white"
                  : "bg-[#1a1a24] text-[#8888a0] hover:text-[#e8e8ef]"
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-[#2a2a3a]" />

        {currentPrice !== null && (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-sm font-medium ${priceChange >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
              {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2 text-xs text-[#8888a0]">
          {loading && <span className="animate-pulse text-[#eab308]">fetching...</span>}
          {lastUpdate && (
            <span>
              updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" title="Live polling" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Chart ── */}
        <div className="flex-1 relative">
          <div ref={chartRef} className="absolute inset-0" />
        </div>

        {/* ── Right Panel ── */}
        <div className="w-72 border-l border-[#2a2a3a] bg-[#111118] overflow-y-auto">
          {/* Overlays */}
          <div className="p-3 border-b border-[#2a2a3a]">
            <h3 className="text-xs font-bold text-[#8888a0] uppercase mb-2">Overlays</h3>
            <div className="grid grid-cols-2 gap-1">
              {OVERLAY_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  onClick={() => toggleOverlay(o.key)}
                  className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                    overlays.has(o.key)
                      ? "bg-[#1a1a24] text-[#e8e8ef] border border-[#2a2a3a]"
                      : "text-[#8888a0] hover:text-[#e8e8ef]"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: o.color }} />
                  {o.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSR(!showSR)}
              className={`mt-1 text-xs px-2 py-1 rounded w-full text-left ${
                showSR ? "bg-[#1a1a24] text-[#e8e8ef] border border-[#2a2a3a]" : "text-[#8888a0]"
              }`}
            >
              S/R Levels
            </button>
          </div>

          {/* Composite Score */}
          {composite && (
            <div className="p-3 border-b border-[#2a2a3a]">
              <h3 className="text-xs font-bold text-[#8888a0] uppercase mb-2">Academic Composite</h3>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`text-3xl font-bold ${
                    composite.score > 15 ? "text-[#22c55e]" : composite.score < -15 ? "text-[#ef4444]" : "text-[#eab308]"
                  }`}
                >
                  {composite.score > 0 ? "+" : ""}{composite.score}
                </div>
                <div>
                  <div className={`text-sm font-bold ${
                    composite.verdict.includes("BUY") ? "text-[#22c55e]" :
                    composite.verdict.includes("SELL") ? "text-[#ef4444]" : "text-[#eab308]"
                  }`}>
                    {composite.verdict}
                  </div>
                  <div className="text-xs text-[#8888a0]">weighted signal</div>
                </div>
              </div>

              {/* Score bar */}
              <div className="w-full h-2 bg-[#1a1a24] rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.abs(composite.score) / 2 + 50}%`,
                    marginLeft: composite.score < 0 ? `${50 - Math.abs(composite.score) / 2}%` : "50%",
                    background: composite.score > 0 ? "#22c55e" : "#ef4444",
                  }}
                />
              </div>

              {/* Individual signals */}
              <div className="space-y-1">
                {Object.entries(composite.signals).map(([key, sig]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-[#8888a0] capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                    <div className="flex items-center gap-2">
                      <span className={
                        sig.value > 15 ? "text-[#22c55e]" :
                        sig.value < -15 ? "text-[#ef4444]" : "text-[#eab308]"
                      }>
                        {sig.label}
                      </span>
                      <span className="text-[#8888a0] w-8 text-right">
                        {Math.round(sig.weight * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Indicators */}
          {indicators && (
            <div className="p-3 border-b border-[#2a2a3a]">
              <h3 className="text-xs font-bold text-[#8888a0] uppercase mb-2">Indicators</h3>
              <div className="space-y-2 text-xs">
                {/* RSI */}
                {(() => {
                  const r = indicators.rsi[indicators.rsi.length - 1];
                  if (r === null) return null;
                  return (
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-[#8888a0]">RSI (14)</span>
                        <span className={r > 70 ? "text-[#ef4444]" : r < 30 ? "text-[#22c55e]" : "text-[#e8e8ef]"}>
                          {r.toFixed(1)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#1a1a24] rounded-full">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${r}%`,
                            background: r > 70 ? "#ef4444" : r < 30 ? "#22c55e" : "#6366f1",
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* ATR */}
                {(() => {
                  const a = indicators.atr[indicators.atr.length - 1];
                  if (a === null) return null;
                  return (
                    <div className="flex justify-between">
                      <span className="text-[#8888a0]">ATR (14)</span>
                      <span>${a.toFixed(2)}</span>
                    </div>
                  );
                })()}

                {/* Parkinson Vol */}
                {(() => {
                  const pv = indicators.parkinsonVol[indicators.parkinsonVol.length - 1];
                  if (pv === null) return null;
                  return (
                    <div className="flex justify-between">
                      <span className="text-[#8888a0]">Parkinson Vol</span>
                      <span>{pv.toFixed(1)}%</span>
                    </div>
                  );
                })()}

                {/* VPIN */}
                {(() => {
                  const v = indicators.vpin[indicators.vpin.length - 1];
                  if (v === null) return null;
                  return (
                    <div className="flex justify-between">
                      <span className="text-[#8888a0]">VPIN</span>
                      <span className={v > 0.45 ? "text-[#ef4444] font-bold" : ""}>
                        {v.toFixed(3)} {v > 0.45 ? "TOXIC" : ""}
                      </span>
                    </div>
                  );
                })()}

                {/* MACD */}
                {(() => {
                  const h = indicators.macd.histogram[indicators.macd.histogram.length - 1];
                  if (h === null) return null;
                  return (
                    <div className="flex justify-between">
                      <span className="text-[#8888a0]">MACD Hist</span>
                      <span className={h > 0 ? "text-[#22c55e]" : "text-[#ef4444]"}>
                        {h > 0 ? "+" : ""}{h.toFixed(2)}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* S/R Levels */}
          {indicators?.supportResistance && (
            <div className="p-3 border-b border-[#2a2a3a]">
              <h3 className="text-xs font-bold text-[#8888a0] uppercase mb-2">Support / Resistance</h3>
              <div className="space-y-1 text-xs">
                {indicators.supportResistance.slice(0, 6).map((level, i) => (
                  <div key={i} className="flex justify-between">
                    <span className={level.type === "support" ? "text-[#22c55e]" : "text-[#ef4444]"}>
                      {level.type === "support" ? "S" : "R"}
                    </span>
                    <span>${level.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    <span className="text-[#8888a0]">×{level.strength}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Research Notes */}
          <div className="p-3">
            <h3 className="text-xs font-bold text-[#8888a0] uppercase mb-2">Research Notes</h3>
            <div className="text-xs text-[#8888a0] space-y-2">
              <p>
                <span className="text-[#6366f1]">Parkinson (1980)</span> — Range-based vol estimator.
                ~5x more efficient than close-to-close. Uses high-low range.
              </p>
              <p>
                <span className="text-[#6366f1]">VPIN</span> — Easley, López de Prado (2012).
                Order flow toxicity. High VPIN predicts larger price moves.
              </p>
              <p>
                <span className="text-[#6366f1]">Composite</span> — Weighted signal from trend, momentum,
                MACD, volatility regime, order flow, Bollinger position, and volume.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
