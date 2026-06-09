"use client";

import type { Strategy, Condition, ConditionGroup } from "@/lib/strategy-types";
import { nextConditionId } from "@/lib/strategy-types";
import ConditionRow from "./ConditionRow";

// Quick-add templates — one-tap to add a pre-filled condition
const QUICK_ADD: { label: string; entry: Condition; exit: Condition }[] = [
  {
    label: "RSI Bounce",
    entry: { id: "", left: { type: "indicator", ref: { name: "rsi", params: [14] } }, op: "crosses_above", right: { type: "literal", value: 30 } },
    exit: { id: "", left: { type: "indicator", ref: { name: "rsi", params: [14] } }, op: "crosses_above", right: { type: "literal", value: 70 } },
  },
  {
    label: "EMA Cross",
    entry: { id: "", left: { type: "indicator", ref: { name: "ema", params: [20] } }, op: "crosses_above", right: { type: "indicator", ref: { name: "ema", params: [50] } } },
    exit: { id: "", left: { type: "indicator", ref: { name: "ema", params: [20] } }, op: "crosses_below", right: { type: "indicator", ref: { name: "ema", params: [50] } } },
  },
  {
    label: "MACD Cross",
    entry: { id: "", left: { type: "indicator", ref: { name: "macd_histogram", params: [] } }, op: "crosses_above", right: { type: "literal", value: 0 } },
    exit: { id: "", left: { type: "indicator", ref: { name: "macd_histogram", params: [] } }, op: "crosses_below", right: { type: "literal", value: 0 } },
  },
  {
    label: "BB Breakout",
    entry: { id: "", left: { type: "price" }, op: "is_below", right: { type: "indicator", ref: { name: "bb_lower", params: [20, 2] } } },
    exit: { id: "", left: { type: "price" }, op: "is_above", right: { type: "indicator", ref: { name: "bb_upper", params: [20, 2] } } },
  },
  {
    label: "VWAP Cross",
    entry: { id: "", left: { type: "price" }, op: "crosses_above", right: { type: "indicator", ref: { name: "vwap", params: [] } } },
    exit: { id: "", left: { type: "price" }, op: "crosses_below", right: { type: "indicator", ref: { name: "vwap", params: [] } } },
  },
  {
    label: "ATR Volatility",
    entry: { id: "", left: { type: "indicator", ref: { name: "atr", params: [14] } }, op: "is_above", right: { type: "literal", value: 100 } },
    exit: { id: "", left: { type: "indicator", ref: { name: "atr", params: [14] } }, op: "is_below", right: { type: "literal", value: 50 } },
  },
];

function GroupEditor({
  label, group, onChange,
}: {
  label: string;
  group: ConditionGroup;
  onChange: (g: ConditionGroup) => void;
}) {
  const addCondition = () => {
    onChange({
      ...group,
      conditions: [
        ...group.conditions,
        {
          id: nextConditionId(),
          left: { type: "indicator", ref: { name: "ema", params: [20] } },
          op: "crosses_above",
          right: { type: "indicator", ref: { name: "ema", params: [50] } },
        },
      ],
    });
  };

  const updateCondition = (idx: number, c: Condition) => {
    const next = [...group.conditions];
    next[idx] = c;
    onChange({ ...group, conditions: next });
  };

  const removeCondition = (idx: number) => {
    onChange({ ...group, conditions: group.conditions.filter((_, i) => i !== idx) });
  };

  const toggleLogic = () => {
    onChange({ ...group, logic: group.logic === "AND" ? "OR" : "AND" });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#8888a0] uppercase">{label}</span>
        {group.conditions.length > 1 && (
          <button
            onClick={toggleLogic}
            className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a24] text-[#6366f1] border border-[#2a2a3a]"
          >
            {group.logic}
          </button>
        )}
      </div>

      {group.conditions.map((c, i) => (
        <div key={c.id}>
          {i > 0 && (
            <div className="text-[10px] text-[#8888a0] text-center py-0.5">{group.logic}</div>
          )}
          <ConditionRow
            condition={c}
            onChange={(updated) => updateCondition(i, updated)}
            onRemove={() => removeCondition(i)}
          />
        </div>
      ))}

      <button
        onClick={addCondition}
        className="w-full text-xs px-2 py-1 rounded border border-dashed border-[#2a2a3a] text-[#8888a0] hover:text-[#e8e8ef] hover:border-[#6366f1]"
      >
        + Add condition
      </button>
    </div>
  );
}

export default function VisualBuilder({
  strategy, onChange,
}: {
  strategy: Strategy;
  onChange: (s: Strategy) => void;
}) {
  const handleQuickAdd = (qa: typeof QUICK_ADD[number]) => {
    onChange({
      ...strategy,
      name: qa.label,
      entryLong: {
        ...strategy.entryLong,
        conditions: [...strategy.entryLong.conditions, { ...qa.entry, id: nextConditionId() }],
      },
      exitLong: {
        ...strategy.exitLong,
        conditions: [...strategy.exitLong.conditions, { ...qa.exit, id: nextConditionId() }],
      },
    });
  };

  const isEmpty = strategy.entryLong.conditions.length === 0 && strategy.exitLong.conditions.length === 0;

  return (
    <div className="space-y-3">
      {/* Quick-add buttons — visible when strategy is empty or always as add-ons */}
      {isEmpty && (
        <div>
          <div className="text-[10px] text-[#8888a0] uppercase font-bold mb-1.5">Quick Add</div>
          <div className="flex flex-wrap gap-1">
            {QUICK_ADD.map((qa) => (
              <button
                key={qa.label}
                onClick={() => handleQuickAdd(qa)}
                className="text-[10px] px-2 py-1 rounded bg-[#1a1a24] text-[#6366f1] border border-[#2a2a3a] hover:bg-[#6366f120] hover:border-[#6366f1] transition-colors"
              >
                {qa.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isEmpty && (
        <div className="flex flex-wrap gap-1 mb-1">
          <span className="text-[10px] text-[#8888a0]">Add:</span>
          {QUICK_ADD.map((qa) => (
            <button
              key={qa.label}
              onClick={() => handleQuickAdd(qa)}
              className="text-[9px] px-1.5 py-0.5 rounded text-[#8888a0] hover:text-[#6366f1] hover:bg-[#6366f110]"
            >
              +{qa.label}
            </button>
          ))}
        </div>
      )}

      <GroupEditor
        label="Entry (Long)"
        group={strategy.entryLong}
        onChange={(g) => onChange({ ...strategy, entryLong: g })}
      />
      <div className="border-t border-[#2a2a3a]" />
      <GroupEditor
        label="Exit"
        group={strategy.exitLong}
        onChange={(g) => onChange({ ...strategy, exitLong: g })}
      />
    </div>
  );
}
