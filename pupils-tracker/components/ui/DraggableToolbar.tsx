"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";

/**
 * Floating toolbar shell for the board. Sits at `defaultClassName` until the
 * teacher drags it by the grip handle — then it's positioned in px within its
 * offsetParent (the board), clamped to stay fully visible. Double-click the
 * grip to snap back to the default spot.
 */
export function DraggableToolbar({
  ariaLabel,
  defaultClassName,
  children,
}: {
  ariaLabel: string;
  /** Position classes used until the toolbar is dragged, e.g. "bottom-4 left-4". */
  defaultClassName: string;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // Pointer offset from the toolbar's top-left corner while dragging.
  const grabRef = useRef<{ dx: number; dy: number } | null>(null);

  const clamp = useCallback((x: number, y: number) => {
    const el = rootRef.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return { x, y };
    return {
      x: Math.min(Math.max(x, 0), Math.max(parent.clientWidth - el.offsetWidth, 0)),
      y: Math.min(Math.max(y, 0), Math.max(parent.clientHeight - el.offsetHeight, 0)),
    };
  }, []);

  // Keep a dragged toolbar on the board when it resizes (fullscreen Present
  // mode enter/exit, window resize).
  useEffect(() => {
    if (!pos) return;
    const parent = rootRef.current?.offsetParent as HTMLElement | null;
    if (!parent) return;
    const observer = new ResizeObserver(() => {
      setPos((p) => (p ? clamp(p.x, p.y) : p));
    });
    observer.observe(parent);
    return () => observer.disconnect();
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
    const el = rootRef.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!grab || !el || !parent) return;
    const parentRect = parent.getBoundingClientRect();
    setPos(
      clamp(
        e.clientX - parentRect.left - grab.dx,
        e.clientY - parentRect.top - grab.dy
      )
    );
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    grabRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={rootRef}
      className={`absolute z-30 flex items-center gap-1 rounded-card border border-paper-100 bg-surface/95 p-1.5 shadow-float backdrop-blur ${
        pos ? "" : defaultClassName
      }`}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
      role="toolbar"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        aria-label="Move toolbar"
        title="Drag to move · double-click to reset"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => setPos(null)}
        className="flex h-9 w-5 cursor-grab touch-none items-center justify-center rounded-lg text-paper-400 outline-none transition-colors hover:text-paper-700 focus-visible:shadow-ring active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}
