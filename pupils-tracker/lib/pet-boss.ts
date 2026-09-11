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
 * The ladder is built from the two things that tilt a duel — level and how many
 * powers there are to choose between — so Hard is genuinely harder rather than
 * just being called that.
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
    powers: ["frost", "sparkle"],
  },
  {
    id: "vortex",
    difficulty: "hard",
    name: "Vortex",
    blurb: "An old dragon with every power there is. He will read you.",
    species: "dragon",
    baseLevel: 8,
    powers: ["fire", "frost", "lightning", "whirlwind", "rainbow", "flight"],
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
