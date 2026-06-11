"use client";

import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

/** Shared styling for floating-toolbar icon buttons. */
export const toolBtn =
  "flex h-9 w-9 items-center justify-center rounded-lg text-paper-500 outline-none transition-colors hover:bg-paper-100 hover:text-paper-700 focus-visible:shadow-ring disabled:cursor-not-allowed disabled:opacity-40";

function fmt(s: number) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * Play/pause + replay + seek + time readout for a media element owned by the
 * parent (the board's <video> or the audio bar's <audio>).
 */
export function MediaControls({
  mediaRef,
}: {
  mediaRef: React.RefObject<HTMLMediaElement | null>;
}) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    const sync = () => {
      setPlaying(!el.paused && !el.ended);
      setTime(el.currentTime);
      setDuration(el.duration || 0);
    };
    sync();
    const evs = [
      "play",
      "pause",
      "ended",
      "timeupdate",
      "durationchange",
      "loadedmetadata",
    ];
    evs.forEach((e) => el.addEventListener(e, sync));
    return () => evs.forEach((e) => el.removeEventListener(e, sync));
  }, [mediaRef]);

  const media = () => mediaRef.current;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const m = media();
          if (!m) return;
          if (m.paused) void m.play();
          else m.pause();
        }}
        aria-label={playing ? "Pause" : "Play"}
        className={toolBtn}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={() => {
          const m = media();
          if (!m) return;
          m.currentTime = 0;
          void m.play();
        }}
        aria-label="Replay from start"
        className={toolBtn}
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <span className="px-1 text-sm tabular-nums text-paper-600">
        {fmt(time)} / {fmt(duration)}
      </span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(time, duration || 0)}
        onChange={(e) => {
          const m = media();
          if (m) m.currentTime = Number(e.target.value);
        }}
        aria-label="Seek"
        disabled={!duration}
        className="mx-1 h-1.5 w-28 cursor-pointer accent-brand-600 disabled:cursor-not-allowed sm:w-40"
      />
    </>
  );
}
