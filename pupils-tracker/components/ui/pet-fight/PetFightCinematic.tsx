"use client";

import { Volume2, VolumeX, X } from "lucide-react";
import { useMemo, useState } from "react";
import { sceneSrc } from "@/lib/pets";
import { PetFightPlayer } from "@/components/ui/pet-fight/PetFightPlayer";
import { demoCasts } from "@/components/ui/pet-fight/PetFightStage";
import { BEAT } from "@/lib/pet-fight/storyboard";
import { FINALES, FINALE_IDS, type FinaleId } from "@/lib/pet-fight/finales";
import { TRANSFORM_BURST_AT } from "@/lib/pet-battle-sfx";
import type { PkAudioCue } from "@/lib/sound";

/**
 * Cues for the demo cast (cat vs dragon, cat wins) on the cinematic clock.
 *
 * The showcase used to play a baked fight-mix.wav instead. That mix was
 * rendered against the old 25s timing and hardcoded one pair of powers, so it
 * both drifted once the power-up scene was inserted and contradicted whichever
 * pets were on screen. Scheduling real cues is what live PK already does.
 */
function demoCues(finale: FinaleId): PkAudioCue[] {
  return [
    { atMs: 700, kind: "announce" },
    { atMs: 3350, kind: "charge" },
    { atMs: 3900, kind: "tackle" },
    { atMs: 4500, kind: "hit" },
    { atMs: 7300, kind: "charge" },
    { atMs: 7850, kind: "power", powerId: "fire", pan: 0.55 },
    { atMs: 8850, kind: "hit2" },
    { atMs: 11600, kind: "hit" },
    { atMs: 12200, kind: "hit2" },
    { atMs: 12900, kind: "hit" },
    { atMs: 13600, kind: "hit2" },
    { atMs: 14300, kind: "critical" },
    { atMs: BEAT.quake * 1000, kind: "quake" },
    { atMs: BEAT.ignite * 1000, kind: "wind", pan: -0.5 },
    // Placed by its loudest moment, not its start — see TRANSFORM_BURST_AT.
    {
      atMs: (BEAT.flash - TRANSFORM_BURST_AT) * 1000,
      kind: "transform",
      pan: -0.5,
    },
    { atMs: BEAT.flash * 1000, kind: "levelup" },
    { atMs: (BEAT.release - 1.05) * 1000, kind: "charge" },
    { atMs: BEAT.release * 1000, kind: "finisher", finale, pan: -0.5 },
    { atMs: BEAT.impact * 1000, kind: "critical" },
    { atMs: BEAT.ko * 1000, kind: "ko" },
    { atMs: BEAT.koText * 1000, kind: "victory" },
    { atMs: (BEAT.koText + 0.3) * 1000, kind: "crowd" },
  ];
}

/**
 * Optional showcase of the fight cinematic with the classic cat vs dragon cast.
 * Live Pet PK uses the same player with the class's real pets — the one thing
 * the showcase adds is a picker, so every finisher can be previewed without
 * running duels until the random draw happens to land on each.
 */
export function PetFightCinematic({
  onClose,
  soundEnabled = true,
}: {
  onClose: () => void;
  soundEnabled?: boolean;
}) {
  const [muted, setMuted] = useState(!soundEnabled);
  const [finale, setFinale] = useState<FinaleId>("beam");
  const { left, right } = demoCasts();
  const cues = useMemo(() => demoCues(finale), [finale]);

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

        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-1 font-sans text-2xs font-extrabold uppercase tracking-[0.14em] text-paper-400">
            Finisher
          </p>
          {FINALE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFinale(id)}
              aria-pressed={finale === id}
              className={`rounded-md border px-3 py-1.5 text-2xs font-extrabold uppercase tracking-wider outline-none transition-colors focus-visible:shadow-ring ${
                finale === id
                  ? "border-brand-300/40 bg-brand-500/25 text-brand-200"
                  : "border-paper-200/25 bg-surface/10 text-paper-400 hover:text-surface"
              }`}
            >
              {id}
            </button>
          ))}
          <span className="font-sans text-2xs font-bold text-paper-500">
            ends on “{FINALES[finale].koWord}”
          </span>
        </div>

        <PetFightPlayer
          // A new finisher restarts the pass so it is seen from the charge up.
          key={finale}
          left={left}
          right={right}
          winner="left"
          sceneSrc={sceneSrc("night")}
          sound={!muted}
          cues={cues}
          finale={finale}
          loop
          showControls
          controlsHint="Every Pet PK duel draws one of these finishers at random."
        />
      </div>
    </div>
  );
}
