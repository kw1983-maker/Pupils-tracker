"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pen, Eraser, Undo2, Trash2, Hand } from "lucide-react";

type Pt = { x: number; y: number };
type Stroke = { mode: "draw" | "erase"; color: string; width: number; pts: Pt[] };

// Ink colours come from design tokens (resolved at runtime — no raw hex). The
// swatch buttons render with the matching Tailwind utility.
const INKS = [
  { key: "blue", var: "--color-mark-blue-ink", swatch: "bg-mark-blue-ink" },
  { key: "black", var: "--color-paper-900", swatch: "bg-paper-900" },
  { key: "red", var: "--color-danger", swatch: "bg-danger" },
  { key: "green", var: "--color-success", swatch: "bg-success" },
] as const;

const PEN_WIDTH = 3;
const ERASER_WIDTH = 32;

export function InkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }); // CSS px
  const strokesRef = useRef<Stroke[]>([]);
  const curRef = useRef<Stroke | null>(null);
  const drawingRef = useRef(false);

  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [colorVar, setColorVar] = useState<string>(INKS[0].var);
  const [penOnly, setPenOnly] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  const resolveColor = (v: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const drawSegment = (ctx: CanvasRenderingContext2D, s: Stroke, a: Pt, b: Pt) => {
    ctx.globalCompositeOperation = s.mode === "erase" ? "destination-out" : "source-over";
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, s: Stroke) => {
    if (s.pts.length === 0) return;
    if (s.pts.length === 1) {
      const p = s.pts[0];
      ctx.globalCompositeOperation = s.mode === "erase" ? "destination-out" : "source-over";
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s.width / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    for (let i = 1; i < s.pts.length; i++) drawSegment(ctx, s, s.pts[i - 1], s.pts[i]);
  };

  const redraw = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    ctx.clearRect(0, 0, w, h);
    for (const s of strokesRef.current) drawStroke(ctx, s);
    if (curRef.current) drawStroke(ctx, curRef.current);
    ctx.globalCompositeOperation = "source-over";
  }, []);

  // Size the backing store to the device pixel ratio for crisp lines, and
  // rescale any existing strokes when the board resizes (e.g. fullscreen).
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const prev = sizeRef.current;
    if (prev.w && prev.h && (prev.w !== w || prev.h !== h)) {
      const sx = w / prev.w;
      const sy = h / prev.h;
      for (const s of strokesRef.current)
        for (const p of s.pts) {
          p.x *= sx;
          p.y *= sy;
        }
    }
    sizeRef.current = { w, h };
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
    redraw();
  }, [redraw]);

  useEffect(() => {
    setupCanvas();
    const ro = new ResizeObserver(() => setupCanvas());
    const canvas = canvasRef.current;
    if (canvas) ro.observe(canvas);
    return () => ro.disconnect();
  }, [setupCanvas]);

  const pointFromEvent = (e: PointerEvent | React.PointerEvent): Pt => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (penOnly && e.pointerType === "touch") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const stroke: Stroke = {
      mode: tool === "eraser" ? "erase" : "draw",
      color: resolveColor(colorVar),
      width: tool === "eraser" ? ERASER_WIDTH : PEN_WIDTH,
      pts: [pointFromEvent(e)],
    };
    curRef.current = stroke;
    const ctx = ctxRef.current;
    if (ctx) drawStroke(ctx, stroke); // dot for a tap
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !curRef.current) return;
    const ctx = ctxRef.current;
    const stroke = curRef.current;
    const native = e.nativeEvent;
    const events =
      typeof native.getCoalescedEvents === "function"
        ? native.getCoalescedEvents()
        : [native];
    for (const ev of events) {
      const next = pointFromEvent(ev);
      const prev = stroke.pts[stroke.pts.length - 1];
      stroke.pts.push(next);
      if (ctx && prev) drawSegment(ctx, stroke, prev, next);
    }
    if (ctx) ctx.globalCompositeOperation = "source-over";
  };

  const endStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (curRef.current && curRef.current.pts.length) {
      strokesRef.current.push(curRef.current);
      setCanUndo(true);
    }
    curRef.current = null;
  };

  const undo = () => {
    strokesRef.current.pop();
    setCanUndo(strokesRef.current.length > 0);
    redraw();
  };

  const clear = () => {
    strokesRef.current = [];
    setCanUndo(false);
    redraw();
  };

  const pickColor = (v: string) => {
    setColorVar(v);
    setTool("pen");
  };

  // Shared styling for the toolbar's icon buttons.
  const toolBtn = (active: boolean) =>
    `flex h-9 w-9 items-center justify-center rounded-lg outline-none transition-colors focus-visible:shadow-ring ${
      active
        ? "bg-brand-500 text-surface"
        : "text-paper-500 hover:bg-paper-100 hover:text-paper-700"
    }`;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 h-full w-full cursor-crosshair touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={endStroke}
      />

      <div
        className="absolute bottom-4 left-4 z-30 flex flex-wrap items-center gap-1 rounded-card border border-paper-100 bg-surface/95 p-1.5 shadow-float backdrop-blur"
        role="toolbar"
        aria-label="Writing tools"
      >
        <button
          type="button"
          onClick={() => setTool("pen")}
          aria-label="Pen"
          aria-pressed={tool === "pen"}
          className={toolBtn(tool === "pen")}
        >
          <Pen className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setTool("eraser")}
          aria-label="Eraser"
          aria-pressed={tool === "eraser"}
          className={toolBtn(tool === "eraser")}
        >
          <Eraser className="h-4 w-4" />
        </button>

        <span className="mx-1 h-6 w-px bg-paper-200" aria-hidden />

        {INKS.map((ink) => {
          const active = tool === "pen" && colorVar === ink.var;
          return (
            <button
              key={ink.key}
              type="button"
              onClick={() => pickColor(ink.var)}
              aria-label={`${ink.key} ink`}
              aria-pressed={active}
              className={`flex h-9 w-9 items-center justify-center rounded-lg outline-none transition-colors focus-visible:shadow-ring ${
                active ? "bg-paper-100" : "hover:bg-paper-100"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full ${ink.swatch} ${
                  active ? "ring-2 ring-paper-400 ring-offset-1" : ""
                }`}
              />
            </button>
          );
        })}

        <span className="mx-1 h-6 w-px bg-paper-200" aria-hidden />

        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          aria-label="Undo"
          className={`${toolBtn(false)} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={clear}
          aria-label="Clear all"
          className={toolBtn(false)}
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setPenOnly((v) => !v)}
          aria-label="Pen only (ignore touch)"
          aria-pressed={penOnly}
          title="Pen only — ignore finger/palm touches"
          className={toolBtn(penOnly)}
        >
          <Hand className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
