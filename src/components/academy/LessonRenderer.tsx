"use client";

import dynamic from "next/dynamic";
import type { LessonContent } from "@/data/academy/lessons";
import LessonNav from "./LessonNav";

const SandboxWrapper = dynamic(() => import("./SandboxWrapper"), { ssr: false });

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={key++} className="bg-[#0a0a0f] border border-[#2a2a3a] rounded p-3 text-xs text-[#e8e8ef] overflow-x-auto my-3">
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith("# ")) {
      elements.push(<h1 key={key++} className="text-xl font-bold text-[#e8e8ef] mb-4 mt-6">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} className="text-base font-bold text-[#e8e8ef] mb-2 mt-5">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={key++} className="text-sm font-bold text-[#e8e8ef] mb-1 mt-4">{line.slice(4)}</h3>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const content = line.slice(2);
      elements.push(
        <div key={key++} className="flex gap-2 text-sm text-[#e8e8ef] ml-2 my-0.5">
          <span className="text-[#6366f1]">-</span>
          <span dangerouslySetInnerHTML={{ __html: inlineFormat(content) }} />
        </div>
      );
    } else if (line.startsWith("| ")) {
      // Table row
      const cells = line.split("|").filter((c) => c.trim()).map((c) => c.trim());
      if (line.includes("---")) {
        // Table separator — skip
      } else {
        elements.push(
          <div key={key++} className="flex text-xs text-[#8888a0] border-b border-[#1a1a24] py-0.5">
            {cells.map((cell, i) => (
              <span key={i} className="flex-1 px-2">{cell}</span>
            ))}
          </div>
        );
      }
    } else if (line.startsWith("- [ ]")) {
      elements.push(
        <div key={key++} className="flex items-center gap-2 text-sm text-[#8888a0] ml-2 my-0.5">
          <span className="w-3 h-3 border border-[#2a2a3a] rounded-sm" />
          <span>{line.slice(5)}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      elements.push(
        <p key={key++} className="text-sm text-[#e8e8ef] leading-relaxed my-1"
          dangerouslySetInnerHTML={{ __html: inlineFormat(line) }}
        />
      );
    }
  }

  return elements;
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#e8e8ef] font-bold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-[#8888a0]">$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-[#1a1a24] px-1 py-0.5 rounded text-[#6366f1] text-xs">$1</code>');
}

export default function LessonRenderer({
  title, content, prev, next, moduleName,
}: {
  title: string;
  content: LessonContent;
  prev: { module: string; lesson: string } | null;
  next: { module: string; lesson: string } | null;
  moduleName: string;
}) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="text-xs text-[#6366f1] mb-1">{moduleName}</div>
        <h1 className="text-2xl font-bold text-[#e8e8ef]">{title}</h1>
      </div>

      <div className="space-y-0">
        {renderMarkdown(content.body)}
      </div>

      {/* Interactive sandbox */}
      <SandboxWrapper content={content} />

      <LessonNav prev={prev} next={next} moduleName={moduleName} />
    </div>
  );
}
