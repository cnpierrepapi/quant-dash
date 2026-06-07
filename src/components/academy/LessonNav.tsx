"use client";

import Link from "next/link";

export default function LessonNav({
  prev, next, moduleName,
}: {
  prev: { module: string; lesson: string } | null;
  next: { module: string; lesson: string } | null;
  moduleName: string;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-t border-[#2a2a3a] mt-8">
      {prev ? (
        <Link
          href={`/academy/${prev.module}/${prev.lesson}`}
          className="text-xs text-[#6366f1] hover:text-[#818cf8]"
        >
          Previous
        </Link>
      ) : <div />}

      <Link href="/academy" className="text-xs text-[#8888a0] hover:text-[#e8e8ef]">
        {moduleName}
      </Link>

      {next ? (
        <Link
          href={`/academy/${next.module}/${next.lesson}`}
          className="text-xs text-[#6366f1] hover:text-[#818cf8]"
        >
          Next
        </Link>
      ) : <div />}
    </div>
  );
}
