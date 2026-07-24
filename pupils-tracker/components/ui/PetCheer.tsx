"use client";

import { useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Pupil } from "@/lib/types";
import { levelFromExp, speciesById, stageForLevel } from "@/lib/pets";
import { pickPetLine } from "@/lib/pet-voice";
import { speakPetLine, stopPetSpeak } from "@/lib/pet-speak-client";
import { PetSprite } from "@/components/ui/PetSprite";

const CHEER_MS = 3400;

/**
 * The pet that pops into the corner of the Students tab when its pupil is
 * awarded positive points, cheering in its own voice.
 *
 * Points are given here, but the pet lives in the Pets tab — so without this the
 * reward and the creature it feeds never appear together. Showing the pet at the
 * moment it's earned is what ties the two together for the class.
 *
 * Renders nothing for a pupil who hasn't chosen a pet yet.
 */
export function PetCheer({
  pupil,
  exp,
  onDone,
}: {
  pupil: Pupil;
  /** The pupil's positive-point total, used to pick the right sprite stage. */
  exp: number;
  onDone: () => void;
}) {
  const species = pupil.pet?.species;
  const stage = stageForLevel(levelFromExp(exp).level);

  useEffect(() => {
    if (!species) return;
    speakPetLine(pickPetLine("cheer", species, stage.id));
    const t = window.setTimeout(onDone, CHEER_MS);
    return () => {
      window.clearTimeout(t);
      stopPetSpeak();
    };
    // One cheer per mount — the caller remounts via `key` for the next award.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!species || typeof document === "undefined") return null;

  const petName = pupil.pet?.name?.trim() || `${pupil.name}'s pet`;

  return createPortal(
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[58] print:hidden"
      aria-hidden="true"
    >
      <div
        className="pet-cheer-pop flex items-end gap-2"
        style={{ "--cheer-dur": `${CHEER_MS}ms` } as CSSProperties}
      >
        <div className="max-w-[11rem] rounded-2xl rounded-br-sm border border-paper-200 bg-surface px-3 py-2 shadow-float">
          <p className="text-sm font-bold leading-tight text-paper-800">
            Well done, {pupil.name}!
          </p>
          <p className="text-2xs text-paper-500">
            {petName} · {speciesById(species).label}
          </p>
        </div>
        <PetSprite species={species} stageId={stage.id} px={76} motion="hero" />
      </div>
    </div>,
    document.body
  );
}
