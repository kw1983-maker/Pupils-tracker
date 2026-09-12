// Turning a PkFighter plus the move they are throwing into the look the stage
// draws. Shared by Watch mode and the round-by-round modes so a pet is tinted
// the same way whoever chose the move.

import { spriteFor } from "@/lib/pets";
import { effectSrc } from "@/lib/pet-powers";
import type { PkFighter, PkResult } from "@/lib/pet-pk";
import {
  type FightCast,
  type FightWinner,
  CAT_AURA,
  DRA_AURA,
  STAR_CAT,
  STAR_DRA,
} from "@/components/ui/pet-fight/PetFightStage";

/** Build a side's look from the move it actually throws this round. */
export function castFromMove(
  f: PkFighter,
  move: { power?: { id: string; tint: string } | null; kind?: string },
  side: "left" | "right"
): FightCast {
  const power = move.power ?? null;
  const tint = power?.tint ?? (side === "left" ? CAT_AURA : DRA_AURA);
  return {
    name: f.name,
    spriteSrc: spriteFor(f.species || "cat", f.stageId || "adult"),
    aura: tint,
    starColor: side === "left" ? STAR_CAT : STAR_DRA,
    projectileSrc: power ? effectSrc(power.id) : undefined,
    tint,
    melee: move.kind === "melee",
  };
}

export function sideOf(winner: "a" | "b" | "draw"): FightWinner {
  if (winner === "a") return "left";
  if (winner === "b") return "right";
  return "draw";
}

export const winnerSide = (result: PkResult): FightWinner => sideOf(result.winner);
