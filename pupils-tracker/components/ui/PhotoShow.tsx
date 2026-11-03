"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { subscribeBoardPhoto, type BoardPhoto } from "@/lib/firebase";

/**
 * Full-screen photo on the board, sent from the phone (Photo tab). Listens to
 * user_state/{uid}_photo while open, so a photo that lands a moment after the
 * "show" command — or a newer one sent while it's up — still appears.
 * Tap anywhere or press Escape to close.
 */
export function PhotoShow({ uid, onClose }: { uid: string; onClose: () => void }) {
  const [photo, setPhoto] = useState<BoardPhoto | null>(null);

  useEffect(() => subscribeBoardPhoto(uid, setPhoto), [uid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo from the phone"
      onClick={onClose}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-paper-900/90 p-4 backdrop-blur-sm"
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL from Firestore
        <img
          src={photo.dataUrl}
          alt="Photo sent from the teacher's phone"
          className="max-h-full max-w-full rounded-card object-contain shadow-float"
        />
      ) : (
        <p className="text-sm font-semibold text-paper-100">Loading photo…</p>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close photo"
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface/15 text-paper-100 outline-none transition-colors hover:bg-surface/25 focus-visible:shadow-ring"
      >
        <X className="h-6 w-6" />
      </button>
    </div>,
    document.body
  );
}
