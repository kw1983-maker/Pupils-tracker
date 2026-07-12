"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pen,
  Highlighter,
  Type,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Hand,
  Minus,
  MoveUpRight,
  Square,
  Circle,
  Triangle,
  Crosshair,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { DraggableToolbar } from "@/components/ui/DraggableToolbar";

type Pt = { x: number; y: number };

// Everything drawn on the board. Strokes with `alpha` are highlighter marks;
// erase strokes punch pixels out of whatever was drawn before them.
type StrokeItem = {
  kind: "stroke";
  mode: "draw" | "erase";
  color: string;
  width: number;
  alpha?: number;
  pts: Pt[];
};
type TextItem = {
  kind: "text";
  x: number; // top-left, CSS px (drawn with textBaseline "top")
  y: number;
  text: string;
  color: string;
  size: number;
};
type ShapeKind = "line" | "arrow" | "rect" | "ellipse" | "triangle";
type ShapeItem = {
  kind: "shape";
  shape: ShapeKind;
  color: string;
  width: number;
  a: Pt;
  b: Pt;
};
type Item = StrokeItem | TextItem | ShapeItem;

// Undo/redo as an operation stack: "add" entries alias the same Item object
// that sits in the page's items array; "clear" keeps a backup of everything
// removed so Clear is undoable.
type HistoryEntry = { type: "add"; item: Item } | { type: "clear"; items: Item[] };
type History = { undo: HistoryEntry[]; redo: HistoryEntry[] };

// Ink colours come from design tokens (resolved at runtime — no raw hex). The
// swatch buttons render with the matching Tailwind utility.
const INKS = [
  { key: "blue", var: "--color-mark-blue-ink", swatch: "bg-mark-blue-ink" },
  { key: "black", var: "--color-paper-900", swatch: "bg-paper-900" },
  { key: "red", var: "--color-danger", swatch: "bg-danger" },
  { key: "green", var: "--color-success", swatch: "bg-success" },
  { key: "amber", var: "--color-mark-amber-ink", swatch: "bg-mark-amber-ink" },
  { key: "purple", var: "--color-mark-purple-ink", swatch: "bg-mark-purple-ink" },
  { key: "pink", var: "--color-mark-pink-ink", swatch: "bg-mark-pink-ink" },
] as const;

// Highlighter needs saturated colours — the pale mark-* fills vanish at low
// alpha over a white board.
const HIGHLIGHTS = [
  { key: "yellow", var: "--color-warning", swatch: "bg-warning" },
  { key: "pink", var: "--color-mark-pink-ink", swatch: "bg-mark-pink-ink" },
  { key: "green", var: "--color-success", swatch: "bg-success" },
  { key: "blue", var: "--color-mark-blue-ink", swatch: "bg-mark-blue-ink" },
  { key: "orange", var: "--color-mark-orange-ink", swatch: "bg-mark-orange-ink" },
] as const;

const SIZES = {
  thin: { pen: 2, hl: 10, text: 24, dot: 4 },
  medium: { pen: 3, hl: 14, text: 32, dot: 7 },
  thick: { pen: 6, hl: 22, text: 48, dot: 11 },
} as const;
type SizeKey = keyof typeof SIZES;

const ERASER_WIDTH = 32;
const HL_ALPHA = 0.35;

const SHAPES: { key: ShapeKind; label: string; Icon: typeof Minus }[] = [
  { key: "line", label: "Line", Icon: Minus },
  { key: "arrow", label: "Arrow", Icon: MoveUpRight },
  { key: "rect", label: "Rectangle", Icon: Square },
  { key: "ellipse", label: "Ellipse", Icon: Circle },
  { key: "triangle", label: "Triangle", Icon: Triangle },
];

type Tool = "pen" | "highlighter" | "eraser" | "text" | "shape" | "laser";

