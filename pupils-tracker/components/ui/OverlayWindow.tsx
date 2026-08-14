"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, GripVertical, X } from "lucide-react";
import { DocumentLayer } from "@/components/ui/DocumentLayer";
import { MediaControls, toolBtn } from "@/components/ui/MediaControls";
import type { BoardDoc } from "@/lib/useBoardDocument";

const MIN_W = 180;
const MIN_H = 140;

type Box = { x: number; y: number; w: number; h: number };

/**
 * A second file (image / PDF / video) pinned on top of the spelling board.
 * Independent of the textbook underneath — drag, resize, fade, or close it
 * without replacing the open PDF.
 */
export function OverlayWindow({
  doc,
  page,
  pages,
  onPrev,
  onNext,
  onClose,
  active = true,
}: {
  doc: BoardDoc;
  page: number;
  pages: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  /** False while the board tab is hidden — pause overlay video. */
  active?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [box, setBox] = useState<Box>({ x: 16, y: 72, w: 360, h: 260 });
  const [opacity, setOpacity] = useState(1);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const clampBox = useCallback((next: Box): Box => {
    const parent = rootRef.current?.offsetParent as HTMLElement | null;
    if (!parent) return next;
    const w = Math.min(Math.max(next.w, MIN_W), parent.clientWidth);
    const h = Math.min(Math.max(next.h, MIN_H), parent.clientHeight);
    return {
      w,
      h,
      x: Math.min(Math.max(next.x, 0), Math.max(parent.clientWidth - w, 0)),
      y: Math.min(Math.max(next.y, 0), Math.max(parent.clientHeight - h, 0)),
    };
  }, []);

  // Size relative to the board when a new overlay file opens (or on first
  // layout). Top-left keeps it off the date badge (centre) and Present Exit
  // (top-right).
  useEffect(() => {
    const parent = rootRef.current?.offsetParent as HTMLElement | null;
    if (!parent) return;
    const w = Math.round(
      Math.min(400, Math.max(MIN_W, parent.clientWidth * 0.4))
    );
    const h = Math.round(
      Math.min(300, Math.max(MIN_H, parent.clientHeight * 0.38))
    );
    setBox(clampBox({ x: 16, y: 72, w, h }));
    setOpacity(1);
  }, [doc.id, clampBox]);

  useEffect(() => {
    const parent = rootRef.current?.offsetParent as HTMLElement | null;
    if (!parent) return;
    const observer = new ResizeObserver(() => {
      setBox((b) => clampBox(b));
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, [clampBox]);

  useEffect(() => {
    if (!active) videoRef.current?.pause();
  }, [active]);

  const onDragDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const grab = dragRef.current;
    const el = rootRef.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!grab || !el || !parent) return;
    const parentRect = parent.getBoundingClientRect();
    setBox((b) =>
      clampBox({
        ...b,
        x: e.clientX - parentRect.left - grab.dx,
        y: e.clientY - parentRect.top - grab.dy,
      })
    );
  };
  const onDragUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onResizeDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: box.w,
      startH: box.h,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
  };
  const onResizeMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = resizeRef.current;
    if (!r) return;
    setBox((b) =>
      clampBox({
        ...b,
        w: r.startW + (e.clientX - r.startX),
        h: r.startH + (e.clientY - r.startY),
      })
    );
  };
  const onResizeUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    resizeRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={rootRef}
      className="absolute z-[25] flex flex-col overflow-hidden rounded-card border border-paper-100 bg-surface/95 shadow-float backdrop-blur"
      style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
      role="region"
      aria-label={`${doc.name} on top of the board`}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-paper-100 p-1">
        <button
          type="button"
          aria-label="Move overlay"
          title="Drag to move"
          onPointerDown={onDragDown}
          onPointerMove={onDragMove}
          onPointerUp={onDragUp}
          onPointerCancel={onDragUp}
          className="flex h-9 w-5 cursor-grab touch-none items-center justify-center rounded-lg text-paper-400 outline-none transition-colors hover:text-paper-700 focus-visible:shadow-ring active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span
          className="min-w-0 max-w-32 truncate px-1 text-sm font-semibold text-paper-600"
          title={doc.name}
        >
          {doc.name}
        </span>
        <label className="ml-auto flex items-center gap-1 px-1 text-2xs font-bold uppercase tracking-wider text-paper-400">
          <span className="sr-only">Overlay opacity</span>
          <input
            type="range"
            min={35}
            max={100}
            value={Math.round(opacity * 100)}
            onChange={(e) => setOpacity(Number(e.target.value) / 100)}
            aria-label="Overlay opacity"
            title="Fade so the PDF shows through"
            className="h-1 w-16 cursor-pointer accent-brand-500"
          />
        </label>
        {pages > 1 && (
          <>
            <span className="h-6 w-px bg-paper-200" aria-hidden />
            <button
              type="button"
              onClick={onPrev}
              disabled={page <= 1}
              aria-label="Previous overlay page"
              className={toolBtn}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-0.5 text-sm tabular-nums text-paper-600">
              {page}/{pages}
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={page >= pages}
              aria-label="Next overlay page"
              className={toolBtn}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
        {doc.kind === "video" && (
          <>
            <span className="h-6 w-px bg-paper-200" aria-hidden />
            <MediaControls mediaRef={videoRef} />
          </>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close overlay"
          title="Close overlay (the PDF stays open)"
          className={toolBtn}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1 bg-paper-50" style={{ opacity }}>
        <DocumentLayer
          doc={doc}
          page={page}
          videoRef={doc.kind === "video" ? videoRef : undefined}
          active={active}
        />
      </div>
      <button
        type="button"
        aria-label="Resize overlay"
        title="Drag to resize"
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
        onPointerCancel={onResizeUp}
        className="absolute bottom-0.5 right-0.5 h-5 w-5 cursor-se-resize touch-none rounded-sm outline-none focus-visible:shadow-ring"
      >
        <span
          className="absolute bottom-1 right-1 h-2.5 w-2.5 border-b-2 border-r-2 border-paper-400"
          aria-hidden
        />
      </button>
    </div>
  );
}
