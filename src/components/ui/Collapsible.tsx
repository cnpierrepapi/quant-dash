"use client";

import { useState } from "react";

export default function Collapsible({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#2a2a3a]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-xs font-bold text-[#8888a0] uppercase hover:text-[#e8e8ef] transition-colors"
      >
        {title}
        <span className={`transition-transform ${open ? "rotate-0" : "-rotate-90"}`}>
          ▼
        </span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
