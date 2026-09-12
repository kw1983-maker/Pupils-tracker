// The PC opponent's move choice.
//
// ── The one rule that matters ────────────────────────────────────────────────
// Moves are thrown SIMULTANEOUSLY. The AI is therefore only ever told what the
// player threw in the PREVIOUS round — never the pick they have just locked in.
// Handing it the current pick would make Hard unbeatable and, worse, obviously
// unfair: a child watching the computer counter them every single time works out
// they are being cheated long before an adult admits it.
//
// So the ladder is about how well it uses last round's information:
//   easy    ignores it — picks at random, exactly as Watch mode does
//   normal  uses it half the time
//   hard    uses it whenever it holds an answer

import { ELEMENTS, elementOf, type PetElement } from "./pet-elements";
import {
  battleOptions,
  selectableFrom,
  MAX_HP,
  MOVE_DAMAGE,
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
  // Or it is now or never: two more clean hits and there is no later.
  const desperate = hpSelf <= MOVE_DAMAGE.power * 2;
  return lethal || desperate;
}

/**
 * Choose the PC's move for this round.
 *
 * @param opponentLast  the element the player threw LAST round (null in round 1)
 * @param ownLastLabel  the PC's own previous move, so it doesn't repeat itself
 */
export function chooseAiMove(
  fighter: PkFighter,
  difficulty: Difficulty,
  opponentLast: PetElement | null,
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
  if (wantsToRead && opponentLast) {
    const counters = countersTo(pool, opponentLast).filter((o) => o.kind !== "super");
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
