"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";

const toolBtn =
  "flex h-9 w-9 items-center justify-center rounded-lg text-paper-500 outline-none transition-colors hover:bg-paper-100 hover:text-paper-700 focus-visible:shadow-ring disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Floating page controls for the opened file. Lives inside the board element
 * so it stays usable in Present (fullscreen) mode.
 */
export function DocumentToolbar({
  name,
  page,
  pages,
  onPrev,
  onNext,
  onClose,
}: {
  name: string;
  page: number;
  pages: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-card border border-paper-100 bg-surface/95 p-1.5 shadow-float backdrop-blur"
      role="toolbar"
      aria-label="Document controls"
    >
      <span
        className="max-w-40 truncate px-2 text-sm font-semibold text-paper-600"
        title={name}
      >
        {name}
      </span>

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

      <span className="mx-1 h-6 w-px bg-paper-200" aria-hidden />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close file"
        className={toolBtn}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
