"use client";

type Tab = { key: string; label: string };

export default function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            active === t.key
              ? "bg-[#6366f1] text-white"
              : "text-[#8888a0] hover:text-[#e8e8ef] hover:bg-[#1a1a24]"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
