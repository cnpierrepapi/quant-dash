// Strategy DSL parser, Pine Script parser, .py file parser, and presets
// DSL syntax: buy when ema(20) crosses_above ema(50) and rsi(14) < 30
// Pine: ta.crossover(ta.ema(close, 20), ta.ema(close, 50)) => strategy.entry(...)

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

// ─── Detect if text is Pine Script ───
export function isPineScript(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("//@version") ||
    lower.includes("strategy(") ||
    lower.includes("ta.crossover") ||
    lower.includes("ta.crossunder") ||
    lower.includes("ta.ema") ||
    lower.includes("ta.sma") ||
    lower.includes("ta.rsi") ||
    lower.includes("strategy.entry") ||
    lower.includes("strategy.close")
  );
}

// ─── Parse Pine Script indicator expression ───
// Resolves: ta.ema(close, 20), ta.sma(close, 50), ta.rsi(close, 14),
//           ta.atr(14), ta.vwap, ta.macd, ta.bb(close, 20, 2)
function resolvePineIndicator(expr: string, vars: Map<string, Operand>): Operand | null {
  const e = expr.trim();

  // Check variable references first
  if (vars.has(e)) return vars.get(e)!;

  // close / open / high / low
  if (e === "close" || e === "open" || e === "high" || e === "low") return { type: "price" };

  // Literal number
  const num = parseFloat(e);
  if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(e)) return { type: "literal", value: num };

  // ta.ema(close, 20) / ta.sma(close, 50)
  const emaMatch = e.match(/^ta\.(ema|sma)\s*\(\s*\w+\s*,\s*(\d+)\s*\)$/i);
  if (emaMatch) return { type: "indicator", ref: { name: emaMatch[1].toLowerCase(), params: [parseInt(emaMatch[2])] } };

  // ta.rsi(close, 14) or ta.rsi(14)
  const rsiMatch = e.match(/^ta\.rsi\s*\(\s*(?:\w+\s*,\s*)?(\d+)\s*\)$/i);
  if (rsiMatch) return { type: "indicator", ref: { name: "rsi", params: [parseInt(rsiMatch[1])] } };

  // ta.atr(14)
  const atrMatch = e.match(/^ta\.atr\s*\(\s*(\d+)\s*\)$/i);
  if (atrMatch) return { type: "indicator", ref: { name: "atr", params: [parseInt(atrMatch[1])] } };

  // ta.vwap or ta.vwap(close)
  if (/^ta\.vwap/i.test(e)) return { type: "indicator", ref: { name: "vwap", params: [] } };

  // ta.macd(close, 12, 26, 9) — returns histogram
  if (/^ta\.macd/i.test(e)) return { type: "indicator", ref: { name: "macd_histogram", params: [12, 26, 9] } };

  // ta.bb(close, 20, 2) — we'll map to bb_upper by default
  if (/^ta\.bb/i.test(e)) return { type: "indicator", ref: { name: "bb_upper", params: [20, 2] } };

  // input.int(20) or input(20) — treat as literal
  const inputMatch = e.match(/^input(?:\.\w+)?\s*\(\s*(\d+)/i);
  if (inputMatch) return { type: "literal", value: parseInt(inputMatch[1]) };

  return null;
}