/** Hold Shift while dragging a shape to snap angles / force a square-ish box. */
function constrainShapePoint(shape: ShapeKind, a: Pt, b: Pt): Pt {
  if (shape === "line" || shape === "arrow") {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const snapped =
      (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI) / 4;
    return {
      x: a.x + dist * Math.cos(snapped),
      y: a.y + dist * Math.sin(snapped),
    };
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const side = Math.max(Math.abs(dx), Math.abs(dy));
  return {
    x: a.x + Math.sign(dx || 1) * side,
    y: a.y + Math.sign(dy || 1) * side,
  };
}

export function InkCanvas({
  pageKey = "default",
  active = true,
  resetToken = 0,
}: {
  pageKey?: string;
  /** False while the board is mounted but hidden behind another tab —
      keyboard shortcuts must not fire there. */
  active?: boolean;
  /** Bump to wipe the ink and history of every page (Blank canvas). */
  resetToken?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }); // CSS px
  // Items are kept per page key so each PDF page/slide remembers its own
  // annotations. `itemsRef` always aliases the active page's array — all
  // mutations must be in-place (push/pop/splice) so the Map entry stays live.
  const pagesRef = useRef<Map<string, Item[]>>(new Map());
  const itemsRef = useRef<Item[]>([]);
  // Per-page undo/redo stacks; `histRef` aliases the active page's entry.
  const historyRef = useRef<Map<string, History>>(new Map());
  const histRef = useRef<History>({ undo: [], redo: [] });
  const curRef = useRef<Item | null>(null);
  const drawingRef = useRef(false);

  const [tool, setTool] = useState<Tool>("pen");
  const [colorVar, setColorVar] = useState<string>(INKS[0].var);
  const [hlVar, setHlVar] = useState<string>(HIGHLIGHTS[0].var);
  const [size, setSize] = useState<SizeKey>("medium");
  const [shape, setShape] = useState<ShapeKind>("line");
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [penOnly, setPenOnly] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // Collapsed mini-pill; Present (fullscreen) auto-collapses for a clear board.
  const [collapsed, setCollapsed] = useState(false);
  // Teaching laser — follows the pointer, never committed to ink history.
  const [laserPos, setLaserPos] = useState<Pt | null>(null);
  const [laserHot, setLaserHot] = useState(false);

  // Text tool: where the in-progress input sits, mirrored in a ref so
  // commit/cancel stay idempotent across Enter, blur, and canvas taps (any
  // of which may fire for the same session, in any order).
  const [editing, setEditing] = useState<Pt | null>(null);
  const editingRef = useRef<Pt | null>(null);
  const editSessionRef = useRef(0); // keys the input so each session remounts fresh
  const inputRef = useRef<HTMLInputElement | null>(null);
  const shapeWrapRef = useRef<HTMLDivElement | null>(null);

  const resolveVar = (v: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const drawSegment = (ctx: CanvasRenderingContext2D, s: StrokeItem, a: Pt, b: Pt) => {
    ctx.globalCompositeOperation = s.mode === "erase" ? "destination-out" : "source-over";
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };

  // Whole stroke as a single path so translucent (highlighter) strokes don't
  // get dark blobs where segments would overlap.
  const drawStroke = (ctx: CanvasRenderingContext2D, s: StrokeItem) => {
    if (s.pts.length === 0) return;
    ctx.globalCompositeOperation = s.mode === "erase" ? "destination-out" : "source-over";
    ctx.globalAlpha = s.alpha ?? 1;
    if (s.pts.length === 1) {
      const p = s.pts[0];
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s.width / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(s.pts[0].x, s.pts[0].y);
      for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  const drawShape = (ctx: CanvasRenderingContext2D, s: ShapeItem) => {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.beginPath();
    const { a, b } = s;
    if (s.shape === "line" || s.shape === "arrow") {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      if (s.shape === "arrow") {
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const head = Math.max(12, s.width * 4);
        for (const off of [-0.45, 0.45]) {
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(
            b.x - head * Math.cos(angle + off),
            b.y - head * Math.sin(angle + off)
          );
        }
      }
    } else if (s.shape === "rect") {
      ctx.rect(
        Math.min(a.x, b.x),
        Math.min(a.y, b.y),
        Math.abs(b.x - a.x),
        Math.abs(b.y - a.y)
      );
    } else if (s.shape === "triangle") {
      const left = Math.min(a.x, b.x);
      const right = Math.max(a.x, b.x);
      const top = Math.min(a.y, b.y);
      const bot = Math.max(a.y, b.y);
      ctx.moveTo((left + right) / 2, top);
      ctx.lineTo(left, bot);
      ctx.lineTo(right, bot);
      ctx.closePath();
    } else {
      ctx.ellipse(
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
        Math.abs(b.x - a.x) / 2,
        Math.abs(b.y - a.y) / 2,
        0,
        0,
        Math.PI * 2
      );
    }
    ctx.stroke();
  };

  const drawText = (ctx: CanvasRenderingContext2D, t: TextItem) => {
    ctx.globalCompositeOperation = "source-over";
    const family = resolveVar("--font-hand") || "cursive";
    ctx.font = `700 ${t.size}px ${family}`;
    ctx.textBaseline = "top";
    ctx.fillStyle = t.color;
    t.text.split("\n").forEach((line, i) => {
      ctx.fillText(line, t.x, t.y + i * t.size * 1.2);
    });
  };

  const drawItem = (ctx: CanvasRenderingContext2D, it: Item) => {
    if (it.kind === "stroke") drawStroke(ctx, it);
    else if (it.kind === "shape") drawShape(ctx, it);
    else drawText(ctx, it);
  };

  const redraw = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    ctx.clearRect(0, 0, w, h);
    for (const it of itemsRef.current) drawItem(ctx, it);
    if (curRef.current) drawItem(ctx, curRef.current);
    ctx.globalCompositeOperation = "source-over";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncHistory = () => {
    setCanUndo(histRef.current.undo.length > 0);
    setCanRedo(histRef.current.redo.length > 0);
  };

  // Size the backing store to the device pixel ratio for crisp lines, and
  // rescale every item when the board resizes (e.g. fullscreen). Items held
  // only by history (redo stacks, clear backups) are included, deduped by
  // identity since "add" entries alias the live items.
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
      const seen = new Set<Item>();
      for (const items of pagesRef.current.values())
        for (const it of items) seen.add(it);
      for (const hist of historyRef.current.values())
        for (const e of [...hist.undo, ...hist.redo]) {
          if (e.type === "add") seen.add(e.item);
          else for (const it of e.items) seen.add(it);
        }
      for (const it of seen) {
        if (it.kind === "stroke") {
          for (const p of it.pts) {
            p.x *= sx;
            p.y *= sy;
          }
        } else if (it.kind === "shape") {
          it.a.x *= sx;
          it.a.y *= sy;
          it.b.x *= sx;
          it.b.y *= sy;
        } else {
          it.x *= sx;
          it.y *= sy;
          it.size *= sy;
        }
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

  const cancelText = useCallback(() => {
    editingRef.current = null;
    setEditing(null);
  }, []);

  // Point the live refs at the given page's item/history arrays, creating
  // them on first visit. The outgoing page's arrays stay in the Maps by
  // reference; flipping back restores them.
  const bindPage = useCallback(() => {
    let items = pagesRef.current.get(pageKey);
    if (!items) {
      items = [];
      pagesRef.current.set(pageKey, items);
    }
    itemsRef.current = items;
    let hist = historyRef.current.get(pageKey);
    if (!hist) {
      hist = { undo: [], redo: [] };
      historyRef.current.set(pageKey, hist);
    }
    histRef.current = hist;
    setCanUndo(hist.undo.length > 0);
    setCanRedo(hist.redo.length > 0);
    cancelText(); // a flip mid-typing must not commit onto the wrong page
    redraw();
  }, [pageKey, redraw, cancelText]);

  // Swap the active item set + history when the page changes.
  useEffect(() => bindPage(), [bindPage]);

  // "Blank canvas" reset: drop every page's ink and history. Guarded by the
  // last-seen token (not just effect deps) so a later pageKey change can't
  // replay the wipe.
  const lastResetRef = useRef(resetToken);
  useEffect(() => {
    if (lastResetRef.current === resetToken) return;
    lastResetRef.current = resetToken;
    pagesRef.current.clear();
    historyRef.current.clear();
    bindPage();
  }, [resetToken, bindPage]);

  const commitItem = useCallback((item: Item) => {
    itemsRef.current.push(item);
    histRef.current.undo.push({ type: "add", item });
    histRef.current.redo.length = 0;
    syncHistory();
  }, []);

  const undo = useCallback(() => {
    const entry = histRef.current.undo.pop();
    if (!entry) return;
    if (entry.type === "add") itemsRef.current.pop();
    else itemsRef.current.push(...entry.items);
    histRef.current.redo.push(entry);
    syncHistory();
    redraw();
  }, [redraw]);

  const redo = useCallback(() => {
    const entry = histRef.current.redo.pop();
    if (!entry) return;
    if (entry.type === "add") itemsRef.current.push(entry.item);
    else itemsRef.current.splice(0);
    histRef.current.undo.push(entry);
    syncHistory();
    redraw();
  }, [redraw]);

  const clear = () => {
    cancelText();
    if (itemsRef.current.length === 0) return;
    const backup = itemsRef.current.slice();
    // In-place so the per-page Map entry stays aliased to this array.
    itemsRef.current.splice(0);
    histRef.current.undo.push({ type: "clear", items: backup });
    histRef.current.redo.length = 0;
    syncHistory();
    redraw();
  };

  // Tool letter shortcuts + Ctrl/Cmd+Z undo / Ctrl/Cmd+Y redo. Dead while
  // typing in any form control and while the board is hidden behind another tab.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, select, textarea, [contenteditable=true]")) return;
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === "z" && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if (k === "y" || (k === "z" && e.shiftKey)) {
          e.preventDefault();
          redo();
        }
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "p") setTool("pen");
      else if (k === "h") setTool("highlighter");
      else if (k === "e") setTool("eraser");
      else if (k === "t") setTool("text");
      else if (k === "s") {
        setTool("shape");
        setShapeMenuOpen(true);
      } else if (k === "l") {
        setTool("laser");
        setShapeMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, undo, redo]);

  // Close the shape flyout on any press outside it.
  useEffect(() => {
    if (!shapeMenuOpen) return;
    const onPress = (e: PointerEvent) => {
      if (!shapeWrapRef.current?.contains(e.target as Node)) setShapeMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPress);
    return () => document.removeEventListener("pointerdown", onPress);
  }, [shapeMenuOpen]);

  // Auto-collapse writing tools when Present (fullscreen) starts.
  useEffect(() => {
    const onFs = () => {
      const fs = !!document.fullscreenElement;
      setCollapsed(fs);
      if (fs) setShapeMenuOpen(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Drop the laser overlay when switching away from the laser tool.
  useEffect(() => {
    if (tool !== "laser") {
      setLaserPos(null);
      setLaserHot(false);
    }
  }, [tool]);

  const pointFromEvent = (e: PointerEvent | React.PointerEvent): Pt => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const commitText = () => {
    const pos = editingRef.current;
    if (!pos) return;
    const text = inputRef.current?.value.trim() ?? "";
    editingRef.current = null;
    setEditing(null);
    if (!text) return;
    commitItem({
      kind: "text",
      x: pos.x,
      y: pos.y,
      text,
      color: resolveVar(colorVar),
      size: SIZES[size].text,
    });
    redraw();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (penOnly && e.pointerType === "touch") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pt = pointFromEvent(e);
    // Commit any open text edit at its own position before this press does
    // anything else — the input's blur fires too late (after pointerdown).
    if (editingRef.current) commitText();
    if (tool === "laser") {
      canvas.setPointerCapture(e.pointerId);
      setLaserPos(pt);
      setLaserHot(true);
      return;
    }
    if (tool === "text") {
      editSessionRef.current++;
      editingRef.current = pt;
      setEditing(pt);
      return;
    }
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    if (tool === "shape") {
      curRef.current = {
        kind: "shape",
        shape,
        color: resolveVar(colorVar),
        width: SIZES[size].pen,
        a: pt,
        b: { ...pt },
      };
    } else {
      curRef.current = {
        kind: "stroke",
        mode: tool === "eraser" ? "erase" : "draw",
        color: resolveVar(tool === "highlighter" ? hlVar : colorVar),
        width:
          tool === "eraser"
            ? ERASER_WIDTH
            : tool === "highlighter"
              ? SIZES[size].hl
              : SIZES[size].pen,
        ...(tool === "highlighter" ? { alpha: HL_ALPHA } : null),
        pts: [pt],
      };
    }
    const ctx = ctxRef.current;
    if (ctx) drawItem(ctx, curRef.current); // dot / zero-size preview for a tap
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "laser") {
      setLaserPos(pointFromEvent(e));
      return;
    }
    if (!drawingRef.current || !curRef.current) return;
    const ctx = ctxRef.current;
    const cur = curRef.current;
    const native = e.nativeEvent;
    const events =
      typeof native.getCoalescedEvents === "function"
        ? native.getCoalescedEvents()
        : [native];
    if (cur.kind === "shape") {
      let b = pointFromEvent(events[events.length - 1] ?? native);
      if (e.shiftKey) b = constrainShapePoint(cur.shape, cur.a, b);
      cur.b = b;
      redraw(); // live preview — redraw() renders curRef on top
      return;
    }
    if (cur.kind !== "stroke") return;
    if (cur.alpha) {
      // Translucent strokes must be replayed as one path per frame, or the
      // segment joins double up and go dark.
      for (const ev of events) cur.pts.push(pointFromEvent(ev));
      redraw();
      return;
    }
    for (const ev of events) {
      const next = pointFromEvent(ev);
      const prev = cur.pts[cur.pts.length - 1];
      cur.pts.push(next);
      if (ctx && prev) drawSegment(ctx, cur, prev, next);
    }
    if (ctx) ctx.globalCompositeOperation = "source-over";
  };

  const endStroke = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "laser") {
      setLaserHot(false);
      if (e?.type === "pointerleave" || e?.type === "pointercancel") {
        setLaserPos(null);
      }
      return;
    }
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const cur = curRef.current;
    curRef.current = null;
    if (!cur) return;
    if (cur.kind === "shape") {
      // A tap (no drag) would commit an invisible shape — discard it.
      if (Math.hypot(cur.b.x - cur.a.x, cur.b.y - cur.a.y) >= 3) commitItem(cur);
      redraw();
    } else if (cur.kind === "stroke" && cur.pts.length) {
      commitItem(cur);
    }
  };

  const pickColor = (v: string) => {
    if (tool === "highlighter") {
      setHlVar(v);
      return;
    }
    setColorVar(v);
    if (tool === "eraser" || tool === "laser") setTool("pen");
  };

  const pickShape = (k: ShapeKind) => {
    setShape(k);
    setTool("shape");
    setShapeMenuOpen(false);
  };

  // Shared styling for the toolbar's icon buttons.
  const toolBtn = (active: boolean) =>
    `flex h-9 w-9 items-center justify-center rounded-lg outline-none transition-colors focus-visible:shadow-ring ${
      active
        ? "bg-brand-500 text-surface"
        : "text-paper-500 hover:bg-paper-100 hover:text-paper-700"
    }`;

  const palette = tool === "highlighter" ? HIGHLIGHTS : INKS;
  const activeVar = tool === "highlighter" ? hlVar : colorVar;
  const ShapeIcon = SHAPES.find((s) => s.key === shape)!.Icon;
  const ToolIcon =
    tool === "pen"
      ? Pen
      : tool === "highlighter"
        ? Highlighter
        : tool === "text"
          ? Type
          : tool === "eraser"
            ? Eraser
            : tool === "laser"
              ? Crosshair
              : ShapeIcon;
  const miniSwatch =
    tool === "highlighter"
      ? HIGHLIGHTS.find((c) => c.var === hlVar)?.swatch ?? "bg-warning"
      : INKS.find((c) => c.var === colorVar)?.swatch ?? "bg-mark-blue-ink";

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-0 h-full w-full touch-none ${
          tool === "laser" ? "cursor-none" : "cursor-crosshair"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={endStroke}
        // Keep the browser from yanking focus (and thus blurring a freshly
        // opened text input) when a press lands on the canvas.
        onMouseDown={(e) => e.preventDefault()}
      />

      {tool === "laser" && laserPos && (
        <div className="pointer-events-none absolute inset-0 z-[15]" aria-hidden>
          <span
            className="absolute rounded-full bg-danger transition-[width,height,box-shadow] duration-75"
            style={{
              left: laserPos.x,
              top: laserPos.y,
              width: laserHot ? 28 : 18,
              height: laserHot ? 28 : 18,
              transform: "translate(-50%, -50%)",
              boxShadow: laserHot
                ? "0 0 0 6px rgba(229,72,77,.35), 0 0 28px 10px rgba(229,72,77,.55)"
                : "0 0 0 4px rgba(229,72,77,.28), 0 0 18px 6px rgba(229,72,77,.45)",
            }}
          />
        </div>
      )}

      {editing && (
        <input
          key={editSessionRef.current}
          ref={(el) => {
            inputRef.current = el;
            el?.focus();
          }}
          type="text"
          aria-label="Board text"
          className="absolute z-20 border-none bg-transparent p-0 font-hand font-bold outline-none"
          style={{
            left: editing.x,
            top: editing.y,
            fontSize: SIZES[size].text,
            lineHeight: 1.2,
            color: `var(${colorVar})`,
            caretColor: `var(${colorVar})`,
            width: `min(20ch, calc(100% - ${editing.x}px))`,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitText();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelText();
            }
          }}
          onBlur={commitText}
        />
      )}

      <DraggableToolbar ariaLabel="Writing tools" defaultClassName="bottom-4 left-4">
        {collapsed ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Expand writing tools"
              title="Expand writing tools"
              className="flex h-9 items-center gap-2 rounded-lg bg-brand-500 px-2.5 text-surface outline-none transition-colors hover:bg-brand-600 focus-visible:shadow-ring"
            >
              <ToolIcon className="h-4 w-4" />
              {tool !== "eraser" && tool !== "laser" && (
                <span className={`h-3.5 w-3.5 rounded-full ring-2 ring-surface/80 ${miniSwatch}`} />
              )}
              <ChevronUp className="h-3.5 w-3.5 opacity-80" />
            </button>
          </div>
        ) : (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setTool("pen")}
              aria-label="Pen (P)"
              title="Pen (P)"
              aria-pressed={tool === "pen"}
              className={toolBtn(tool === "pen")}
            >
              <Pen className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setTool("highlighter")}
              aria-label="Highlighter (H)"
              title="Highlighter (H)"
              aria-pressed={tool === "highlighter"}
              className={toolBtn(tool === "highlighter")}
            >
              <Highlighter className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setTool("text")}
              aria-label="Type text (T)"
              aria-pressed={tool === "text"}
              title="Type text (T) — tap the board, type, press Enter"
              className={toolBtn(tool === "text")}
            >
              <Type className="h-4 w-4" />
            </button>
            <div ref={shapeWrapRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setTool("shape");
                  setShapeMenuOpen((v) => !v);
                }}
                aria-label="Shapes (S)"
                aria-pressed={tool === "shape"}
                aria-expanded={shapeMenuOpen}
                title="Shapes (S) — drag on the board · hold Shift to constrain"
                className={toolBtn(tool === "shape")}
              >
                <ShapeIcon className="h-4 w-4" />
              </button>
              {shapeMenuOpen && (
                <div
                  role="menu"
                  className="absolute bottom-full left-0 z-10 mb-2 min-w-[11rem] rounded-card border border-paper-100 bg-surface/95 p-1.5 shadow-float backdrop-blur"
                >
                  <p className="px-2 pb-1 text-2xs font-bold uppercase tracking-wider text-paper-400">
                    Shapes
                  </p>
                  {SHAPES.map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      role="menuitemradio"
                      onClick={() => pickShape(key)}
                      aria-label={label}
                      aria-checked={shape === key}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-semibold outline-none transition-colors focus-visible:shadow-ring ${
                        shape === key && tool === "shape"
                          ? "bg-brand-500 text-surface"
                          : "text-paper-700 hover:bg-paper-100"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </button>
                  ))}
                  <p className="mt-1 border-t border-paper-100 px-2 pt-1.5 text-2xs text-paper-400">
                    Hold Shift for straight / square
                  </p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setTool("eraser")}
              aria-label="Eraser (E)"
              title="Eraser (E)"
              aria-pressed={tool === "eraser"}
              className={toolBtn(tool === "eraser")}
            >
              <Eraser className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setTool("laser");
                setShapeMenuOpen(false);
              }}
              aria-label="Laser pointer (L)"
              title="Laser pointer (L) — point without drawing"
              aria-pressed={tool === "laser"}
              className={toolBtn(tool === "laser")}
            >
              <Crosshair className="h-4 w-4" />
            </button>

            <span className="mx-1 h-6 w-px bg-paper-200" aria-hidden />

            {palette.map((ink) => {
              const active =
                activeVar === ink.var &&
                tool !== "eraser" &&
                tool !== "laser";
              return (
                <button
                  key={ink.key}
                  type="button"
                  onClick={() => pickColor(ink.var)}
                  aria-label={`${ink.key} ink`}
                  aria-pressed={active}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg outline-none transition-colors focus-visible:shadow-ring ${
                    active ? "bg-brand-50" : "hover:bg-paper-100"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full ${ink.swatch} ${
                      tool === "highlighter" ? "opacity-60" : ""
                    } ${active ? "ring-2 ring-brand-500 ring-offset-1" : ""}`}
                  />
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setCollapsed(true);
                setShapeMenuOpen(false);
              }}
              aria-label="Collapse writing tools"
              title="Collapse"
              className={toolBtn(false)}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            {(Object.keys(SIZES) as SizeKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setSize(k)}
                aria-label={`${k} size`}
                aria-pressed={size === k}
                className={toolBtn(size === k)}
              >
                <span
                  className="rounded-full bg-current"
                  style={{ width: SIZES[k].dot, height: SIZES[k].dot }}
                />
              </button>
            ))}

            <span className="mx-1 h-6 w-px bg-paper-200" aria-hidden />

            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Undo"
              title="Undo (Ctrl+Z)"
              className={`${toolBtn(false)} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              aria-label="Redo"
              title="Redo (Ctrl+Y)"
              className={`${toolBtn(false)} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={clear}
              aria-label="Clear all"
              title="Clear all (undoable)"
              className={toolBtn(false)}
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <span className="mx-1 h-6 w-px bg-paper-200" aria-hidden />

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
        </div>
        )}
      </DraggableToolbar>
    </>
  );
}
