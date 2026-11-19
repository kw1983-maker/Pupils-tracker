"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PhotoSet } from "@/lib/photo-set";

/** "‹ 2 of 5 ›" for flipping through a photo set. Hidden for a single photo. */
export function PhotoPager({
  set,
  onGo,
  className = "",
}: {
  set: PhotoSet;
  onGo: (index: number) => void;
  className?: string;
}) {
  if (set.count < 2) return null;
  const btn =
    "flex h-11 w-11 items-center justify-center rounded-md text-paper-700 outline-none transition hover:bg-paper-100 focus-visible:shadow-ring disabled:cursor-not-allowed disabled:opacity-30";
  return (
    <div
      role="group"
      aria-label="Choose photo"
      onPointerDown={(e) => e.stopPropagation()}
      className={`flex items-center gap-1 rounded-card bg-surface p-1.5 shadow-float ${className}`}
    >
      <button
        type="button"
        aria-label="Previous photo"
        className={btn}
        disabled={set.index === 0}
        onClick={() => onGo(set.index - 1)}
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <div className="flex items-center gap-1.5 px-1" aria-live="polite">
        {Array.from({ length: set.count }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Photo ${i + 1}`}
            aria-current={i === set.index ? "true" : undefined}
            onClick={() => onGo(i)}
            className={`flex h-8 min-w-8 items-center justify-center rounded-full px-1 text-sm font-bold outline-none transition focus-visible:shadow-ring ${
              i === set.index
                ? "bg-brand-500 text-surface"
                : "bg-paper-100 text-paper-600 hover:bg-paper-200"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-label="Next photo"
        className={btn}
        disabled={set.index === set.count - 1}
        onClick={() => onGo(set.index + 1)}
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  );
}
