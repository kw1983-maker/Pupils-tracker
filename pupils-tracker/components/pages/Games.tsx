"use client";

import { useState } from "react";
import { ArrowLeft, ExternalLink, Gamepad2, Play } from "lucide-react";
import { GAMES, type Game } from "@/lib/games";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/SectionCard";

export function Games() {
  const [playing, setPlaying] = useState<Game | null>(null);

  if (playing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => setPlaying(null)}>
              <ArrowLeft className="h-4 w-4" />
              Back to games
            </Button>
            <h2 className="truncate font-display text-lg font-semibold text-paper-900">
              {playing.title}
            </h2>
          </div>
          <a
            href={playing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-paper-400 outline-none transition hover:text-brand-600 hover:underline focus-visible:shadow-ring"
          >
            Open in new tab
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <iframe
          src={playing.url}
          title={playing.title}
          allow="autoplay; fullscreen; clipboard-write"
          allowFullScreen
          className="h-[calc(100vh-14rem)] w-full rounded-card border border-paper-200 bg-surface"
        />
      </div>
    );
  }

  return (
    <SectionCard title="Games">
      <ul className="grid gap-2 sm:grid-cols-2">
        {GAMES.map((game) => (
          <li
            key={game.id}
            className="flex items-stretch gap-1 rounded-md border border-paper-100 transition hover:border-brand-300 hover:bg-brand-50"
          >
            <button
              type="button"
              onClick={() => setPlaying(game)}
              className="group flex min-w-0 flex-1 items-center gap-3 rounded-md p-3 text-left outline-none focus-visible:shadow-ring"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mark-green text-mark-green-ink">
                <Gamepad2 className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 font-display text-sm font-semibold text-paper-800">
                {game.title}
              </span>
              <Play className="h-4 w-4 shrink-0 text-paper-300 transition group-hover:text-brand-600" />
            </button>
            <a
              href={game.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new tab"
              aria-label={`Open ${game.title} in a new tab`}
              className="my-2 mr-2 flex w-9 shrink-0 items-center justify-center rounded-md text-paper-400 outline-none transition-colors hover:bg-brand-100 hover:text-brand-700 focus-visible:shadow-ring"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
