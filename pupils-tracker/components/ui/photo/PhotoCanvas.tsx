"use client";

import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import {
  clamp01,
  DEFAULT_VIEW,
  layoutFor,
  newMarkId,
  panBy,
  screenToImage,
  simplifyStroke,
  zoomAt,
  type Mark,
  type MarkColor,
  type PhotoView,
  type StageLayout,
} from "@/lib/photo-annotate";

export type PhotoTool =
  | "move"
  | "pen"
  | "highlight"
  | "circle"
  | "arrow"
  | "tick"
  | "cross"
  | "star";

export type PenSize = 0 | 1 | 2;

// Sizes are fractions of the image height at zoom 1; divided by the zoom when
// drawing so a line looks the same thickness on screen at any zoom.
const PEN_SIZES = [0.004, 0.008, 0.014];
const HIGHLIGHT_SIZES = [0.02, 0.035, 0.055];
const STAMP_SIZES = [0.06, 0.1, 0.16];

export const colorVar = (c: MarkColor | "warning-ink") => `var(--color-${c})`;

type Draft =
  | { kind: "pen" | "highlight"; points: number[] }
  | { kind: "circle" | "arrow"; x1: number; y1: number; x2: number; y2: number };

interface Props {
  src: string;
  alt: string;
  view: PhotoView;
  marks: Mark[];
  tool: PhotoTool;
  color: MarkColor;
  size: PenSize;
  onView: (view: PhotoView, final?: boolean) => void;
  onMark: (mark: Mark) => void;
  className?: string;
}

/**
 * The photo plus its markup, drawn in image space and transformed by the
 * shared view. Move tool: drag to pan, pinch / wheel to zoom, double-tap to
 * fit. Other tools draw. Two fingers always pinch, whatever the tool.
 */
