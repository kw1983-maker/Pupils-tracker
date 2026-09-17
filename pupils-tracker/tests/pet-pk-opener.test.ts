import { describe, expect, it } from "vitest";
import {
  attackerAt,
  battleOptions,
  guardsLeft,
  hpStatus,
  resolveTurn,
  selectableFrom,
  toFighter,
  MAX_HP_ROUNDS,
  MOVE_DAMAGE,
  type GuardChoice,
  type MoveOption,
  type PkFighter,
  type PkRound,
} from "@/lib/pet-pk";

const fighter = (species: string) =>
  toFighter({
    pupilId: species,
    pupilName: species,
    species,
    stageId: "adult",
    exp: 40,
    powers: [],
  });

/** How often a side throws a power rather than a punch, when it has the choice. */
const POWER_SHARE = 0.6;
/** How often a guarding side blocks rather than dodges. */
const BLOCK_SHARE = 0.8;

/**
 * One turn-based duel, both sides playing the same mixed strategy.
 *
 * Deliberately NOT chooseAiMove/chooseAiGuard: this measures the RULES, so both
 * seats have to play identically. Running the PC's ladder against itself would
 * measure the ladder instead, and a change to the AI would silently move the
 * number this whole change is judged on.
 */
interface Play {
  /** Set "take" to replay the duel as it was before guarding existed. */
  forced?: GuardChoice;
  /** 1 is perfect play: always the strong move, never the punch. */
  powerShare?: number;
}

function duel(
  a: PkFighter,
  b: PkFighter,
  rand: () => number,
  { forced, powerShare = POWER_SHARE }: Play = {}
) {
  let rounds: PkRound[] = [];
  const superUsed = { a: false, b: false };
  let safety = 0;

  while (!hpStatus(rounds).settled && safety++ < MAX_HP_ROUNDS + 4) {
    const i = rounds.length;
    const who = attackerAt(i);
    const foe: "a" | "b" = who === "a" ? "b" : "a";
    const [att, def] = who === "a" ? [a, b] : [b, a];
    const st = hpStatus(rounds);
    const hpSelf = who === "a" ? st.hpA : st.hpB;
    const hpFoe = who === "a" ? st.hpB : st.hpA;

    const own = rounds[i - 2];
    const lastLabel = (who === "a" ? own?.a.label : own?.b.label) ?? null;
    const options = selectableFrom(
      battleOptions(att, { roundIndex: i, superUsed: superUsed[who] }),
      lastLabel
    );

    let pick: MoveOption | null;
    const big = options.find((o) => o.kind === "super");
    // The same question superIsWorthIt asks: will it finish them, or is there
    // no later?
    if (big && (hpFoe <= MOVE_DAMAGE.super || hpSelf <= MOVE_DAMAGE.power * 2)) {
      pick = big;
      superUsed[who] = true;
    } else {
      const powers = options.filter((o) => o.kind === "power");
      const fists = options.filter((o) => o.kind === "melee");
      const wantPower = rand() < powerShare;
      const from = wantPower && powers.length ? powers : fists.length ? fists : powers;
      pick = from[Math.floor(rand() * from.length)] ?? null;
    }

    // Blind: nothing about `pick` is in scope for this decision.
    const shields = guardsLeft(rounds, foe);
    const guard: GuardChoice =
      forced ?? (shields > 0 ? (rand() < BLOCK_SHARE ? "block" : "dodge") : "take");

    rounds = [...rounds, resolveTurn(i, who, att, def, pick, rand, guard)];
  }
  const status = hpStatus(rounds);
  return { winner: status.winner, turns: rounds.length, onPoints: status.onPoints };
}

const RUNS = 20_000;

function measure(speciesA: string, speciesB: string, play: Play = {}) {
  const a = fighter(speciesA);
  const b = fighter(speciesB);
  let opener = 0;
  let answer = 0;
  let onPoints = 0;
  let turns = 0;
  for (let i = 0; i < RUNS; i++) {
    const r = duel(a, b, Math.random, play);
    if (r.winner === "a") opener += 1;
    else if (r.winner === "b") answer += 1;
    if (r.onPoints) onPoints += 1;
    turns += r.turns;
  }
  return {
    opener: (opener / RUNS) * 100,
    answer: (answer / RUNS) * 100,
    onPoints: (onPoints / RUNS) * 100,
    turns: turns / RUNS,
  };
}

/**
 * The reason the guard exists, measured.
 *
 * Everything else in the suite checks that a rule does what it says. This checks
 * that the rules TOGETHER make a duel worth playing, which is the only thing a
 * class actually notices — and it is the number to re-run after touching any of
 * MOVE_DAMAGE, GUARDS_PER_DUEL, DODGE_PUNISH or SECOND_STRIKE_SHIELD.
 *
 * Both seats play the same mixed strategy on purpose. Running the PC's own
 * ladder against itself would measure lib/pet-ai.ts instead, and a tweak there
 * would silently move the figure this change is judged on.
 */
describe("striking first", () => {
  /**
   * The bug this was all for, kept as a live measurement rather than a comment
   * so that quietly removing the guard cannot quietly restore it.
   *
   * Measured at PERFECT play — always the strong move, the star the moment it
   * finishes them — because that is the line a child finds after two or three
   * bouts, and it was the line that could not be lost from the opening seat:
   * a super plus two powers is exactly MAX_HP, so both pets needed three
   * attacks and only one of them got to go first.
   */
  it("used to decide the duel before a button was pressed", () => {
    const { opener } = measure("tiger", "tiger", {
      forced: "take",
      powerShare: 1,
    });
    expect(opener).toBe(100);
  });

  // And the same perfect line no longer wins itself.
  it("no longer wins on turn order alone, however well it is played", () => {
    const { opener } = measure("tiger", "tiger", { powerShare: 1 });
    expect(opener).toBeLessThan(75);
  });

  it("is now worth next to nothing between identical pets", () => {
    const { opener, answer } = measure("tiger", "tiger");
    expect(opener).toBeGreaterThan(44);
    expect(opener).toBeLessThan(58);
    // Neither seat is the one nobody wants.
    expect(answer).toBeGreaterThan(40);
  });

  it("still ends inside a lesson, and almost never on points", () => {
    const { turns, onPoints } = measure("tiger", "tiger");
    expect(turns).toBeLessThan(MAX_HP_ROUNDS);
    expect(turns).toBeGreaterThan(6); // and it is still a fight, not a race
    expect(onPoints).toBeLessThan(2);
  });

  /**
   * With turn order no longer deciding it, the thing that does is the element
   * triangle — which is the pick a child can actually see and reason about. A
   * fire pet beats a frost pet from either seat.
   */
  it("leaves the type match-up mattering more than the turn order", () => {
    const opening = measure("dragon", "penguin").opener;
    const answering = measure("penguin", "dragon").answer;
    expect(opening).toBeGreaterThan(60);
    expect(answering).toBeGreaterThan(60);
    // The advantage is the pet's, not the seat's: it barely moves between them.
    expect(Math.abs(opening - answering)).toBeLessThan(12);
  });
});
