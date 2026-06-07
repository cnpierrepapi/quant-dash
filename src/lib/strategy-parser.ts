// Strategy DSL parser, .py file parser, and presets
// DSL syntax: buy when ema(20) crosses_above ema(50) and rsi(14) < 30

import {
  type Strategy, type Condition, type ConditionGroup, type Operand,
  type Operator, type SizingConfig, createEmptyStrategy, nextConditionId,
} from "./strategy-types";

// ─── Parse indicator reference ───
function parseIndicatorRef(token: string): Operand | null {
  // Match: ema(20), sma(50), rsi(14), atr(14), etc.
  const m = token.match(/^(ema|sma|rsi|atr|vwap|vpin|parkinson_vol|macd_histogram|bb_upper|bb_lower|bb_mid)\((\d+)\)$/i);
  if (m) {
    return { type: "indicator", ref: { name: m[1].toLowerCase(), params: [parseInt(m[2])] } };
  }
  // No-param indicators
  const noParen = token.toLowerCase();
  if (["vwap", "vpin", "macd_histogram", "bb_upper", "bb_lower", "bb_mid"].includes(noParen)) {
    const defaults: Record<string, number[]> = {
      vwap: [], vpin: [50], macd_histogram: [12, 26, 9],
      bb_upper: [20, 2], bb_lower: [20, 2], bb_mid: [20],
    };
    return { type: "indicator", ref: { name: noParen, params: defaults[noParen] || [] } };
  }
  if (noParen === "price" || noParen === "close") return { type: "price" };
  // Literal number
  const num = parseFloat(token);
  if (!isNaN(num)) return { type: "literal", value: num };
  return null;
}

// ─── Map operator tokens ───
function parseOperator(token: string): Operator | null {
  const map: Record<string, Operator> = {
    crosses_above: "crosses_above", crossesabove: "crosses_above", cross_above: "crosses_above",
    crosses_below: "crosses_below", crossesbelow: "crosses_below", cross_below: "crosses_below",
    ">": "is_above", is_above: "is_above", above: "is_above",
    "<": "is_below", is_below: "is_below", below: "is_below",
    "==": "equals", "=": "equals", equals: "equals",
  };
  return map[token.toLowerCase()] || null;
}

// ─── Parse DSL text into Strategy ───
export function parseDSL(text: string): Strategy {
  const strategy = createEmptyStrategy();
  const lines = text.trim().split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  let currentGroup: "entry" | "exit" = "entry";

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Detect section
    if (lower.startsWith("buy when") || lower.startsWith("entry:") || lower.startsWith("long when")) {
      currentGroup = "entry";
    } else if (lower.startsWith("sell when") || lower.startsWith("exit:") || lower.startsWith("close when")) {
      currentGroup = "exit";
    }

    // Strip prefixes
    let condText = line
      .replace(/^(buy|sell|entry|exit|long|close|short)\s+(when\s+)?/i, "")
      .replace(/^:\s*/, "")
      .trim();

    if (!condText) continue;

    // Determine logic
    const group = currentGroup === "entry" ? strategy.entryLong : strategy.exitLong;
    if (condText.toLowerCase().includes(" or ")) group.logic = "OR";

    // Split by AND/OR
    const parts = condText.split(/\s+(?:and|or)\s+/i);

    for (const part of parts) {
      const tokens = part.trim().split(/\s+/);
      if (tokens.length < 3) continue;

      const left = parseIndicatorRef(tokens[0]);
      const op = parseOperator(tokens[1]);
      const right = parseIndicatorRef(tokens.slice(2).join(""));

      if (left && op && right) {
        group.conditions.push({
          id: nextConditionId(),
          left, op, right,
        });
      }
    }
  }

  return strategy;
}

// ─── Parse Python-like strategy file ───
export function parsePython(text: string): Strategy {
  const strategy = createEmptyStrategy();

  // Look for common patterns in Python strategy files
  const lines = text.split("\n");

  for (const line of lines) {
    const l = line.trim().toLowerCase();

    // Match: if ema_20 > ema_50, if rsi < 30, etc.
    const ifMatch = l.match(/if\s+(\w+(?:\(\d+\))?)\s*([><=!]+)\s*(\w+(?:\(\d+\))?)/);
    if (ifMatch) {
      const leftToken = ifMatch[1].replace(/_/g, "(").replace(/(\d+)$/, "$1)").replace("((", "(");
      const opToken = ifMatch[2];
      const rightToken = ifMatch[3].replace(/_/g, "(").replace(/(\d+)$/, "$1)").replace("((", "(");

      const left = parseIndicatorRef(leftToken) || parseIndicatorRef(ifMatch[1]);
      const op = parseOperator(opToken);
      const right = parseIndicatorRef(rightToken) || parseIndicatorRef(ifMatch[3]);

      if (left && op && right) {
        // Guess entry vs exit from context
        const isBuy = l.includes("buy") || l.includes("long") || l.includes("entry");
        const group = isBuy ? strategy.exitLong : strategy.entryLong;
        // Default to entry if ambiguous
        (l.includes("sell") || l.includes("exit") ? strategy.exitLong : strategy.entryLong)
          .conditions.push({ id: nextConditionId(), left, op, right });
      }
    }
  }

  return strategy;
}

// ─── Serialize Strategy back to DSL ───
function operandToString(op: Operand): string {
  if (op.type === "price") return "price";
  if (op.type === "literal") return String(op.value);
  const { name, params } = op.ref;
  if (params.length === 0) return name;
  return `${name}(${params.join(",")})`;
}

function operatorToString(op: Operator): string {
  const map: Record<Operator, string> = {
    crosses_above: "crosses_above", crosses_below: "crosses_below",
    is_above: ">", is_below: "<", equals: "==",
  };
  return map[op];
}

export function strategyToDSL(strategy: Strategy): string {
  const lines: string[] = [];

  if (strategy.entryLong.conditions.length > 0) {
    const logic = ` ${strategy.entryLong.logic.toLowerCase()} `;
    const conds = strategy.entryLong.conditions.map((c) =>
      `${operandToString(c.left)} ${operatorToString(c.op)} ${operandToString(c.right)}`
    );
    lines.push(`buy when ${conds.join(logic)}`);
  }

  if (strategy.exitLong.conditions.length > 0) {
    const logic = ` ${strategy.exitLong.logic.toLowerCase()} `;
    const conds = strategy.exitLong.conditions.map((c) =>
      `${operandToString(c.left)} ${operatorToString(c.op)} ${operandToString(c.right)}`
    );
    lines.push(`sell when ${conds.join(logic)}`);
  }

  return lines.join("\n");
}

// ─── Preset Strategies ───
export const PRESETS: Record<string, Strategy> = {
  "Golden Cross": parseDSL("buy when ema(20) crosses_above ema(50)\nsell when ema(20) crosses_below ema(50)"),
  "RSI Oversold Bounce": parseDSL("buy when rsi(14) crosses_above 30\nsell when rsi(14) crosses_above 70"),
  "BB Mean Reversion": parseDSL("buy when price < bb_lower\nsell when price > bb_upper"),
  "MACD Cross": parseDSL("buy when macd_histogram crosses_above 0\nsell when macd_histogram crosses_below 0"),
};

// Set names
Object.entries(PRESETS).forEach(([name, s]) => { s.name = name; });