export function PhotoCanvas({
  src,
  alt,
  view,
  marks,
  tool,
  color,
  size,
  onView,
  onMark,
  className = "",
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [aspect, setAspect] = useState(4 / 3);
  const [draft, setDraft] = useState<Draft | null>(null);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  const lastTap = useRef(0);
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setStage({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout: StageLayout = layoutFor(stage.w || 1, stage.h || 1, aspect, view.rotate);

  const local = (e: PointerEvent | WheelEvent) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const toImage = (x: number, y: number) => {
    const [u, v] = screenToImage(x, y, viewRef.current, layout);
    return [clamp01(u), clamp01(v)] as const;
  };

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    gesture.current = {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      midX: (a.x + b.x) / 2,
      midY: (a.y + b.y) / 2,
    };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);

    if (pointers.current.size === 2) {
      setDraft(null); // a second finger turns any drawing into a pinch
      startPinch();
      return;
    }
    if (pointers.current.size > 2) return;

    if (tool === "move") {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        onView(fitView(viewRef.current), true);
        lastTap.current = 0;
      } else lastTap.current = now;
      return;
    }
    const [u, v] = toImage(p.x, p.y);
    if (tool === "tick" || tool === "cross" || tool === "star") {
      onMark({ id: newMarkId(), kind: tool, x: u, y: v, size: STAMP_SIZES[size] / viewRef.current.zoom });
      return;
    }
    if (tool === "pen" || tool === "highlight") setDraft({ kind: tool, points: [u, v] });
    else setDraft({ kind: tool, x1: u, y1: v, x2: u, y2: v });
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);

    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      let next = zoomAt(viewRef.current, dist / gesture.current.dist, midX, midY, layout);
      next = panBy(next, midX - gesture.current.midX, midY - gesture.current.midY, layout);
      gesture.current = { dist, midX, midY };
      viewRef.current = next;
      onView(next);
      return;
    }
    if (pointers.current.size !== 1) return;

    if (tool === "move") {
      const next = panBy(viewRef.current, p.x - prev.x, p.y - prev.y, layout);
      viewRef.current = next;
      onView(next);
      return;
    }
    const [u, v] = toImage(p.x, p.y);
    setDraft((d) => {
      if (!d) return d;
      if (d.kind === "pen" || d.kind === "highlight") return { ...d, points: [...d.points, u, v] };
      return { ...d, x2: u, y2: v };
    });
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    if (gesture.current) {
      if (pointers.current.size < 2) gesture.current = null;
      if (pointers.current.size === 0) onView(viewRef.current, true);
      return;
    }
    if (tool === "move") {
      onView(viewRef.current, true);
      return;
    }
    if (!draft || e.type === "pointercancel") {
      setDraft(null);
      return;
    }
    const zoom = viewRef.current.zoom;
    if (draft.kind === "pen" || draft.kind === "highlight") {
      const sizes = draft.kind === "pen" ? PEN_SIZES : HIGHLIGHT_SIZES;
      onMark({
        id: newMarkId(),
        kind: draft.kind,
        color,
        size: sizes[size] / zoom,
        points: simplifyStroke(draft.points, 0.0015 / zoom),
      });
    } else if (draft.kind === "circle" || draft.kind === "arrow") {
      const { kind, x1, y1, x2, y2 } = draft;
      if (Math.hypot(x2 - x1, y2 - y1) > 0.01) {
        onMark({ id: newMarkId(), kind, x1, y1, x2, y2, color, size: PEN_SIZES[size] / zoom });
      }
    }
    setDraft(null);
  };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    const p = local(e);
    const next = zoomAt(viewRef.current, Math.exp(-e.deltaY / 400), p.x, p.y, layout);
    viewRef.current = next;
    onView(next, true);
  };

  const ready = stage.w > 0;
  const draftMark: Mark | null = draft
    ? draft.kind === "pen" || draft.kind === "highlight"
      ? {
          id: "draft",
          kind: draft.kind,
          color,
          size: (draft.kind === "pen" ? PEN_SIZES : HIGHLIGHT_SIZES)[size] / view.zoom,
          points: draft.points,
        }
      : { id: "draft", ...draft, color, size: PEN_SIZES[size] / view.zoom }
    : null;

  return (
    <div
      ref={stageRef}
      className={`relative overflow-hidden select-none ${tool === "move" ? "cursor-grab" : "cursor-crosshair"} ${className}`}
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      {ready && (
        <div
          className="absolute"
          style={{
            left: layout.stageW / 2 - layout.boxW / 2,
            top: layout.stageH / 2 - layout.boxH / 2,
            width: layout.boxW,
            height: layout.boxH,
            transform: `translate(${view.panX * layout.fitW}px, ${view.panY * layout.fitH}px) scale(${view.zoom}) rotate(${view.rotate}deg)`,
            transformOrigin: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL from Firestore */}
          <img
            src={src}
            alt={alt}
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) {
                setAspect(img.naturalWidth / img.naturalHeight);
              }
            }}
            className="pointer-events-none h-full w-full rounded-card object-fill shadow-float"
          />
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${1000 * aspect} 1000`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {marks.map((m) => (
              <MarkShape key={m.id} mark={m} aspect={aspect} />
            ))}
            {draftMark && <MarkShape mark={draftMark} aspect={aspect} />}
          </svg>
        </div>
      )}
    </div>
  );
}

function fitView(v: PhotoView): PhotoView {
  return { ...DEFAULT_VIEW, rotate: v.rotate };
}

/** One mark, in a viewBox of (1000·aspect) × 1000 units. */
function MarkShape({ mark, aspect }: { mark: Mark; aspect: number }) {
  const W = 1000 * aspect;
  const H = 1000;
  const sw = mark.size * H;

  if (mark.kind === "pen" || mark.kind === "highlight") {
    const pts: string[] = [];
    for (let i = 0; i + 1 < mark.points.length; i += 2) {
      pts.push(`${(mark.points[i] * W).toFixed(1)},${(mark.points[i + 1] * H).toFixed(1)}`);
    }
    return (
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={colorVar(mark.color)}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={mark.kind === "highlight" ? 0.4 : 1}
        style={mark.kind === "highlight" ? { mixBlendMode: "multiply" } : undefined}
      />
    );
  }
  if (mark.kind === "circle") {
    return (
      <ellipse
        cx={((mark.x1 + mark.x2) / 2) * W}
        cy={((mark.y1 + mark.y2) / 2) * H}
        rx={(Math.abs(mark.x2 - mark.x1) / 2) * W}
        ry={(Math.abs(mark.y2 - mark.y1) / 2) * H}
        fill="none"
        stroke={colorVar(mark.color)}
        strokeWidth={sw}
      />
    );
  }
  if (mark.kind === "arrow") {
    const x1 = mark.x1 * W;
    const y1 = mark.y1 * H;
    const x2 = mark.x2 * W;
    const y2 = mark.y2 * H;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const head = Math.max(sw * 4, 18);
    const a1 = ang + Math.PI * 0.82;
    const a2 = ang - Math.PI * 0.82;
    return (
      <g stroke={colorVar(mark.color)} strokeWidth={sw} strokeLinecap="round" fill="none">
        <line x1={x1} y1={y1} x2={x2} y2={y2} />
        <polyline
          points={`${x2 + Math.cos(a1) * head},${y2 + Math.sin(a1) * head} ${x2},${y2} ${x2 + Math.cos(a2) * head},${y2 + Math.sin(a2) * head}`}
          strokeLinejoin="round"
        />
      </g>
    );
  }

  // Stamps: drawn in a 24-unit box centred on (x, y), `size` tall.
  if (!("x" in mark)) return null;
  const s = (mark.size * H) / 24;
  const transform = `translate(${mark.x * W} ${mark.y * H}) scale(${s}) translate(-12 -12)`;
  if (mark.kind === "tick") {
    return (
      <path
        transform={transform}
        d="M4 12.5l5 5L20 6.5"
        fill="none"
        stroke={colorVar("success")}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (mark.kind === "cross") {
    return (
      <path
        transform={transform}
        d="M6 6l12 12M18 6L6 18"
        fill="none"
        stroke={colorVar("danger")}
        strokeWidth={3.4}
        strokeLinecap="round"
      />
    );
  }
  return (
    <path
      transform={transform}
      d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.8z"
      fill={colorVar("warning")}
      stroke={colorVar("warning-ink")}
      strokeWidth={1}
      strokeLinejoin="round"
    />
  );
}
