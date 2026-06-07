"use client";

import type { Condition, Operand, Operator } from "@/lib/strategy-types";

const INDICATORS = [
  { value: "price", label: "Price" },
  { value: "ema_20", label: "EMA(20)" }, { value: "ema_50", label: "EMA(50)" }, { value: "ema_200", label: "EMA(200)" },
  { value: "sma_20", label: "SMA(20)" }, { value: "sma_50", label: "SMA(50)" }, { value: "sma_200", label: "SMA(200)" },
  { value: "rsi_14", label: "RSI(14)" },
  { value: "macd_histogram", label: "MACD Hist" },
  { value: "bb_upper", label: "BB Upper" }, { value: "bb_lower", label: "BB Lower" }, { value: "bb_mid", label: "BB Mid" },
  { value: "atr_14", label: "ATR(14)" },
  { value: "vwap", label: "VWAP" },
  { value: "vpin", label: "VPIN" },
];

const OPERATORS: { value: Operator; label: string }[] = [
  { value: "crosses_above", label: "crosses above" },
  { value: "crosses_below", label: "crosses below" },
  { value: "is_above", label: ">" },
  { value: "is_below", label: "<" },
  { value: "equals", label: "=" },
];

function tokenToOperand(token: string): Operand {
  if (token === "price") return { type: "price" };
  const num = parseFloat(token);
  if (!isNaN(num)) return { type: "literal", value: num };
  const parts = token.split("_");
  const name = parts[0];
  const param = parts.length > 1 ? parseInt(parts[1]) : 0;
  return { type: "indicator", ref: { name, params: param ? [param] : [] } };
}

function operandToToken(op: Operand): string {
  if (op.type === "price") return "price";
  if (op.type === "literal") return String(op.value);
  const { name, params } = op.ref;
  return params.length > 0 ? `${name}_${params[0]}` : name;
}

export default function ConditionRow({
  condition, onChange, onRemove,
}: {
  condition: Condition;
  onChange: (c: Condition) => void;
  onRemove: () => void;
}) {
  const leftToken = operandToToken(condition.left);
  const rightToken = operandToToken(condition.right);
  const isRightLiteral = condition.right.type === "literal";

  return (
    <div className="flex items-center gap-1 text-xs">
      <select
        value={leftToken}
        onChange={(e) => onChange({ ...condition, left: tokenToOperand(e.target.value) })}
        className="bg-[#1a1a24] px-1 py-1 rounded border border-[#2a2a3a] text-[#e8e8ef] flex-1 min-w-0"
      >
        {INDICATORS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
      </select>

      <select
        value={condition.op}
        onChange={(e) => onChange({ ...condition, op: e.target.value as Operator })}
        className="bg-[#1a1a24] px-1 py-1 rounded border border-[#2a2a3a] text-[#e8e8ef]"
      >
        {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {isRightLiteral ? (
        <input
          type="number"
          value={condition.right.type === "literal" ? condition.right.value : ""}
          onChange={(e) => onChange({ ...condition, right: { type: "literal", value: parseFloat(e.target.value) || 0 } })}
          className="bg-[#1a1a24] px-1 py-1 rounded border border-[#2a2a3a] text-[#e8e8ef] w-16"
          step="any"
        />
      ) : (
        <select
          value={rightToken}
          onChange={(e) => onChange({ ...condition, right: tokenToOperand(e.target.value) })}
          className="bg-[#1a1a24] px-1 py-1 rounded border border-[#2a2a3a] text-[#e8e8ef] flex-1 min-w-0"
        >
          {INDICATORS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          <option value="0">Literal</option>
        </select>
      )}

      <button onClick={onRemove} className="text-[#8888a0] hover:text-[#ef4444] px-1" title="Remove">x</button>
    </div>
  );
}
