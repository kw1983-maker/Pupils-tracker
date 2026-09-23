/**
 * Which window of the cinematic a blow plays in.
 *
 * Lives here rather than inside InteractiveDuel because three places have to
 * agree about it and they kept not agreeing:
 *
 *   • the component, when it renders the stage;
 *   • the component again, when it schedules the soundtrack;
 *   • the tests, which had grown their own verbatim copy.
 *
 * The bug that copy was written for: the clip was chosen twice, once for the
 * audio and once for the picture, and the two disagreed about a super that
 * finished the duel. The audio played the whole power-up and finisher while the
 * picture played a three-second turn, and then the knockout clip fired a SECOND
 * finisher. It looked and sounded like the computer using two supers in a row.
 *
 * One definition, imported by all three, is the only version of that fix that
 * cannot quietly come undone.
 */

import type { PkRound } from "@/lib/pet-pk";
import { SEGMENT } from "./storyboard";

export interface FightClip {
  from: number;
  to: number;
  /** True when this clip carries the ending itself, so nothing follows it. */
  endsDuel: boolean;
}

/**
 * The clip one blow plays in.
 *
 * A super that finishes a pet runs straight through as one ending: break
 * through, fire, knock them down, name the winner.
 */
export function clipFor(
  superThrown: boolean,
  finishes: boolean,
  attacker: "a" | "b"
): FightClip {
  if (superThrown && finishes) {
    return { from: SEGMENT.super.from, to: SEGMENT.finish.to, endsDuel: true };
  }
  if (superThrown) return { ...SEGMENT.super, endsDuel: false };
  return { ...(attacker === "b" ? SEGMENT.turnB : SEGMENT.turnA), endsDuel: false };
}

/**
 * Has a finisher already fired in this duel?
 *
 * A super plays the finisher as its own scene, and SEGMENT.knockout plays it
 * again on the way to the knockdown — so a pet that supered early and then won
 * with an ordinary punch fired the same beam twice, which the class reads as the
 * computer spending a second superpower.
 */
export function finisherAlreadySpent(rounds: PkRound[]): boolean {
  return rounds.some(
    (r) => (r.winner === "a" ? r.a : r.winner === "b" ? r.b : null)?.kind === "super"
  );
}

/**
 * The clip that closes a duel out, played after the blow that settles it.
 *
 * Once the finisher has been spent the ending resumes where the super scene
 * stopped and delivers only the knockdown.
 */
export function endingClip(finisherSpent: boolean): { from: number; to: number } {
  return finisherSpent ? SEGMENT.knockdown : SEGMENT.knockout;
}
