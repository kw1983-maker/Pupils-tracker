"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Music, ScrollText, X } from "lucide-react";
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
  downloadName,
  onToggleLyrics,
  lyricsShown,
}: {
  name: string;
  url: string;
  /** False while the board is hidden behind another tab — pause the track
      (position kept) so it doesn't play over the rest of the app. */
  active?: boolean;
  onClose: () => void;
  /** When set, show a download button that saves the track as `<name>.mp3`
      (used for generated songs; omitted for board dictation tracks). */
  downloadName?: string;
  /** When set, show a button that toggles the sing-along lyrics panel. */
  onToggleLyrics?: () => void;
  /** Whether the lyrics panel is currently shown (styles the toggle). */
  lyricsShown?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  // A media element removed from the DOM keeps playing — stop it explicitly.
  useEffect(() => () => audioRef.current?.pause(), []);
  useEffect(() => {
    if (!active) audioRef.current?.pause();
  }, [active]);

  const download = async () => {
    if (downloading) return;
    const safe =
      (downloadName || name || "song").replace(/[\\/:*?"<>|]+/g, " ").trim() ||
      "song";
    setDownloading(true);
    try {
      // Fetch as a blob so a cross-origin CDN file saves instead of navigating
      // (the `download` attribute is ignored cross-origin). Falls back to opening
      // the URL in a new tab if the fetch is blocked.
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${safe}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank", "noopener");
    } finally {
      setDownloading(false);
    }
  };

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
      {onToggleLyrics && (
        <button
          type="button"
          onClick={onToggleLyrics}
          aria-label={lyricsShown ? "Hide lyrics" : "Show lyrics"}
          aria-pressed={lyricsShown}
          title={lyricsShown ? "Hide lyrics" : "Show lyrics"}
          className={`${toolBtn} ${lyricsShown ? "text-brand-600" : ""}`}
        >
          <ScrollText className="h-4 w-4" />
        </button>
      )}
      {downloadName !== undefined && (
        <button
          type="button"
          onClick={download}
          disabled={downloading}
          aria-label="Download song"
          title="Download song"
          className={toolBtn}
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </button>
      )}
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
