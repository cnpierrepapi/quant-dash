import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get("symbol") || "BTCUSDT";
  const interval = sp.get("interval") || "1h";
  const limit = sp.get("limit") || "500";

  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

  const res = await fetch(url, { next: { revalidate: 30 } });
  const data = await res.json();

  if (!Array.isArray(data)) {
    return NextResponse.json({ error: "Binance API error", detail: data }, { status: 502 });
  }

  const candles = data.map((k: number[]) => ({
    time: Math.floor(k[0] / 1000),
    open: parseFloat(String(k[1])),
    high: parseFloat(String(k[2])),
    low: parseFloat(String(k[3])),
    close: parseFloat(String(k[4])),
    volume: parseFloat(String(k[5])),
    takerBuyVol: parseFloat(String(k[9])),
  }));

  return NextResponse.json(candles, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
