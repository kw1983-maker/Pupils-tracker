"use client";

import { ExternalLink } from "lucide-react";

// A deployed web app shown full-height inside a tab (same iframe settings as
// the Games tab), with an escape hatch to open it in its own browser tab.
export function EmbeddedApp({ title, url }: { title: string; url: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="truncate font-display text-lg font-semibold text-paper-900">{title}</h2>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-paper-400 outline-none transition hover:text-brand-600 hover:underline focus-visible:shadow-ring"
        >
          Open in new tab
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <iframe
        src={url}
        title={title}
        allow="autoplay; fullscreen; clipboard-write; microphone"
        allowFullScreen
        className="h-[calc(100vh-10rem)] w-full rounded-card border border-paper-200 bg-surface"
      />
    </div>
  );
}
