"use client";

import dynamic from "next/dynamic";
import type { LessonContent } from "@/data/academy/lessons";

const ChartSandbox = dynamic(() => import("./sandboxes/ChartSandbox"), { ssr: false });
const RSISandbox = dynamic(() => import("./sandboxes/RSISandbox"), { ssr: false });
const StrategyLabSandbox = dynamic(() => import("./sandboxes/StrategyLabSandbox"), { ssr: false });

export default function SandboxWrapper({ content }: { content: LessonContent }) {
  switch (content.sandboxType) {
    case "rsi-chart":
      return <RSISandbox content={content} />;
    case "strategy-lab":
      return <StrategyLabSandbox content={content} />;
    case "chart":
    default:
      return <ChartSandbox content={content} />;
  }
}
