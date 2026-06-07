// Core type definitions for strategy, conditions, and trades

export type IndicatorRef = {
  name: string;   // 'ema', 'sma', 'rsi', 'macd_histogram', 'bb_upper', 'bb_lower', 'bb_mid', 'atr', 'vwap', 'vpin', 'parkinson_vol'
  params: number[]; // e.g., [20] for ema(20), [14] for rsi(14)
};

export type Operand =
  | { type: "indicator"; ref: IndicatorRef }
  | { type: "literal"; value: number }
  | { type: "price" }; // current close price

export type Operator = "crosses_above" | "crosses_below" | "is_above" | "is_below" | "equals";

export type Condition = {
  id: string;
  left: Operand;
  op: Operator;
  right: Operand;
};

export type Logic = "AND" | "OR";

export type ConditionGroup = {
  conditions: Condition[];
  logic: Logic;
};

export type SizingMethod = "fixed" | "half_kelly" | "vol_scaled";

export type SizingConfig = {
  method: SizingMethod;
  fixedSize: number;     // dollars per trade (for fixed)
  kellyLookback: number; // bars for Kelly estimation
  volTarget: number;     // annualized vol target (for vol_scaled)
};

export type Strategy = {
  name: string;
  entryLong: ConditionGroup;
  exitLong: ConditionGroup;
  sizing: SizingConfig;
};

export type TradeDirection = "long" | "short";

export type Trade = {
  entryTime: number;
  exitTime: number;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
  duration: number; // in bars
  entryBar: number;
  exitBar: number;
};

export type BacktestResult = {
  trades: Trade[];
  equityCurve: { time: number; equity: number }[];
  totalReturn: number;
  winRate: number;
  totalTrades: number;
};

// Default empty strategy
export function createEmptyStrategy(): Strategy {
  return {
    name: "Untitled Strategy",
    entryLong: { conditions: [], logic: "AND" },
    exitLong: { conditions: [], logic: "AND" },
    sizing: { method: "fixed", fixedSize: 1000, kellyLookback: 60, volTarget: 0.4 },
  };
}

// Generate unique ID for conditions
let _condId = 0;
export function nextConditionId(): string {
  return `cond_${++_condId}_${Date.now()}`;
}
