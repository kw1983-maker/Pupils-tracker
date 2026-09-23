// House bosses — the pets the computer fights with.
//
// The point of these is that ONE pupil can play. Pet PK has always needed two
// children with two hatched pets; a boss means a pupil who finished early, or
// the only one in the room with a pet, still gets a turn.
//
// A boss is just a PkFighter with a reserved pupilId, so nothing is stored, no
// pupil record is touched and Firestore never sees one. They exist for the
// length of a duel and vanish.
//
// ── Why a boss has three forms ───────────────────────────────────────────────
// In the turn-based modes the element bonus is paid against the DEFENDER'S OWN
// TYPE (see petElement in lib/pet-pk.ts). A pet a class actually owns has one
// element — its species signature — because the shop is a long way off at 2
// marks an award. So whether the triangle was available to a pupil at all was
// decided entirely by the animal they picked, months earlier, for its face.
//
// Measured against the fixed rosters this file used to carry:
//
//   • vs Frostbite the penguin (frost), only the 5 fire species of 16 could
//     ever land a bonus. The other 11 played the whole duel with the game's
//     central mechanic switched off, and nothing on screen said so.
//   • vs Vortex the dragon (fire), 7 of 16 could. Vortex, holding all three
//     elements, landed one on all 16 — so the triangle ran one way only.
//
// Lengthening the rosters cannot fix that: the boss's own type is what a pupil
// needs to answer, and that comes from its species. So the species is chosen
// per duel instead. Each boss keeps its difficulty and its character, and turns
// up as whichever of its three forms the pupil's pet can answer — always
// exactly one, because three elements in a ring means the element a pupil beats
// is unique.
//
// The pupil therefore always has a read available. What difficulty controls is
// how much the BOSS has, which is what it controlled before.

import { ELEMENTS, type PetElement } from "./pet-elements";
import { stageForLevel } from "./pets";
import { petElement, type PkFighter } from "./pet-pk";

export type Difficulty = "easy" | "normal" | "hard";

/** One of a boss's three appearances — the animal, and the name that fits it. */
export interface BossForm {
  species: string;
  /** The pet's name, shown on the stage. */
  name: string;
  /** One line for the picker, in the voice of a challenge. */
  blurb: string;
}

export interface Boss {
  id: string;
  difficulty: Difficulty;
  /** The form shown before a pupil has been picked. Also one of `forms`. */
  species: string;
  name: string;
  blurb: string;
  /** Level when the player is level 1 — see bossFighter for the scaling. */
  baseLevel: number;
  /** Shop powers for the default form — see powersFor for the matched ones. */
  powers: string[];
  /**
   * The same character as each element, keyed by the type it fights AS.
   *
   * Picked so each trio reads as one difficulty at a glance, the way the
   * original three did: small and daft, steady and watchful, then old and
   * dangerous. A child still sees the tier before reading a word.
   */
  forms: Record<PetElement, BossForm>;
}

/**
 * Two shop powers per element, for building matched rosters.
 *
 * Which ones hardly matters — in the turn-based modes every power hits for a
 * flat MOVE_DAMAGE.power whatever it cost, and only its element counts. What
 * matters is that there are TWO, because the no-repeat rule takes last round's
 * move away: a boss holding a single counter could only throw it every other
 * turn, and spent the turns in between on something worth nothing. Holding two
 * of the same element means the read survives the rule.
 */
const POWERS_FOR: Record<PetElement, [string, string]> = {
  fire: ["fire", "lightning"],
  frost: ["frost", "bubble"],
  storm: ["whirlwind", "sparkle"],
};

/**
 * One boss per difficulty, and the difficulty is legible from the pet before a
 * child reads a word.
 *
 * The ladder is how many powers there are to choose between — one, two, three —
 * counting the species signature every pet is born with. Level is on the ladder
 * too, but only for the look of it: in the turn-based modes a blow costs a flat
 * 10 / 20 / 60 plus the type bonus, so a boss's level changes nothing it does.
 *
 * Three is the ceiling because a pupil's pet brings ONE. Every pet a class
 * actually owns has its signature and nothing else, so the boss lists were
 * being read against pets nobody has: Frostbite once carried three powers and
 * Vortex seven, which is not a harder opponent but a different game.
 */
