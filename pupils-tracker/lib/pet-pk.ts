// Pet PK — two pupils' pets face off over three rounds.
//
// This gives the superpower shop a point. Owning Fire Breath was previously a
// button that made a noise; here the powers a pupil has saved for are what they
// actually fight with, so spending marks becomes a decision rather than a toy.
//
// Design constraints that matter more than the maths:
//   • NOTHING IS LOST. No marks change hands, no power is spent, the pet is
//     unaffected. A duel is entertainment, so losing one costs a child nothing.
//   • AN UNDERDOG CAN WIN. Level and powers tilt the odds, they don't decide
//     the outcome — each round carries a big roll. Measured over 20k duels:
//     evenly matched pets are ~44/44, one cheap power wins ~56%, a full set ~70%,
//     and a level-8 pet with everything beats a level-1 pet with nothing ~82% —
//     so even the weakest pupil takes roughly one in five off the champion,
//     which is what keeps the whole class willing to play.
//   • IT IS WATCHABLE. Three rounds with a named move each, rather than one
//     number, so there is something to narrate on the projector.

import { PET_POWERS, powerById, type PetPower } from "./pet-powers";
import { levelFromExp } from "./pets";

export const PK_ROUNDS = 3;
/** Luck per round: 0..ROLL_RANGE-1. See the note on pickMove. */
const ROLL_RANGE = 14;

/**
 * A plain tackle, used by a pet that owns no powers so it can still fight.
 * Worth 0, not 1: at 1 it tied the cheapest power, which meant spending 10 marks
 * on Magic Sparkle bought a pupil no advantage at all.
 */
export const BASIC_MOVE = {
  id: "tackle",
  label: "Tackle",
  emoji: "💢",
  power: 0,
} as const;

export interface PkFighter {
  pupilId: string;
  /** Display name of the pet (falls back to the pupil's name). */
  name: string;
  pupilName: string;
  species?: string;
  stageId: string;
  level: number;
  /** Power ids this pet owns. */
  powers: string[];
}

export interface PkMove {
  label: string;
  emoji: string;
  /** The power used, or null for a basic tackle. */
  power: PetPower | null;
  /** Contribution from the move itself. */
  strength: number;
  /** Contribution from the pet's level. */
  levelBonus: number;
  /** The luck of the round. */
  roll: number;
  total: number;
}

export interface PkRound {
  index: number;
  a: PkMove;
  b: PkMove;
  /** "a" | "b" | "draw" */
  winner: "a" | "b" | "draw";
}

export interface PkResult {
  rounds: PkRound[];
  scoreA: number;
  scoreB: number;
  winner: "a" | "b" | "draw";
}

/** A power's clout, derived from its price so the tiers stay in step (1–3). */
export function powerStrength(power: PetPower): number {
  return Math.max(1, Math.round(power.cost / 10));
}

/**
 * Level helps, but gently — at most 3 across the whole ladder, against a roll of
 * 0–13. Without the cap a level-8 pet would simply never lose, and the rest of
 * the class would stop wanting to play.
 */
function levelBonus(level: number): number {
  return Math.min(3, Math.floor(level / 3));
}

function uniqueOwned(fighter: PkFighter): PetPower[] {
  const seen = new Set<string>();
  const out: PetPower[] = [];
  for (const id of fighter.powers) {
    if (seen.has(id)) continue;
    const p = powerById(id);
    if (!p) continue;
    seen.add(id);
    out.push(p);
  }
  return out;
}

/**
 * Pick which move this fighter uses this round. Random among owned powers, and
 * when they own 2+ we avoid repeating the previous round's power so the duel
 * doesn't look like the same move three times.
 */
function pickMove(
  fighter: PkFighter,
  rand: () => number,
  previousPowerId?: string | null
): PkMove {
  const owned = uniqueOwned(fighter);

  let power: PetPower | null = null;
  if (owned.length === 1) {
    power = owned[0];
  } else if (owned.length > 1) {
    const pool = previousPowerId
      ? owned.filter((p) => p.id !== previousPowerId)
      : owned;
    const pickFrom = pool.length > 0 ? pool : owned;
    power = pickFrom[Math.floor(rand() * pickFrom.length)] ?? null;
  }

  const strength = power ? powerStrength(power) : BASIC_MOVE.power;
  const bonus = levelBonus(fighter.level);
  // Wide enough that investment tilts the odds without settling them; at a
  // narrower range the strongest pet in the class won ~90% and nobody else
  // wanted a turn.
  const roll = Math.floor(rand() * ROLL_RANGE);
  return {
    label: power ? power.label : BASIC_MOVE.label,
    emoji: power ? power.emoji : BASIC_MOVE.emoji,
    power,
    strength,
    levelBonus: bonus,
    roll,
    total: strength + bonus + roll,
  };
}

/**
 * Run a duel. `rand` is injectable so the outcome can be tested deterministically.
 */
export function runPk(
  a: PkFighter,
  b: PkFighter,
  rand: () => number = Math.random
): PkResult {
  const rounds: PkRound[] = [];
  let scoreA = 0;
  let scoreB = 0;

  let prevA: string | null = null;
  let prevB: string | null = null;
  for (let i = 0; i < PK_ROUNDS; i++) {
    const moveA = pickMove(a, rand, prevA);
    const moveB = pickMove(b, rand, prevB);
    prevA = moveA.power?.id ?? null;
    prevB = moveB.power?.id ?? null;
    const winner =
      moveA.total > moveB.total ? "a" : moveB.total > moveA.total ? "b" : "draw";
    if (winner === "a") scoreA += 1;
    if (winner === "b") scoreB += 1;
    rounds.push({ index: i, a: moveA, b: moveB, winner });
  }

  return {
    rounds,
    scoreA,
    scoreB,
    winner: scoreA > scoreB ? "a" : scoreB > scoreA ? "b" : "draw",
  };
}

/** Build a fighter from the pieces the Pets tab already has to hand. */
export function toFighter(args: {
  pupilId: string;
  pupilName: string;
  petName?: string;
  species?: string;
  stageId: string;
  exp: number;
  powers: string[];
}): PkFighter {
  return {
    pupilId: args.pupilId,
    pupilName: args.pupilName,
    name: args.petName?.trim() || `${args.pupilName}'s pet`,
    species: args.species,
    stageId: args.stageId,
    level: levelFromExp(args.exp).level,
    // Deduplicate so a glitchy double-purchase can't make the arsenal look
    // like one power on repeat.
    powers: [...new Set(args.powers.filter((id) => PET_POWERS.some((p) => p.id === id)))],
  };
}
