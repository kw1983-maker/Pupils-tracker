"use client";

import { useState } from "react";
import { Film, X } from "lucide-react";
import { Overlay } from "@/components/ui/Modal";
import { PetSprite } from "@/components/ui/PetSprite";
import { PET_STORIES } from "@/lib/pet-stories";

/**
 * Full-screen player for the animated pet stories (lib/pet-stories.ts). Each
 * story is a self-contained HTML video with its own controls, so this only
 * frames it: pick a story, watch it in an iframe, close. The stories carry
 * their own sound, so the Pets-page mute toggle doesn't apply here.
 */
export function PetStoriesPlayer({ onClose }: { onClose: () => void }) {
  const [storyId, setStoryId] = useState(PET_STORIES[0]?.id);
  const story = PET_STORIES.find((s) => s.id === storyId) ?? PET_STORIES[0];

  return (
    <Overlay
      label="Pet stories"
      onEscape={onClose}
      onBackdrop={onClose}
      className="z-[70] bg-paper-900/85 p-3 backdrop-blur-sm sm:p-6"
    >
      <div className="thin-scroll flex max-h-full w-full max-w-6xl flex-col gap-3 overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold text-surface sm:text-2xl">
            <Film className="h-5 w-5 text-brand-300" aria-hidden />
            Pet stories
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-2 text-paper-300 outline-none transition-colors hover:bg-surface/10 hover:text-surface focus-visible:shadow-ring"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {PET_STORIES.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {PET_STORIES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStoryId(s.id)}
                aria-pressed={s.id === story?.id}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-extrabold uppercase tracking-wider outline-none transition-colors focus-visible:shadow-ring ${
                  s.id === story?.id
                    ? "border-brand-300/40 bg-brand-500/25 text-brand-200"
                    : "border-paper-200/25 bg-surface/10 text-paper-400 hover:text-surface"
                }`}
              >
                <PetSprite species={s.cover.species} stageId={s.cover.stageId} px={28} />
                {s.title}
              </button>
            ))}
          </div>
        )}

        {story ? (
          <>
            <p className="font-sans text-sm font-semibold text-paper-300">
              <span className="font-extrabold text-surface">{story.title}</span>
              {" · "}about {story.minutes} min · {story.blurb}
            </p>
            <iframe
              key={story.id}
              src={story.path}
              title={story.title}
              allow="autoplay; fullscreen"
              allowFullScreen
              className="h-[calc(100vh-11rem)] min-h-[24rem] w-full rounded-card border border-paper-200/25 bg-paper-900"
            />
          </>
        ) : (
          <p className="font-sans text-sm font-semibold text-paper-300">No stories yet.</p>
        )}
      </div>
    </Overlay>
  );
}