export const BOSSES: Boss[] = [
  {
    id: "sparky",
    difficulty: "easy",
    species: "dog",
    name: "Sparky",
    blurb: "A bouncy puppy who attacks however he feels like.",
    baseLevel: 2,
    powers: [],
    forms: {
      fire: {
        species: "dog",
        name: "Sparky",
        blurb: "A bouncy puppy who attacks however he feels like.",
      },
      frost: {
        species: "koala",
        name: "Snuggle",
        blurb: "A dozy koala who swipes at whatever drifts past.",
      },
      storm: {
        species: "rabbit",
        name: "Thumper",
        blurb: "A jumpy rabbit who never thinks twice about anything.",
      },
    },
  },
  {
    id: "frostbite",
    difficulty: "normal",
    species: "penguin",
    name: "Frostbite",
    blurb: "A cool-headed penguin who watches what you did last round.",
    baseLevel: 5,
    // Ice Waddle comes free with the penguin; Magic Sparkle is the second
    // element, so there is something to read rather than frost twice over.
    powers: ["sparkle"],
    forms: {
      fire: {
        species: "tiger",
        name: "Ember",
        blurb: "A patient tiger who watches what you did last round.",
      },
      frost: {
        species: "penguin",
        name: "Frostbite",
        blurb: "A cool-headed penguin who watches what you did last round.",
      },
      storm: {
        species: "panda",
        name: "Cyclone",
        blurb: "A steady panda who watches what you did last round.",
      },
    },
  },
  {
    id: "vortex",
    difficulty: "hard",
    species: "dragon",
    name: "Vortex",
    blurb: "An old dragon with an answer to everything. You will be read.",
    baseLevel: 8,
    // Dragon Flame is the dragon's own fire, so these two complete the ring.
    powers: ["frost", "whirlwind"],
    forms: {
      fire: {
        species: "dragon",
        name: "Vortex",
        blurb: "An old dragon with an answer to everything. You will be read.",
      },
      frost: {
        species: "owl",
        name: "Blizzard",
        blurb: "An ancient owl with an answer to everything. You will be read.",
      },
      storm: {
        species: "dino",
        name: "Rumble",
        blurb: "A vast old dino with an answer to everything. You will be read.",
      },
    },
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
 * The type this boss should fight as, given the pet it is up against.
 *
 * The element the pupil's own signature BEATS — so the pupil always holds a
 * read. With three elements in a ring that answer is unique, which is why one
 * form per element is exactly enough.
 */
export function bossElementFor(playerElement: PetElement): PetElement {
  return ELEMENTS[playerElement].beats;
}

/** Which of a boss's three forms turns up against this pet. */
export function bossFormFor(
  boss: Boss,
  playerElement: PetElement | null
): BossForm {
  if (!playerElement) {
    return { species: boss.species, name: boss.name, blurb: boss.blurb };
  }
  return boss.forms[bossElementFor(playerElement)];
}

/**
 * The shop powers a matched form carries.
 *
 * Difficulty is still "how many moves are there to choose between", and against
 * one pupil there is only ever ONE element worth holding: the one that beats
 * their pet. "An answer to everything" was the right idea when the roster was
 * fixed and the opponent unknown; matched to a pet, it mostly bought moves the
 * boss could not use. So the ladder is how reliably it can bring that answer:
 *
 *   easy    signature only, and its type is the one the pupil beats — so it
 *           never lands a bonus while the pupil always can, which is what easy
 *           means.
 *   normal  one counter. The no-repeat rule takes it away every other turn, and
 *           it only acts on it half the time anyway (READ_CHANCE in pet-ai).
 *   hard    two counters of the same element, so the rule can never leave it
 *           without one — it reads you every single turn, which is what the
 *           blurb has always promised.
 *
 * Measured over 1,500 duels a side (see the note in tests/pet-pk-opener.test.ts
 * about keeping these numbers honest): giving Hard only one counter left it
 * EASIER than Normal, because the turns the rule stole were spent on moves
 * worth nothing.
 */
function powersFor(boss: Boss, playerElement: PetElement): string[] {
  if (boss.difficulty === "easy") return [];
  // In a ring of three, what beats X is what X's own victim beats.
  const counter = ELEMENTS[ELEMENTS[playerElement].beats].beats;
  const [first, second] = POWERS_FOR[counter];
  return boss.difficulty === "normal" ? [first] : [first, second];
}

/**
 * Build the boss as a fighter, nudged toward the player's level and matched to
 * the player's type.
 *
 * Without the level scaling a level-1 pupil met Vortex at level 8 and lost on
 * the level bonus before the elements mattered, while a level-12 pupil walked
 * through him. The boss meets the player where they are and keeps its own
 * handicap on top: Sparky stays a little below, Frostbite level, Vortex a
 * little above.
 *
 * `against` is the pupil's own pet. Omitted — in the picker before anyone has
 * been chosen, and in the tests that measure the level curve — the boss appears
 * in its default form with its default roster, exactly as it always did.
 */
export function bossFighter(
  boss: Boss,
  playerLevel: number,
  against?: PkFighter | null
): PkFighter {
  const offset = { easy: -2, normal: 0, hard: 2 }[boss.difficulty];
  // Halfway between the boss's own level and the player's, so a very low or
  // very high player still shifts it without the boss simply mirroring them.
  const level = Math.max(
    1,
    Math.round((boss.baseLevel + Math.max(1, playerLevel)) / 2) + offset
  );
  const playerElement = against ? petElement(against) : null;
  const form = bossFormFor(boss, playerElement);
  return {
    pupilId: `${BOSS_ID_PREFIX}${boss.id}`,
    name: form.name,
    pupilName: "The computer",
    species: form.species,
    stageId: stageForLevel(level).id,
    level,
    powers: playerElement ? powersFor(boss, playerElement) : [...boss.powers],
  };
}
