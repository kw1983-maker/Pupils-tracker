// The element triangle — what makes choosing a move a decision rather than a
// colour swatch.
//
// Watch mode never needed this: both sides rolled at random, so the move a pet
// threw only ever picked the tint and the sound. The moment a child is asked to
// pick one, the pick has to be worth thinking about, and "which of my four moves
// is best here" needs an answer that isn't "they're identical".
//
// Three groups, three powers each, stated as a sentence a Year-2 child can
// repeat back:
//
//        🔥 Fire  melts   ❄️ Frost
//        ❄️ Frost freezes 🌪️ Storm
//        🌪️ Storm blows out 🔥 Fire
//
// Kept to three so the whole rule fits on one line of the screen. A five-element
// wheel is the same idea with four times the memorising, and the class only gets
// about two minutes with this before someone wants a turn.

export type PetElement = "fire" | "frost" | "storm";

export interface ElementMeta {
  id: PetElement;
  label: string;
  emoji: string;
  /** The element this one is strong against. */
  beats: PetElement;
  /** Said when this element lands its advantage. */
  verb: string;
}

export const ELEMENTS: Record<PetElement, ElementMeta> = {
  fire: { id: "fire", label: "Fire", emoji: "🔥", beats: "frost", verb: "melts" },
  frost: { id: "frost", label: "Frost", emoji: "❄️", beats: "storm", verb: "freezes" },
  storm: { id: "storm", label: "Storm", emoji: "🌪️", beats: "fire", verb: "blows out" },
};

/**
 * Which group each power belongs to. Every power in lib/pet-powers.ts appears
 * exactly once, three to a group, so no element is the obviously stocked one.
 *
 * Grouped by how the effect looks on screen rather than by price — a child
 * reading the board sees the ❄️ badge on Bubble Blast and Super Flight and
 * accepts them as cold/airy, which is all the rule needs.
 */
export const ELEMENT_OF: Record<string, PetElement> = {
  // 🔥 heat and energy
  fire: "fire",
  lightning: "fire",
  laser: "fire",
  // ❄️ cold and air
  frost: "frost",
  bubble: "frost",
  flight: "frost",
  // 🌪️ spin and light
  whirlwind: "storm",
  sparkle: "storm",
  rainbow: "storm",
};

/** The element a power belongs to, or null for a plain tackle. */
export function elementOf(powerId: string | null | undefined): PetElement | null {
  if (!powerId) return null;
  return ELEMENT_OF[powerId] ?? null;
}

/**
 * How much the element match-up is worth.
 *
 * +4 is deliberately about what a critical pays, against a 0–13 roll: reading
 * the opponent right turns a coin flip into roughly two-in-three, so the pick
 * matters without settling the duel. A wrong pick costs NOTHING — there is no
 * negative — because a child who guesses badly should feel they missed a chance,
 * not that they were punished for playing.
 */
export const ELEMENT_BONUS = 4;

/**
 * 1 when `a` is strong against `b`, -1 when `b` is strong against `a`, 0 when
 * they are the same element or either side is throwing a plain tackle.
 *
 * Note that -1 is reported, not applied: callers award ELEMENT_BONUS on 1 and
 * nothing otherwise. The sign is there so the UI can label the other side's
 * advantage too.
 */
export function advantage(
  a: PetElement | null,
  b: PetElement | null
): 1 | 0 | -1 {
  if (!a || !b || a === b) return 0;
  if (ELEMENTS[a].beats === b) return 1;
  if (ELEMENTS[b].beats === a) return -1;
  return 0;
}

/** The bonus one side earns against the other. Never negative. */
export function elementBonus(
  mine: PetElement | null,
  theirs: PetElement | null
): number {
  return advantage(mine, theirs) === 1 ? ELEMENT_BONUS : 0;
}

/** "Fire melts Frost" — the line shown when an advantage lands. */
export function advantageLine(mine: PetElement, theirs: PetElement): string {
  return `${ELEMENTS[mine].label} ${ELEMENTS[mine].verb} ${ELEMENTS[theirs].label}!`;
}
