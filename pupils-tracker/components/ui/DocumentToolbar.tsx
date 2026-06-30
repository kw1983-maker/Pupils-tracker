"use client";

import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  Hand,
  Volume2,
  Pause,
  Play,
  Square,
  Loader2,
} from "lucide-react";
import { DraggableToolbar } from "@/components/ui/DraggableToolbar";
import { MediaControls, toolBtn } from "@/components/ui/MediaControls";
import type { ReadAloudStatus } from "@/lib/useReadAloud";

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
  ttsStatus,
  ttsBusy,
  onReadAloud,
  onReadPause,
  onReadResume,
  onReadStop,
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
  /** Read-aloud controls (PDF only). When `onReadAloud` is set, the buttons show. */
  ttsStatus?: ReadAloudStatus;
  /** True while a scanned page is being OCR'd before it can be read. */
  ttsBusy?: boolean;
  onReadAloud?: () => void;
  onReadPause?: () => void;
  onReadResume?: () => void;
  onReadStop?: () => void;
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

      {onReadAloud && (
        <>
          <span className="mx-1 h-6 w-px bg-paper-200" aria-hidden />
          {ttsBusy ? (
            <span
              className={toolBtn}
              role="status"
              aria-label="Reading the page…"
              title="Reading the page…"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
            </span>
          ) : ttsStatus === "idle" || ttsStatus === undefined ? (
            <button
              type="button"
              onClick={onReadAloud}
              aria-label="Read this page aloud"
              title="Read this page aloud"
              className={toolBtn}
            >
              <Volume2 className="h-4 w-4" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={ttsStatus === "paused" ? onReadResume : onReadPause}
                aria-label={ttsStatus === "paused" ? "Resume reading" : "Pause reading"}
                className={`${toolBtn} bg-brand-100 text-brand-600`}
              >
                {ttsStatus === "paused" ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={onReadStop}
                aria-label="Stop reading"
                className={toolBtn}
              >
                <Square className="h-4 w-4" />
              </button>
            </>
          )}
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
