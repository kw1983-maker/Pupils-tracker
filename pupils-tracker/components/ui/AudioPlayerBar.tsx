"use client";

import { useEffect, useRef } from "react";
import { Music, X } from "lucide-react";
import { DraggableToolbar } from "@/components/ui/DraggableToolbar";
import { MediaControls, toolBtn } from "@/components/ui/MediaControls";

/**
 * Floating player for a dictation/listening track. Independent of the open
 * document so the audio keeps playing while the teacher flips or swaps pages.
 */
export function AudioPlayerBar({
  name,
  url,
  active = true,
  onClose,
}: {
  name: string;
  url: string;
  /** False while the board is hidden behind another tab — pause the track
      (position kept) so it doesn't play over the rest of the app. */
  active?: boolean;
  onClose: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // A media element removed from the DOM keeps playing — stop it explicitly.
  useEffect(() => () => audioRef.current?.pause(), []);
  useEffect(() => {
    if (!active) audioRef.current?.pause();
  }, [active]);

  // Top-left default: the writing tools own bottom-left and the page controls
  // own bottom-centre, so the player must not cover either.
  return (
    <DraggableToolbar ariaLabel="Audio player" defaultClassName="top-4 left-4">
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
      <Music className="ml-1 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
      <span
        className="max-w-32 truncate px-1.5 text-sm font-semibold text-paper-600"
        title={name}
      >
        {name}
      </span>
      <span className="mx-1 h-6 w-px bg-paper-200" aria-hidden />
      <MediaControls mediaRef={audioRef} />
      <span className="mx-1 h-6 w-px bg-paper-200" aria-hidden />
      <button
        type="button"
        onClick={onClose}
        aria-label="Stop and close audio"
        className={toolBtn}
      >
        <X className="h-4 w-4" />
      </button>
    </DraggableToolbar>
  );
}