// ─── Parse Pine Script ───
export function parsePine(text: string): Strategy {
  const strategy = createEmptyStrategy();
  const lines = text.split("\n").map((l) => l.trim());

  // Phase 1: Resolve variable assignments
  // e.g., fast = ta.ema(close, 20)
  const vars = new Map<string, Operand>();

  for (const line of lines) {
    if (line.startsWith("//") || line.startsWith("#")) continue;

    const assignMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (assignMatch) {
      const varName = assignMatch[1].toLowerCase();
      const expr = assignMatch[2].replace(/\/\/.*$/, "").trim();

      // Skip strategy() / indicator() declarations
      if (expr.startsWith("strategy(") || expr.startsWith("indicator(")) continue;

      const resolved = resolvePineIndicator(expr, vars);
      if (resolved) vars.set(varName, resolved);
    }
  }

  // Phase 2: Find conditions and strategy actions
  // Track which context we're building conditions for
  let pendingConditions: Condition[] = [];
  let pendingTarget: "entry" | "exit" | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const l = line.toLowerCase().replace(/\/\/.*$/, "").trim();
    if (!l || l.startsWith("//") || l.startsWith("#")) continue;

    // ta.crossover(a, b) in an if-statement
    const crossoverMatch = l.match(/ta\.crossover\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/);
    const crossunderMatch = l.match(/ta\.crossunder\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/);

    if (crossoverMatch || crossunderMatch) {
      const match = crossoverMatch || crossunderMatch;
      const op: Operator = crossoverMatch ? "crosses_above" : "crosses_below";
      const leftExpr = match![1].trim();
      const rightExpr = match![2].trim();

      const left = resolvePineIndicator(leftExpr, vars);
      const right = resolvePineIndicator(rightExpr, vars);

      if (left && right) {
        const cond: Condition = { id: nextConditionId(), left, op, right };

        // Look at same line + next lines for strategy.entry / strategy.close
        const context = [l, ...lines.slice(i + 1, i + 3).map((x) => x.toLowerCase())].join(" ");

        if (context.includes("strategy.entry")) {
          strategy.entryLong.conditions.push(cond);
        } else if (context.includes("strategy.close") || context.includes("strategy.exit")) {
          strategy.exitLong.conditions.push(cond);
        } else {
          // Guess: crossover = entry, crossunder = exit
          if (crossoverMatch) strategy.entryLong.conditions.push(cond);
          else strategy.exitLong.conditions.push(cond);
        }
      }
      continue;
    }

    // Simple comparison: if fast > slow, if rsi_val < 70, etc.
    const compMatch = l.match(/if\s+(\w+)\s*([><=!]+)\s*(\w+[\d.]*)/);
    if (compMatch) {
      const left = resolvePineIndicator(compMatch[1], vars);
      const opToken = compMatch[2];
      const right = resolvePineIndicator(compMatch[3], vars);
      const op = parseOperator(opToken);

      if (left && op && right) {
        const cond: Condition = { id: nextConditionId(), left, op, right };
        const context = [l, ...lines.slice(i + 1, i + 3).map((x) => x.toLowerCase())].join(" ");

        if (context.includes("strategy.entry")) {
          strategy.entryLong.conditions.push(cond);
        } else if (context.includes("strategy.close") || context.includes("strategy.exit")) {
          strategy.exitLong.conditions.push(cond);
        } else {
          strategy.entryLong.conditions.push(cond);
        }
      }
    }
  }

  // Extract strategy name from strategy() call
  const nameMatch = text.match(/strategy\s*\(\s*["']([^"']+)["']/);
  if (nameMatch) strategy.name = nameMatch[1];

  return strategy;
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
  // Trend following
  "Golden Cross": parseDSL("buy when ema(20) crosses_above ema(50)\nsell when ema(20) crosses_below ema(50)"),
  "Triple EMA": parseDSL("buy when ema(20) crosses_above ema(50) and ema(50) > ema(200)\nsell when ema(20) crosses_below ema(50)"),
  "SMA Trend": parseDSL("buy when sma(20) crosses_above sma(50)\nsell when sma(20) crosses_below sma(50)"),
  // Momentum
  "RSI Oversold Bounce": parseDSL("buy when rsi(14) crosses_above 30\nsell when rsi(14) crosses_above 70"),
  "RSI + EMA Filter": parseDSL("buy when rsi(14) crosses_above 30 and ema(20) > ema(50)\nsell when rsi(14) crosses_above 70"),
  "MACD Cross": parseDSL("buy when macd_histogram crosses_above 0\nsell when macd_histogram crosses_below 0"),
  "MACD + RSI Filter": parseDSL("buy when macd_histogram crosses_above 0 and rsi(14) > 40\nsell when macd_histogram crosses_below 0"),
  // Mean reversion
  "BB Mean Reversion": parseDSL("buy when price < bb_lower\nsell when price > bb_upper"),
  "BB + RSI Oversold": parseDSL("buy when price < bb_lower and rsi(14) < 30\nsell when price > bb_mid"),
  // Volume / Flow
  "VWAP Bounce": parseDSL("buy when price crosses_above vwap\nsell when price crosses_below vwap"),
  "VPIN Toxicity Exit": parseDSL("buy when rsi(14) crosses_above 30\nsell when vpin > 0.45"),
};

// Set names
Object.entries(PRESETS).forEach(([name, s]) => { s.name = name; });
