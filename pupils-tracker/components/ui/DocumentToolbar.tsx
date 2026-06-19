"use client";

import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Hand } from "lucide-react";
import { DraggableToolbar } from "@/components/ui/DraggableToolbar";
import { MediaControls, toolBtn } from "@/components/ui/MediaControls";

/**
 * Floating page controls for the opened file. Lives inside the board element
 * so it stays usable in Present (fullscreen) mode. For video docs the pager
 * gives way to playback controls bound to the board's <video>.
 */
export function DocumentToolbar({
  name,
  page,
  pages,
  zoom,
  isPanMode,
  onPrev,
  onNext,
  onClose,
  onZoomIn,
  onZoomOut,
  onTogglePan,
  mediaRef,
}: {
  name: string;
  page: number;
  pages: number;
  zoom?: number;
  isPanMode?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onTogglePan?: () => void;
  mediaRef?: React.RefObject<HTMLVideoElement | null>;
}) {
  return (
    <DraggableToolbar
      ariaLabel="Document controls"
      defaultClassName="bottom-4 left-1/2 -translate-x-1/2"
    >
      <span
        className="max-w-40 truncate px-2 text-sm font-semibold text-paper-600"
        title={name}
      >
        {name}
      </span>

      {mediaRef && (
        <>
          <span className="mx-1 h-6 w-px bg-paper-200" aria-hidden />
          <MediaControls mediaRef={mediaRef} />
        </>
      )}

      {pages > 1 && (
        <>
          <span className="mx-1 h-6 w-px bg-paper-200" aria-hidden />
          <button
            type="button"
            onClick={onPrev}
            disabled={page <= 1}
            aria-label="Previous page"
            className={toolBtn}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span
            className="px-1 text-sm tabular-nums text-paper-600"
            aria-live="polite"
          >
            {page} / {pages}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={page >= pages}
            aria-label="Next page"
            className={toolBtn}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {onZoomIn && (
        <>
          <span className="mx-1 h-6 w-px bg-paper-200" aria-hidden />
          <button
            type="button"
            onClick={onZoomOut}
            aria-label="Zoom out"
            className={toolBtn}
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="px-1 text-sm tabular-nums text-paper-600">
            {Math.round((zoom ?? 1) * 100)}%
          </span>
          <button
            type="button"
            onClick={onZoomIn}
            aria-label="Zoom in"
            className={toolBtn}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </>
      )}

      {onTogglePan && (zoom ?? 1) > 1 && (
        <>
          <span className="mx-1 h-6 w-px bg-paper-200" aria-hidden />
          <button
            type="button"
            onClick={onTogglePan}
            aria-label={isPanMode ? "Exit pan mode" : "Grab to pan"}
            title={isPanMode ? "Click to draw again" : "Drag to move around the zoomed page"}
            className={`${toolBtn} ${isPanMode ? "bg-brand-100 text-brand-600" : ""}`}
          >
            <Hand className="h-4 w-4" />
          </button>
        </>
      )}

      <span className="mx-1 h-6 w-px bg-paper-200" aria-hidden />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close file"
        className={toolBtn}
      >
        <X className="h-4 w-4" />
      </button>
    </DraggableToolbar>
  );
}
