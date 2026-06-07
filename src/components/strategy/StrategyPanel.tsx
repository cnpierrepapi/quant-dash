"use client";

import { useState } from "react";
import type { Strategy } from "@/lib/strategy-types";
import Tabs from "@/components/ui/Tabs";
import VisualBuilder from "./VisualBuilder";
import CodeEditor from "./CodeEditor";

const STRATEGY_TABS = [
  { key: "visual", label: "Visual" },
  { key: "code", label: "Code" },
];

export default function StrategyPanel({
  strategy, dslText, parseError,
  onBuilderChange, onDSLChange, onFileUpload,
  presetNames, onLoadPreset,
  onRunBacktest, backtestRunning,
}: {
  strategy: Strategy;
  dslText: string;
  parseError: string | null;
  onBuilderChange: (s: Strategy) => void;
  onDSLChange: (text: string) => void;
  onFileUpload: (content: string, filename: string) => void;
  presetNames: string[];
  onLoadPreset: (name: string) => void;
  onRunBacktest: () => void;
  backtestRunning: boolean;
}) {
  const [tab, setTab] = useState("visual");

  return (
    <div className="border-t border-[#2a2a3a] bg-[#111118]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a3a]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#8888a0] uppercase">Strategy</span>
          <Tabs tabs={STRATEGY_TABS} active={tab} onChange={setTab} />
        </div>

        <div className="flex items-center gap-2">
          <select
            onChange={(e) => { if (e.target.value) onLoadPreset(e.target.value); e.target.value = ""; }}
            className="bg-[#1a1a24] text-xs px-2 py-1 rounded border border-[#2a2a3a] text-[#8888a0]"
            defaultValue=""
          >
            <option value="" disabled>Presets</option>
            {presetNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>

          <button
            onClick={onRunBacktest}
            disabled={backtestRunning || strategy.entryLong.conditions.length === 0}
            className={`text-xs px-3 py-1 rounded font-medium ${
              backtestRunning
                ? "bg-[#eab308] text-black"
                : strategy.entryLong.conditions.length === 0
                  ? "bg-[#1a1a24] text-[#8888a0] cursor-not-allowed"
                  : "bg-[#22c55e] text-black hover:bg-[#16a34a]"
            }`}
          >
            {backtestRunning ? "Running..." : "Run Backtest"}
          </button>
        </div>
      </div>

      <div className="p-4 max-h-64 overflow-y-auto">
        {tab === "visual" && (
          <VisualBuilder strategy={strategy} onChange={onBuilderChange} />
        )}
        {tab === "code" && (
          <CodeEditor
            dslText={dslText}
            onTextChange={onDSLChange}
            onFileUpload={onFileUpload}
            parseError={parseError}
          />
        )}
      </div>
    </div>
  );
}
