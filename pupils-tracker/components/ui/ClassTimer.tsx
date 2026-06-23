"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlarmClock,
  Play,
  Pause,
  RotateCcw,
  X,
  BellRing,
  GripVertical,
} from "lucide-react";
import { Button } from "./Button";
import { fieldClassName } from "./Field";
import { useTimerContext } from "@/lib/useTimer";

function format(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ClassTimer() {
  const { status, remainingMs, open, setOpen, startMinutes, pause, resume, reset } =
    useTimerContext();
  const [customMin, setCustomMin] = useState("");

  // Drag-to-reposition state — local to each instance (mutually exclusive renders)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
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

  // Re-clamp on window resize so the timer doesn't go off-screen.
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

  const startCustom = () => {
    const min = parseFloat(customMin);
    if (Number.isFinite(min) && min > 0) startMinutes(min);
  };

  const isDone = status === "done";
  const isActive = status === "running" || status === "paused";

  return (
    <div
      ref={rootRef}
      className={`flex flex-col items-end gap-2 ${pos ? "fixed z-40 print:hidden" : ""}`}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
    >
      {open && (
        <div
          className={`card w-64 rounded-card p-4 shadow-float ${
            isDone ? "bg-danger-bg motion-reduce:animate-none animate-pulse" : ""
          }`}
          role="group"
          aria-label="Classroom timer"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-paper-400">
              <AlarmClock className="h-3.5 w-3.5" /> Timer
            </h2>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close timer panel"
              className="rounded-md p-1 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-600 focus-visible:shadow-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Countdown / status display */}
          {isDone ? (
            <div className="mb-3 text-center" role="alert">
              <BellRing className="mx-auto h-7 w-7 text-danger" />
              <p className="mt-1 font-display text-2xl font-bold text-danger">
                Time&apos;s up!
              </p>
            </div>
          ) : isActive ? (
            <p
              className="mb-3 text-center font-display text-5xl font-bold tabular-nums text-paper-800"
              aria-live="off"
            >
              {format(remainingMs)}
            </p>
          ) : null}

          {/* Controls */}
          {isDone ? (
            <Button variant="danger" size="sm" className="w-full" onClick={reset}>
              Dismiss
            </Button>
          ) : isActive ? (
            <div className="flex gap-2">
              {status === "running" ? (
                <Button variant="secondary" size="sm" className="flex-1" onClick={pause}>
                  <Pause className="h-4 w-4" /> Pause
                </Button>
              ) : (
                <Button size="sm" className="flex-1" onClick={resume}>
                  <Play className="h-4 w-4" /> Resume
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={reset} aria-label="Reset timer">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[1, 3, 5, 10, 15].map((m) => (
                  <Button
                    key={m}
                    variant="secondary"
                    size="sm"
                    onClick={() => startMinutes(m)}
                  >
                    {m} min
                  </Button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  startCustom();
                }}
                className="flex gap-2"
              >
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={customMin}
                  onChange={(e) => setCustomMin(e.target.value)}
                  placeholder="Minutes"
                  aria-label="Custom minutes"
                  className={`w-full ${fieldClassName}`}
                />
                <Button type="submit" size="sm">
                  <Play className="h-4 w-4" /> Start
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Launcher + drag grip */}
      <div className="flex items-end gap-1.5">
        <button
          type="button"
          aria-label="Move timer"
          title="Drag to move · double-click to reset"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={() => setPos(null)}
          className="flex h-8 w-5 cursor-grab touch-none items-center justify-center rounded-lg text-paper-400 opacity-60 outline-none transition-colors hover:text-paper-700 focus-visible:shadow-ring active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Hide timer" : "Show timer"}
          className={`flex h-12 items-center gap-2 rounded-full px-4 font-display font-bold tabular-nums shadow-float outline-none transition-colors focus-visible:shadow-ring ${
            isDone
              ? "bg-danger text-surface motion-reduce:animate-none animate-pulse"
              : "bg-brand-500 text-surface hover:bg-brand-600"
          }`}
        >
          <AlarmClock className="h-5 w-5" />
          {isActive || isDone ? (
            <span className="text-base">
              {isDone ? "0:00" : format(remainingMs)}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
