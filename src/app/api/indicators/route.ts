import { NextRequest, NextResponse } from "next/server";
import {
  type Candle,
  ema, sma, rsi, macd, bollinger, atr, vwap,
  supportResistance, parkinsonVol, vpinSimple, compositeScore,
} from "@/lib/indicators";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get("symbol") || "BTCUSDT";
  const interval = sp.get("interval") || "1h";
  const limit = sp.get("limit") || "500";

  // Fetch from Binance
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!Array.isArray(data)) {
    return NextResponse.json({ error: "Binance error" }, { status: 502 });
  }

  const candles: Candle[] = data.map((k: number[]) => ({
    time: Math.floor(k[0] / 1000),
    open: parseFloat(String(k[1])),
    high: parseFloat(String(k[2])),
    low: parseFloat(String(k[3])),
    close: parseFloat(String(k[4])),
    volume: parseFloat(String(k[5])),
    takerBuyVol: parseFloat(String(k[9])),
  }));

  const closes = candles.map((c) => c.close);

  const result = {
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    ema200: ema(closes, 200),
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    sma200: sma(closes, 200),
    rsi: rsi(closes, 14),
    macd: macd(closes),
    bollinger: bollinger(closes, 20, 2),
    atr: atr(candles, 14),
    vwap: vwap(candles),
    parkinsonVol: parkinsonVol(candles, 30),
    vpin: vpinSimple(candles, 50),
    supportResistance: supportResistance(candles, 20),
    composite: compositeScore(candles),
  };

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
  });
}
