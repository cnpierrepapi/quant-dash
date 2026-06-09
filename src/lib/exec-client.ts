// Client for the execution server at exec.onenept.com

const EXEC_URL = "https://exec.onenept.com";
const API_KEY = "qd_exec_1da61f49cc053540094d5b09137c62fb";

async function execFetch(endpoint: string, body?: Record<string, unknown>) {
  const res = await fetch(`${EXEC_URL}${endpoint}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
  return data;
}

export async function testConnection(apiKey: string, apiSecret: string) {
  return execFetch("/api/test-connection", { apiKey, apiSecret }) as Promise<{
    success: boolean;
    balance: number;
    testnet: boolean;
    error?: string;
  }>;
}

export async function getBalance(apiKey: string, apiSecret: string) {
  return execFetch("/api/balance", { apiKey, apiSecret }) as Promise<{
    total: number;
    available: number;
    unrealized: number;
    margin: number;
  }>;
}

export async function getPositions(apiKey: string, apiSecret: string) {
  return execFetch("/api/positions", { apiKey, apiSecret }) as Promise<{
    symbol: string;
    side: "LONG" | "SHORT";
    size: number;
    entryPrice: number;
    markPrice: number;
    pnl: number;
    leverage: number;
    liquidationPrice: number;
  }[]>;
}

export async function executeTrade(params: {
  apiKey: string;
  apiSecret: string;
  action: "BUY" | "SELL" | "CLOSE";
  symbol: string;
  quantity?: number;
  positionPct?: number;
  leverage?: number;
  stopLossPct?: number;
  takeProfitPct?: number;
}) {
  return execFetch("/api/execute", params) as Promise<{
    success: boolean;
    message: string;
    orderId?: string;
    stopLoss?: number;
    takeProfit?: number;
    error?: string;
  }>;
}

export async function getTradeHistory() {
  return execFetch("/api/trades") as Promise<{
    id: number;
    symbol: string;
    side: string;
    type: string;
    quantity: number;
    price: number;
    realized_pnl: number;
    order_id: string;
    source: string;
    created_at: string;
  }[]>;
}

export async function getServerHealth() {
  return execFetch("/api/health") as Promise<{
    status: string;
    service: string;
    uptime: number;
  }>;
}
