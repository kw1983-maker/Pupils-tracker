"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Maximize, Minimize } from "lucide-react";
import { BoardMarksDock } from "@/components/ui/BoardMarksDock";

// A deployed web app shown full-height inside a tab (same iframe settings as
// the Games tab), with an escape hatch to open it in its own browser tab.
//
// Full screen goes on our own stage around the iframe, never on the app
// inside it: reward celebrations portal into document.fullscreenElement, and
// nothing can be drawn over an iframe that has gone full screen itself — so
// pupils only heard the reward sound. The app is cross-origin, so its own
// full-screen buttons (e.g. on a video) are switched off via `allow` instead.
export function EmbeddedApp({ title, url }: { title: string; url: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const onChange = () =>
      setFull(!!stageRef.current && document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageRef.current?.requestFullscreen?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="truncate font-display text-lg font-semibold text-paper-900">{title}</h2>
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={toggleFull}
            className="flex items-center gap-1.5 rounded-md border border-paper-200 bg-surface px-3 py-1.5 text-xs font-semibold text-paper-600 outline-none transition hover:border-brand-300 hover:text-brand-600 focus-visible:shadow-ring"
          >
            <Maximize className="h-3.5 w-3.5" />
            Full screen
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-paper-400 outline-none transition hover:text-brand-600 hover:underline focus-visible:shadow-ring"
          >
            Open in new tab
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
      <div ref={stageRef} className={full ? "relative bg-surface" : "relative"}>
        <iframe
          src={url}
          title={title}
          allow="autoplay; clipboard-write; microphone"
          className={
            full
              ? "block h-screen w-screen border-0 bg-surface"
              : "h-[calc(100vh-10rem)] w-full rounded-card border border-paper-200 bg-surface"
          }
        />
        {full && (
          <>
            {/* The page header (with the Full screen button) is outside this
                full-screen stage, so it needs its own way out. */}
            <button
              type="button"
              onClick={toggleFull}
              className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-card border border-paper-100 bg-surface/95 px-3 py-2 text-sm font-semibold text-paper-600 shadow-float outline-none backdrop-blur transition-colors hover:text-paper-900 focus-visible:shadow-ring"
            >
              <Minimize className="h-4 w-4" /> Exit
            </button>
            {/* Award points without leaving full screen; the cheer shows on top. */}
            <BoardMarksDock />
          </>
        )}
      </div>
    </div>
  );
}
