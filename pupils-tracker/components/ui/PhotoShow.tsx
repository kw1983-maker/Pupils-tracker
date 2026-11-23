"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFullscreenPortalTarget } from "./useFullscreenPortalTarget";
import { usePhotoSet } from "@/lib/usePhotoSet";
import { stepIndex } from "@/lib/photo-set";
import { PhotoAnnotator } from "./photo/PhotoAnnotator";
import { PhotoPager } from "./photo/PhotoPager";

/**
 * Full-screen photos on the board, sent from the phone (Photo tab), shown
 * one at a time. Listens to the photo set and its photos while open, so a
 * photo that lands a moment after the "show" command still appears.
 * Flip with the arrows, ← / →, or a presenter clicker (Page Up / Down).
 * Zoom, turn and mark up here or from the phone (both stay in step).
 * Close with the ✕ button, Escape, or "Close it on the board" on the phone.
 *
 * Layer z-[75]: above the pet stories / battle screens, but *below* the
 * points celebration (z-80/85) and emoji shouts (z-82), so points given
 * while a photo is up still cheer on top of it.
 */
export function PhotoShow({ uid, onClose }: { uid: string; onClose: () => void }) {
  const { set, current, go } = usePhotoSet(uid);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        go(stepIndex(set, 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(stepIndex(set, -1));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, go, set]);

  const portalTarget = useFullscreenPortalTarget();
  if (!portalTarget) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      data-theme="light"
      aria-label="Photo from the phone"
      className="fixed inset-0 z-[75] flex flex-col items-center justify-center gap-3 bg-paper-900/90 p-4 backdrop-blur-sm"
    >
      <PhotoPager set={set} onGo={go} />
      {current ? (
        <PhotoAnnotator
          uid={uid}
          photo={current}
          slot={set.index}
          alt={`Photo ${set.index + 1} sent from the teacher's phone`}
          keyboard
          className="flex min-h-0 w-full flex-1 flex-col items-center gap-3"
          stageClassName="min-h-0 w-full flex-1"
          toolbarClassName="max-w-full"
        />
      ) : (
        <p className="flex flex-1 items-center text-sm font-semibold text-paper-100">
          Loading photo…
        </p>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close photo"
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-surface/15 text-paper-100 outline-none transition-colors hover:bg-surface/25 focus-visible:shadow-ring"
      >
        <X className="h-6 w-6" />
      </button>
    </div>,
    portalTarget
  );
}
