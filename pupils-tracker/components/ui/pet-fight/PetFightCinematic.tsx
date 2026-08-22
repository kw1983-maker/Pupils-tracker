"use client";

import { Volume2, VolumeX, X } from "lucide-react";
import { useState } from "react";
import { sceneSrc } from "@/lib/pets";
import { PetFightPlayer } from "@/components/ui/pet-fight/PetFightPlayer";
import { demoCasts } from "@/components/ui/pet-fight/PetFightStage";

/**
 * Optional showcase of the fight cinematic with the classic cat vs dragon cast.
 * Live Pet PK uses the same player with the class's real pets.
 */
export function PetFightCinematic({
  onClose,
  soundEnabled = true,
}: {
  onClose: () => void;
  soundEnabled?: boolean;
}) {
  const [muted, setMuted] = useState(!soundEnabled);
  const { left, right } = demoCasts();

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-paper-900/85 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Pet fight showcase"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-6xl flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-extrabold text-surface sm:text-2xl">
            Fight showcase
            <span className="ml-2 font-sans text-2xs font-extrabold uppercase tracking-[0.14em] text-brand-300">
              Same animation every Pet PK uses
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-pressed={!muted}
              className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-2xs font-extrabold uppercase tracking-wider outline-none transition-colors focus-visible:shadow-ring ${
                muted
                  ? "border-warning/50 bg-warning/20 text-mark-amber"
                  : "border-brand-300/40 bg-brand-500/20 text-brand-300"
              }`}
            >
              {muted ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
              {muted ? "Sound off" : "Sound on"}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-paper-400 outline-none transition-colors hover:text-surface focus-visible:shadow-ring"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <PetFightPlayer
          left={left}
          right={right}
          winner="left"
          sceneSrc={sceneSrc("night")}
          sound={!muted}
          loop
          showControls
        />
      </div>
    </div>
  );
}
