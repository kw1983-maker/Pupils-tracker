// House bosses — the pets the computer fights with.
//
// The point of these is that ONE pupil can play. Pet PK has always needed two
// children with two hatched pets; a boss means a pupil who finished early, or
// the only one in the room with a pet, still gets a turn.
//
// A boss is just a PkFighter with a reserved pupilId, so nothing is stored, no
// pupil record is touched and Firestore never sees one. They exist for the
// length of a duel and vanish.

import { stageForLevel } from "./pets";
import type { PkFighter } from "./pet-pk";

export type Difficulty = "easy" | "normal" | "hard";

export interface Boss {
  id: string;
  difficulty: Difficulty;
  /** The pet's name, shown on the stage. */
  name: string;
  /** One line for the picker, in the voice of a challenge. */
  blurb: string;
  species: string;
  /** Level when the player is level 1 — see bossFighter for the scaling. */
  baseLevel: number;
  powers: string[];
}

/**
 * One boss per difficulty, and the difficulty is legible from the pet before a
 * child reads a word: a puppy, a penguin, then a dragon.
 *
 * The ladder is how many powers there are to choose between — one, two, three —
 * counting the species signature every pet is born with. Level is on the ladder
 * too, but only for the look of it: in the turn-based modes a blow costs a flat
 * 10 / 20 / 60 plus the type bonus, so a boss's level changes nothing it does.
 *
 * Three is the ceiling because a pupil's pet brings ONE. Every pet a class
 * actually owns has its signature and nothing else — the shop is a long way off
 * at 2 EXP a merit — so the boss lists were being read against pets nobody has:
 * Frostbite carried three powers and Vortex seven, which is not a harder
 * opponent but a different game. Vortex still answers all three elements, which
 * is what makes Hard hard; it just cannot also throw a fresh one every round
 * while the pupil repeats their only move.
 */
export const BOSSES: Boss[] = [
  {
    id: "sparky",
    difficulty: "easy",
    name: "Sparky",
    blurb: "A bouncy puppy who attacks however he feels like.",
    species: "dog",
    baseLevel: 2,
    powers: [],
  },
  {
    id: "frostbite",
    difficulty: "normal",
    name: "Frostbite",
    blurb: "A cool-headed penguin who watches what you did last round.",
    species: "penguin",
    baseLevel: 5,
    // Ice Waddle comes free with the penguin; Magic Sparkle is the second
    // element, so there is something to read rather than frost twice over.
    powers: ["sparkle"],
  },
  {
    id: "vortex",
    difficulty: "hard",
    name: "Vortex",
    blurb: "An old dragon with an answer to everything. He will read you.",
    species: "dragon",
    baseLevel: 8,
    // Dragon Flame is the dragon's own fire, so these two complete the ring:
    // whatever the pupil's pet is, Vortex holds the element that beats it.
    powers: ["frost", "whirlwind"],
  },
];

export const bossById = (id: string): Boss | undefined =>
  BOSSES.find((b) => b.id === id);

export const bossFor = (difficulty: Difficulty): Boss =>
  BOSSES.find((b) => b.difficulty === difficulty) ?? BOSSES[0];

/** Reserved so a boss can never collide with a real pupil id. */
export const BOSS_ID_PREFIX = "boss:";

export const isBossId = (pupilId: string): boolean =>
  pupilId.startsWith(BOSS_ID_PREFIX);

/**
 * Build the boss as a fighter, nudged toward the player's level.
 *
 * Without this a level-1 pupil met Vortex at level 8 and lost on the level bonus
 * before the elements mattered, while a level-12 pupil walked through him. The
 * boss meets the player where they are and keeps its own handicap on top:
 * Sparky stays a little below, Frostbite level, Vortex a little above.
 */
export function bossFighter(boss: Boss, playerLevel: number): PkFighter {
  const offset = { easy: -2, normal: 0, hard: 2 }[boss.difficulty];
  // Halfway between the boss's own level and the player's, so a very low or very
  // high player still shifts it without the boss simply mirroring them.
  const level = Math.max(
    1,
    Math.round((boss.baseLevel + Math.max(1, playerLevel)) / 2) + offset
  );
  return {
    pupilId: `${BOSS_ID_PREFIX}${boss.id}`,
    name: boss.name,
    pupilName: "The computer",
    species: boss.species,
    stageId: stageForLevel(level).id,
    level,
    powers: [...boss.powers],
  };
}
