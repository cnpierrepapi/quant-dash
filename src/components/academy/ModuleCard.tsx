"use client";

import Link from "next/link";
import type { ModuleMeta } from "@/data/academy/index";

export default function ModuleCard({ module }: { module: ModuleMeta }) {
  return (
    <Link
      href={`/academy/${module.slug}/${module.lessons[0].slug}`}
      className="block bg-[#111118] border border-[#2a2a3a] rounded-lg p-5 hover:border-[#6366f1] transition-colors group"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="w-8 h-8 rounded-lg bg-[#6366f1] text-white flex items-center justify-center text-sm font-bold">
          {module.icon}
        </span>
        <h3 className="text-base font-bold text-[#e8e8ef] group-hover:text-[#6366f1] transition-colors">
          {module.title}
        </h3>
      </div>
      <p className="text-xs text-[#8888a0] mb-3">{module.description}</p>
      <div className="text-xs text-[#6366f1]">{module.lessons.length} lessons</div>
    </Link>
  );
}
