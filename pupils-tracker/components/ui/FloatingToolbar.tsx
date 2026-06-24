"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical, ChevronRight, ChevronLeft } from "lucide-react";
import { PupilPicker } from "./PupilPicker";
import { MonitorControl } from "./MonitorControl";
import { ClassControl } from "./ClassControl";
import { ClassTimer } from "./ClassTimer";

export function FloatingToolbar() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const grabRef = useRef<{ dx: number; dy: number } | null>(null);

  const clamp = useCallback((x: number, y: number) => {
    const el = rootRef.current;
    if (!el) return { x, y };
    return {
      x: Math.min(Math.max(x, 0), window.innerWidth - el.offsetWidth),
      y: Math.min(Math.max(y, 0), window.innerHeight - el.offsetHeight),
    };
  }, []);

  useEffect(() => {
    if (!pos) return;
    const onResize = () => setPos((p) => (p ? clamp(p.x, p.y) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pos, clamp]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    grabRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const grab = grabRef.current;
    if (!grab) return;
    setPos(clamp(e.clientX - grab.dx, e.clientY - grab.dy));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    grabRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={rootRef}
      className={`z-40 flex items-end gap-2 print:hidden ${
        pos ? "fixed" : "fixed bottom-4 right-4 sm:right-8"
      }`}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
    >
      {/* Tools — slide in/out */}
      <div
        className={`flex flex-col items-end gap-2 overflow-hidden transition-all duration-200 ${
          collapsed ? "w-0 opacity-0 pointer-events-none" : "w-auto opacity-100"
        }`}
      >
        {/* Drag grip */}
        <button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={() => setPos(null)}
          className="touch-none cursor-grab active:cursor-grabbing self-center rounded p-1 text-paper-300 outline-none transition-colors hover:bg-paper-100 hover:text-paper-500 focus-visible:shadow-ring"
          aria-label="Drag toolbar — double-click to reset position"
          title="Drag — double-click to reset"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <PupilPicker />
        <MonitorControl />
        <ClassControl />
        <ClassTimer />
      </div>

      {/* Collapse / expand tab */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex h-16 w-5 items-center justify-center rounded-l-md bg-surface/80 shadow-float backdrop-blur outline-none transition-colors hover:bg-surface focus-visible:shadow-ring"
        aria-label={collapsed ? "Expand tools" : "Collapse tools"}
        title={collapsed ? "Expand tools" : "Collapse tools"}
      >
        {collapsed ? (
          <ChevronLeft className="h-3.5 w-3.5 text-paper-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-paper-400" />
        )}
      </button>
    </div>
  );
}
