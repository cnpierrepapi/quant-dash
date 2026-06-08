"use client";

import { useState } from "react";

export type SandboxStep = {
  instruction: string;
  validate: string;
  hint?: string;
};

export default function SandboxController({
  steps,
  completedSteps,
  onSolveStep,
}: {
  steps: SandboxStep[];
  completedSteps: Set<number>;
  onSolveStep?: (validate: string) => void;
}) {
  const [showHints, setShowHints] = useState<Set<number>>(new Set());

  if (steps.length === 0) return null;

  const currentStep = steps.findIndex((_, i) => !completedSteps.has(i));

  const handleHintClick = (i: number) => {
    setShowHints((prev) => new Set(prev).add(i));
    // Auto-solve: perform the action for the user
    if (onSolveStep) {
      onSolveStep(steps[i].validate);
    }
  };

  return (
    <div className="bg-[#111118] border border-[#2a2a3a] rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-[#8888a0] uppercase">Interactive Tutorial</span>
        <span className="text-[10px] text-[#8888a0]">
          {completedSteps.size}/{steps.length} completed
        </span>
      </div>

      <div className="w-full h-1 bg-[#1a1a24] rounded-full mb-3">
        <div
          className="h-full bg-[#6366f1] rounded-full transition-all"
          style={{ width: `${(completedSteps.size / steps.length) * 100}%` }}
        />
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => {
          const done = completedSteps.has(i);
          const active = i === currentStep;

          return (
            <div
              key={i}
              className={`flex items-start gap-2 text-xs p-2 rounded ${
                active ? "bg-[#6366f115] border border-[#6366f140]" :
                done ? "opacity-50" : "opacity-30"
              }`}
            >
              <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${
                done ? "bg-[#22c55e] text-white" :
                active ? "bg-[#6366f1] text-white animate-pulse" :
                "bg-[#2a2a3a] text-[#8888a0]"
              }`}>
                {done ? "\u2713" : i + 1}
              </span>
              <div className="flex-1">
                <p className={active ? "text-[#e8e8ef]" : "text-[#8888a0]"}>{step.instruction}</p>
                {active && step.hint && !showHints.has(i) && (
                  <button
                    onClick={() => handleHintClick(i)}
                    className="text-[10px] text-[#6366f1] mt-1 hover:text-[#818cf8]"
                  >
                    Do it for me
                  </button>
                )}
                {showHints.has(i) && step.hint && (
                  <p className="text-[10px] text-[#22c55e] mt-1">{step.hint}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {completedSteps.size === steps.length && (
        <div className="mt-3 text-center text-xs text-[#22c55e] font-medium bg-[#22c55e10] rounded py-2">
          Tutorial complete! You can keep exploring or move to the next lesson.
        </div>
      )}
    </div>
  );
}
