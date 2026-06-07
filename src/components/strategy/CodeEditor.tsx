"use client";

import { useRef } from "react";

export default function CodeEditor({
  dslText, onTextChange, onFileUpload, parseError,
}: {
  dslText: string;
  onTextChange: (text: string) => void;
  onFileUpload: (content: string, filename: string) => void;
  parseError: string | null;
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
        placeholder={`buy when ema(20) crosses_above ema(50) and rsi(14) < 30\nsell when ema(20) crosses_below ema(50)`}
        className="w-full h-28 bg-[#0a0a0f] text-[#e8e8ef] text-xs font-mono p-2 rounded border border-[#2a2a3a] resize-none focus:border-[#6366f1] focus:outline-none"
        spellCheck={false}
      />

      {parseError && (
        <div className="text-[10px] text-[#ef4444] bg-[#ef444410] px-2 py-1 rounded">{parseError}</div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="text-xs px-2 py-1 rounded bg-[#1a1a24] text-[#8888a0] hover:text-[#e8e8ef] border border-[#2a2a3a]"
        >
          Upload .py / .txt
        </button>
        <input ref={fileRef} type="file" accept=".py,.txt" onChange={handleFile} className="hidden" />
      </div>

      <p className="text-[10px] text-[#8888a0]">
        Syntax: buy when indicator op value [and/or ...]{"\n"}
        sell when indicator op value [and/or ...]
      </p>
    </div>
  );
}
