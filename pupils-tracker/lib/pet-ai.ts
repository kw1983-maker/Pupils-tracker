// The PC opponent's move choice.
//
// ── The one rule that matters ────────────────────────────────────────────────
// The PC is never told the pick it is about to face. Handing it that would make
// Hard unbeatable and, worse, obviously unfair: a child watching the computer
// counter them every single time works out they are being cheated long before
// an adult admits it.
//
// Everything it IS told is public — things a child can see from across the room:
//
//   • the type of the pet in front of it (a penguin is visibly a penguin), which
//     is what the element bonus is paid against in the turn-based modes;
//   • how the player took its LAST blow, and what kind of blow they threw last
//     turn — a habit, not a prediction.
//
// So the ladder is about how well it uses that:
//   easy    ignores it — picks at random, exactly as Watch mode does
//   normal  uses it half the time
//   hard    uses it whenever it holds an answer
//
// The same rule covers DEFENDING (chooseAiGuard, at the bottom of this file).
// The PC is never told the attack it is about to take — it guards blind, exactly
// as the pupil does — so the ladder there is about how well it spends a finite
// number of shields and how readable its block/dodge habit is.

import { ELEMENTS, elementOf, type PetElement } from "./pet-elements";
import {
  battleOptions,
  selectableFrom,
  GUARDS_PER_DUEL,
  MAX_HP,
  MOVE_DAMAGE,
  type GuardChoice,
  type MoveKind,
  type MoveOption,
  type PkFighter,
} from "./pet-pk";
import type { Difficulty } from "./pet-boss";

/** Moves in this list whose element beats `target`. */
export function countersTo(
  options: MoveOption[],
  target: PetElement | null
): MoveOption[] {
  if (!target) return [];
  return options.filter((o) => {
    const el = elementOf(o.power?.id);
    return el !== null && ELEMENTS[el].beats === target;
  });
}

/** How often each difficulty acts on what it saw last round. */
const READ_CHANCE: Record<Difficulty, number> = {
  easy: 0,
  normal: 0.5,
  hard: 1,
};

/** How often Easy throws its super away on a round that does not matter. */
const EASY_SUPER_CHANCE = 0.25;

export interface AiContext {
  /** Which round this is, so the punch flavour matches the player's. */
  roundIndex?: number;
  /** True once the PC has spent its super. */
  superUsed?: boolean;
  /** Life left on each side, for deciding when the super is worth spending. */
  hpSelf?: number;
  hpOpponent?: number;
  /**
   * How the player took the PC's LAST blow, which is the only thing worth
   * knowing about their guarding — and, being last round's, the only thing the
   * PC is allowed to know (see the rule at the top of this file).
   *
   * A pupil who dodged is a pupil to punch.
   */
  opponentLastGuard?: GuardChoice | null;
  /** Guards the player has left; with none, there is nothing to read. */
  opponentGuards?: number;
}

/**
 * Is this a round worth spending the super on?
 *
 * The PC holds it until the duel is actually on the line — when the super would
 * finish the other pet, or when it is close enough to losing that there may be
 * no later. Spending it in round one and then losing anyway reads as the
 * computer wasting its best move, and a child who has been saving theirs feels
 * daft for having done so.
 */
function superIsWorthIt(
  { hpSelf = MAX_HP, hpOpponent = MAX_HP }: AiContext,
  difficulty: Difficulty
): boolean {
  if (difficulty === "easy") return false;
  // It finishes them outright — the best possible moment to spend it.
  const lethal = hpOpponent <= MOVE_DAMAGE.super;
  // Normal takes a kill it can see and nothing more. It does not watch its own
  // life bar, so a pupil who gets it low can still catch it holding a star it
  // will never get to spend — which is the difference between this rung and the
  // one above, and the thing a pupil beats Normal by doing. Both used to run
  // this same test, so the middle of the ladder had no super behaviour of its
  // own at all.
  if (difficulty === "normal") return lethal;
  // Or it is now or never: two more clean hits and there is no later.
  const desperate = hpSelf <= MOVE_DAMAGE.power * 2;
  return lethal || desperate;
}

/**
 * Choose the PC's move for this round.
 *
 * @param targetElement the DEFENDING pet's own type — what a move is strong
 *   against in the turn-based modes (see petElement in lib/pet-pk.ts). Public
 *   information: you can see it is a penguin. (It was once the element the
 *   player threw last round, back when both sides threw at once.)
 * @param ownLastLabel  the PC's own previous move, so it does not repeat itself
 */
