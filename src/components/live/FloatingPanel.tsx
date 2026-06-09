"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export default function FloatingPanel({
  title, children, defaultPosition, onDock, visible,
}: {
  title: string;
  children: React.ReactNode;
  defaultPosition: { x: number; y: number };
  onDock: () => void;
  visible: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(defaultPosition);
  const [dragging, setDragging] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, input, select, textarea")) return;
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      className="absolute z-50 bg-[#111118] border border-[#2a2a3a] rounded-lg shadow-2xl shadow-black/50 max-w-[calc(100vw-32px)]"
      style={{ left: Math.min(pos.x, typeof window !== "undefined" ? window.innerWidth - 300 : pos.x), top: pos.y, width: collapsed ? 200 : 280 }}
    >
      {/* Title bar — draggable */}
      <div
        onMouseDown={onMouseDown}
        className={`flex items-center justify-between px-3 py-1.5 border-b border-[#2a2a3a] cursor-move select-none ${dragging ? "bg-[#1a1a24]" : ""}`}
      >
        <span className="text-[10px] font-bold text-[#8888a0] uppercase">{title}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-[10px] text-[#8888a0] hover:text-[#e8e8ef] px-1"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "+" : "\u2013"}
          </button>
          <button
            onClick={onDock}
            className="text-[10px] text-[#8888a0] hover:text-[#6366f1] px-1"
            title="Move to sidebar"
          >
            {"\u21E5"}
          </button>
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="p-3 max-h-[400px] overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}
