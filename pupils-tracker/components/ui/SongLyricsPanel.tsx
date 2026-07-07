"use client";

import { useState } from "react";
import { Maximize2, Music2, X } from "lucide-react";
import { Modal } from "./Modal";

/**
 * Sing-along lyrics for a generated spelling song, shown as a large, readable
 * card on the board while the track plays. Sits top-right so it clears the audio
 * player (top-left), the writing tools (bottom-left) and the page controls
 * (bottom-centre). Closing it hides only the lyrics — the song keeps playing; the
 * audio player's lyrics button brings it back. The expand button opens the same
 * text full-screen for songs too long to read comfortably in this small card.
 */
export function SongLyricsPanel({
  title,
  lyrics,
  onClose,
}: {
  title: string;
  lyrics: string;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="absolute right-4 top-4 z-30 flex max-h-[72vh] w-[min(92vw,26rem)] flex-col overflow-hidden rounded-card border border-paper-100 bg-surface/95 shadow-float backdrop-blur"
      role="region"
      aria-label="Song lyrics"
    >
      <div className="flex items-center justify-between gap-2 border-b border-paper-100 px-4 py-3">
        <h3
          className="flex min-w-0 items-center gap-2 font-display text-base font-semibold text-paper-900"
          title={title}
        >
          <Music2 className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
          <span className="truncate">{title}</span>
        </h3>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="View full lyrics"
            title="View full lyrics"
            className="rounded-md p-1.5 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-700 focus-visible:shadow-ring"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Hide lyrics"
            title="Hide lyrics"
            className="rounded-md p-1.5 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-700 focus-visible:shadow-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="overflow-y-auto whitespace-pre-line px-5 py-4 text-lg font-semibold leading-relaxed text-paper-800">
        {lyrics}
      </p>

      <Modal
        isOpen={expanded}
        onClose={() => setExpanded(false)}
        title={title}
        titleIcon={<Music2 className="h-5 w-5 text-brand-600" aria-hidden />}
        maxWidthClass="max-w-2xl"
      >
        <p className="whitespace-pre-line text-xl font-semibold leading-relaxed text-paper-800">
          {lyrics}
        </p>
      </Modal>
    </div>
  );
}
