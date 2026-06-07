"use client";

import type { Strategy, Condition, ConditionGroup, Logic } from "@/lib/strategy-types";
import { nextConditionId } from "@/lib/strategy-types";
import ConditionRow from "./ConditionRow";

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
  return (
    <div className="space-y-3">
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
