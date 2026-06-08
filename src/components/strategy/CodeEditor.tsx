"use client";

import { useRef } from "react";

const PINE_PLACEHOLDER = `//@version=5
strategy("My Strategy", overlay=true)

fast = ta.ema(close, 20)
slow = ta.ema(close, 50)

if ta.crossover(fast, slow)
    strategy.entry("Long", strategy.long)

if ta.crossunder(fast, slow)
    strategy.close("Long")`;

const DSL_PLACEHOLDER = `buy when ema(20) crosses_above ema(50) and rsi(14) > 30
sell when ema(20) crosses_below ema(50)`;

export default function CodeEditor({
  dslText, onTextChange, onFileUpload, parseError, sourceFormat,
}: {
  dslText: string;
  onTextChange: (text: string) => void;
  onFileUpload: (content: string, filename: string) => void;
  parseError: string | null;
  sourceFormat?: "dsl" | "pine" | "py";
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    onFileUpload(text, file.name);
  };

  return (
    <div className="space-y-2">
      <textarea
        value={dslText}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={DSL_PLACEHOLDER + "\n\n// — or paste Pine Script —\n\n" + PINE_PLACEHOLDER}
        className="w-full h-36 bg-[#0a0a0f] text-[#e8e8ef] text-xs font-mono p-2 rounded border border-[#2a2a3a] resize-none focus:border-[#6366f1] focus:outline-none"
        spellCheck={false}
      />

      {parseError && (
        <div className="text-[10px] text-[#ef4444] bg-[#ef444410] px-2 py-1 rounded">{parseError}</div>
      )}

      {dslText.length > 0 && sourceFormat && (
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            sourceFormat === "pine" ? "bg-[#6366f120] text-[#6366f1]" :
            sourceFormat === "py" ? "bg-[#22c55e20] text-[#22c55e]" :
            "bg-[#8888a020] text-[#8888a0]"
          }`}>
            {sourceFormat === "pine" ? "Pine Script" : sourceFormat === "py" ? "Python" : "DSL"}
          </span>
          <span className="text-[10px] text-[#8888a0]">auto-detected</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="text-xs px-2 py-1 rounded bg-[#1a1a24] text-[#8888a0] hover:text-[#e8e8ef] border border-[#2a2a3a]"
        >
          Upload .pine / .py / .txt
        </button>
        <input ref={fileRef} type="file" accept=".pine,.py,.txt,.pinescript" onChange={handleFile} className="hidden" />
      </div>

      <div className="text-[10px] text-[#8888a0] space-y-0.5">
        <p><span className="text-[#6366f1]">DSL:</span> buy when ema(20) crosses_above ema(50)</p>
        <p><span className="text-[#6366f1]">Pine:</span> ta.crossover(ta.ema(close, 20), ta.ema(close, 50))</p>
      </div>
    </div>
  );
}