export function chooseAiMove(
  fighter: PkFighter,
  difficulty: Difficulty,
  targetElement: PetElement | null,
  ownLastLabel: string | null,
  rand: () => number = Math.random,
  context: AiContext = {}
): MoveOption | null {
  const options = battleOptions(fighter, {
    roundIndex: context.roundIndex ?? 0,
    superUsed: context.superUsed ?? false,
  });
  const pool = selectableFrom(options, ownLastLabel);
  if (pool.length === 0) return null;

  const big = pool.find((o) => o.kind === "super");
  if (big) {
    // Easy never plans, so it just sometimes lets fly.
    const spend =
      difficulty === "easy"
        ? rand() < EASY_SUPER_CHANCE
        : superIsWorthIt(context, difficulty);
    // A super takes its round whatever the other pet throws, so there is no
    // match-up to read here — only the question of when it is worth spending.
    if (spend) return big;
  }

  const wantsToRead = rand() < READ_CHANCE[difficulty];

  // Reading the GUARD comes first, because it beats reading the element: a
  // punch into a dodge is worth 20 and the best type read is worth 30, but the
  // type read is worth nothing at all if they slip it. Same information rule as
  // everything else here — what they did LAST round, never this one.
  if (wantsToRead && punishesADodge(context)) {
    const fist = pool.find((o) => o.kind === "melee");
    if (fist) return fist;
  }

  if (wantsToRead && targetElement) {
    const counters = countersTo(pool, targetElement).filter((o) => o.kind !== "super");
    if (counters.length > 0) {
      return counters[Math.floor(rand() * counters.length)] ?? null;
    }
  }

  // No read, or nothing in the collection answers what they threw. Never leak
  // the super into a random pick — it is spent deliberately or not at all.
  const ordinary = pool.filter((o) => o.kind !== "super");
  const from = ordinary.length > 0 ? ordinary : pool;
  return from[Math.floor(rand() * from.length)] ?? null;
}

/**
 * Is the player dodging, and do they still have a guard to do it with?
 *
 * Only worth acting on while they can actually guard — punching a pupil with no
 * shields left throws away half the blow for a read that cannot come true.
 */
function punishesADodge({
  opponentLastGuard = null,
  opponentGuards = GUARDS_PER_DUEL,
}: AiContext): boolean {
  return opponentLastGuard === "dodge" && opponentGuards > 0;
}

/**
 * How often each difficulty spends a guard at all.
 *
 * Easy mostly stands there and takes it, which is what makes it easy — and what
 * makes the shields on its life bar something a pupil beats it by using better.
 */
const GUARD_CHANCE: Record<Difficulty, number> = {
  easy: 0.25,
  normal: 0.6,
  // Not 1. Once the rationing came out (see chooseAiGuard) a Hard boss that
  // guarded EVERY blow took the pupil down to a 42% win rate at near-perfect
  // play — a wall rather than a challenge, and the jump from Normal was 41
  // points. At 0.85 the ladder reads 96 / 83 / 60 across the three, measured
  // over 1,500 duels for each of the 16 species.
  hard: 0.85,
};

/**
 * How often a guarding PC blocks rather than dodges.
 *
 * Block-heavy on purpose. Against a mixed attacker, blocking is the safer half
 * of the guess — a dodge that meets a fist costs double — so a defender who
 * dodges freely is a defender who can be punched. Hard sits near the point where
 * the pupil gains nothing by favouring either attack, so it cannot be read; Easy
 * flips a coin and gets caught out, which is the lesson.
 */
const BLOCK_SHARE: Record<Difficulty, number> = {
  easy: 0.5,
  normal: 0.65,
  hard: 0.8,
};

export interface GuardContext {
  /**
   * Shields it has left.
   *
   * Its own life used to be here too, so it could ration them. Nothing rations
   * them any more — see chooseAiGuard — and a field nothing reads is a field
   * that quietly suggests a decision is being made when it is not.
   */
  guardsLeft?: number;
  /**
   * The kind of move the PLAYER threw last turn — last round's information, so
   * the PC is reading a habit rather than the pick it is about to be hit by.
   */
  opponentLastKind?: MoveKind | null;
}

/**
 * Choose how the PC takes the blow it is about to receive.
 *
 * It is told NOTHING about that blow. The guard is picked blind on both sides of
 * the screen, which is the only reason it is a game rather than a tax — see the
 * note on GuardChoice in lib/pet-pk.ts.
 */
export function chooseAiGuard(
  difficulty: Difficulty,
  {
    guardsLeft = GUARDS_PER_DUEL,
    opponentLastKind = null,
  }: GuardContext = {},
  rand: () => number = Math.random
): GuardChoice {
  if (guardsLeft <= 0) return "take";

  /**
   * Hard used to ration its shields — hold them "until a blow could actually
   * matter", on the theory that spending all three early and standing bare at
   * the end is how a pupil beats it.
   *
   * Measured, it was the reverse, and it was the reason the ladder ran
   * backwards: Hard took 58% of blows on the chin where Normal took 56%, and
   * slipped only 12% where Normal slipped 16%, so a pupil beat Hard more often
   * than Normal (92.9% against 83.1% over 4,000 duels).
   *
   * The theory was wrong because damage here is FLAT. A power costs 20 in the
   * first exchange and 20 in the last, so a shield saves exactly as much
   * whenever it is spent — there is nothing to save it FOR. Hoarding just
   * returns shields unused at the end of a bout that has already been lost.
   *
   * So the ladder is GUARD_CHANCE alone, which is what it reads as: Easy mostly
   * stands there, Normal guards more than half of blows, Hard most of them.
   */
  if (rand() >= GUARD_CHANCE[difficulty]) return "take";

  let blockShare = BLOCK_SHARE[difficulty];
  // A pupil who just punched is a pupil to block; one who just threw a power is
  // one worth slipping. Only the top of the ladder acts on it.
  if (difficulty === "hard" && opponentLastKind === "melee") blockShare = 1;
  else if (difficulty === "hard" && opponentLastKind === "power") blockShare = 0.55;

  return rand() < blockShare ? "block" : "dodge";
}
