// What makes a duel feel fair to the child on the losing end of it.
//
// Three rules with nothing in common except that each was, in its own way,
// deciding duels before anybody pressed a button:
//
//   • the no-repeat rule, which exempted the plain punch by accident;
//   • the opening seat, which was nailed to the left-hand pet so the computer
//     always carried the compensating shield;
//   • the element triangle, which most pupils could never use because of the
//     animal they had picked months earlier for its face.

import { describe, expect, it } from "vitest";
import {
  attackerAt,
  battleOptions,
  drawOpener,
  guardsFor,
  guardsLeft,
  hpStatus,
  movePool,
  petElement,
  resolveTurn,
  selectableFrom,
  toFighter,
  GUARDS_PER_DUEL,
  MAX_HP_ROUNDS,
  MELEE_MOVES,
  MOVE_DAMAGE,
  SECOND_STRIKE_SHIELD,
  SPECIES_SIGNATURE,
  type GuardChoice,
  type MoveOption,
  type PkFighter,
  type PkRound,
} from "@/lib/pet-pk";
import {
  advantage,
  ELEMENTS,
  elementOf,
  type PetElement,
} from "@/lib/pet-elements";
import {
  BOSSES,
  bossFighter,
  bossFor,
  bossFormFor,
  type Difficulty,
} from "@/lib/pet-boss";
import { chooseAiGuard, chooseAiMove } from "@/lib/pet-ai";

const fighter = (species: string, powers: string[] = []) =>
  toFighter({
    pupilId: species,
    pupilName: species,
    species,
    stageId: "adult",
    exp: 40,
    powers,
  });

const ALL_SPECIES = Object.keys(SPECIES_SIGNATURE);

describe("the no-repeat rule covers the punch too", () => {
  /**
   * meleeOption rotates the flavour — Punch, Kick, Headbutt, Tail Whip — and a
   * side only attacks on every OTHER round, so its melee label alternated
   * between two words and never matched what it threw last time. Comparing
   * labels therefore exempted the plain attack entirely: a pupil could punch
   * every single turn under a button reading "Used last round — pick something
   * else", while a two-power pet had a real move greyed out every other turn.
   */
  it("locks a punch out whatever this round calls it", () => {
    const f = fighter("tiger", ["frost", "whirlwind"]);
    for (const flavour of MELEE_MOVES) {
      const options = battleOptions(f, { roundIndex: 2 });
      const allowed = selectableFrom(options, flavour.label);
      expect(allowed.some((o) => o.kind === "melee")).toBe(false);
      // And it has not taken the real moves away with it.
      expect(allowed.some((o) => o.kind === "power")).toBe(true);
    }
  });

  it("still lets a pet with only a punch keep punching", () => {
    // Nothing bought and no species signature: the punch is all there is, so
    // the rule has to stand down or the duel cannot continue.
    const bare = toFighter({
      pupilId: "x",
      pupilName: "x",
      stageId: "egg",
      exp: 0,
      powers: [],
    });
    const options = battleOptions(bare, { roundIndex: 0 });
    expect(selectableFrom(options, MELEE_MOVES[0].label).length).toBeGreaterThan(0);
  });

  it("leaves a named power locked as it always was", () => {
    const f = fighter("tiger", ["frost", "whirlwind"]);
    const power = movePool(f).find((o) => o.label === "Frost Breath")!;
    const allowed = selectableFrom(battleOptions(f, { roundIndex: 0 }), power.label);
    expect(allowed.some((o) => o.label === power.label)).toBe(false);
  });
});

describe("the opening seat is drawn, not assigned", () => {
  it("can hand the first swing to either pet", () => {
    const seen = new Set(
      Array.from({ length: 200 }, () => drawOpener(Math.random))
    );
    expect(seen).toEqual(new Set(["a", "b"]));
  });

  it("alternates from whoever opened", () => {
    expect([0, 1, 2, 3].map((i) => attackerAt(i, "a"))).toEqual(["a", "b", "a", "b"]);
    expect([0, 1, 2, 3].map((i) => attackerAt(i, "b"))).toEqual(["b", "a", "b", "a"]);
  });

  /**
   * The whole point of drawing it. The extra shield is compensation for not
   * going first, so it has to follow the seat — otherwise it is just a pip the
   * right-hand pet always has, which against the computer meant a pip the
   * MACHINE always had, in front of a class that can count.
   */
  it("moves the extra shield to whichever side answers", () => {
    for (const opener of ["a", "b"] as const) {
      const answering: "a" | "b" = opener === "a" ? "b" : "a";
      expect(guardsFor(opener, opener)).toBe(GUARDS_PER_DUEL);
      expect(guardsFor(answering, opener)).toBe(
        GUARDS_PER_DUEL + SECOND_STRIKE_SHIELD
      );
    }
  });

  it("defaults to the left pet, so the rules tests still describe one seat", () => {
    expect(attackerAt(0)).toBe("a");
    expect(guardsFor("a")).toBe(GUARDS_PER_DUEL);
  });
});

describe("a boss turns up as a form its opponent can answer", () => {
  /**
   * The bug, measured. In the turn-based modes the element bonus is paid
   * against the DEFENDER'S own type, and a pet a class actually owns has
   * exactly one element. So against the old fixed rosters most of the register
   * played the whole duel with the central mechanic switched off:
   *
   *   vs Frostbite the penguin, 5 species of 16 could ever land a bonus.
   *   vs Vortex the dragon, 7 of 16 — while Vortex landed one on all 16.
   */
  const canAnswer = (pupil: PetElement | null, boss: PetElement | null) =>
    !!pupil && !!boss && ELEMENTS[pupil].beats === boss;

  /** Does this move beat a pet of `target` type? */
  const advantageOver = (
    o: { power: { id: string } | null },
    target: PetElement | null
  ) => {
    const el = elementOf(o.power?.id);
    return !!el && !!target && ELEMENTS[el].beats === target;
  };

  it("used to leave most of the register with no read at all", () => {
    // The default forms are the old fixed rosters, kept for the picker.
    const frostbite = elementOf(SPECIES_SIGNATURE["penguin"].powerId);
    const able = ALL_SPECIES.filter((s) =>
      canAnswer(petElement(fighter(s)), frostbite)
    );
    expect(able.length).toBeLessThan(ALL_SPECIES.length / 2);
  });

  it("now gives every species a read, on every difficulty", () => {
    for (const boss of BOSSES) {
      for (const species of ALL_SPECIES) {
        const pupil = fighter(species);
        const opponent = bossFighter(boss, pupil.level, pupil);
        expect(canAnswer(petElement(pupil), petElement(opponent))).toBe(true);
      }
    }
  });

  it("keeps the ladder at one, two and three moves", () => {
    const pupil = fighter("tiger");
    expect(
      BOSSES.map((b) => movePool(bossFighter(b, pupil.level, pupil)).length)
    ).toEqual([1, 2, 3]);
  });

  /**
   * "An answer to everything" was the right idea against an unknown opponent.
   * Matched to one pet there is only ever ONE element worth holding — the one
   * that beats it — so what Hard needs is not three elements but the same one
   * twice, because the no-repeat rule takes last round's move away.
   *
   * With a single counter the rule left Hard throwing something worthless every
   * other turn, and it measured EASIER than Normal.
   */
  it("leaves hard able to counter on every single turn", () => {
    for (const species of ALL_SPECIES) {
      const pupil = fighter(species);
      const hard = bossFighter(bossFor("hard"), pupil.level, pupil);
      const counters = movePool(hard).filter(
        (o) => advantageOver(o, petElement(pupil))
      );
      expect(counters.length).toBeGreaterThanOrEqual(2);
      // Whichever it threw last round, another is still available.
      for (const thrown of counters) {
        const left = selectableFrom(movePool(hard), thrown.label);
        expect(left.some((o) => advantageOver(o, petElement(pupil)))).toBe(true);
      }
    }
  });

  it("leaves easy with no counter at all", () => {
    const pupil = fighter("penguin");
    const easy = bossFighter(bossFor("easy"), pupil.level, pupil);
    // Easy fights as the type the pupil beats and carries nothing else, so it
    // never lands a bonus while the pupil always can.
    const easyElements = new Set(movePool(easy).map((o) => elementOf(o.power?.id)));
    expect(easyElements.size).toBe(1);
    expect(
      movePool(easy).some((o) => advantageOver(o, petElement(pupil)))
    ).toBe(false);
    expect(canAnswer(petElement(pupil), petElement(easy))).toBe(true);
  });

  it("falls back to its default form when there is nobody to match", () => {
    for (const boss of BOSSES) {
      const form = bossFormFor(boss, null);
      expect(form.species).toBe(boss.species);
      expect(form.name).toBe(boss.name);
      expect(bossFighter(boss, 5).powers).toEqual(boss.powers);
    }
  });

});

/**
 * The ladder has to run the right way, and nothing used to check that it did.
 *
 * It ran BACKWARDS for as long as the guard existed: Hard rationed its shields
 * while healthy, so it took more blows on the chin than Normal did, and a pupil
 * beat Hard more often than Normal — 92.9% against 83.1% over 4,000 duels. Every
 * unit test passed throughout, because each one checked that a rule did what it
 * said rather than what the three rules together add up to.
 *
 * So this measures the thing a class actually notices, the way
 * tests/pet-pk-opener.test.ts measures the seat. Re-run it after touching
 * anything in GUARD_CHANCE, BLOCK_SHARE, READ_CHANCE, powersFor or MOVE_DAMAGE.
 */
describe("the difficulty ladder runs the right way", () => {
  /** A competent child: throw the strong move, spend the star to finish. */
  const pupilPick = (opts: MoveOption[], foe: PkFighter, hpFoe: number) => {
    const foeEl = petElement(foe);
    const big = opts.find((o) => o.kind === "super");
    if (big && hpFoe <= MOVE_DAMAGE.super) return big;
    const strong = opts.filter(
      (o) => o.kind === "power" && advantage(elementOf(o.power?.id), foeEl) === 1
    );
    const from = strong.length
      ? strong
      : opts.filter((o) => o.kind === "power");
    if (from.length) return from[Math.floor(Math.random() * from.length)];
    return opts.find((o) => o.kind === "melee") ?? opts[0] ?? null;
  };

  const winRate = (difficulty: Difficulty, species: string, runs: number) => {
    const pupil = fighter(species);
    const boss = bossFighter(bossFor(difficulty), pupil.level, pupil);
    let wins = 0;
    for (let n = 0; n < runs; n++) {
      let rounds: PkRound[] = [];
      const opener = drawOpener();
      const superUsed = { a: false, b: false };
      let safety = 0;
      while (!hpStatus(rounds).settled && safety++ < MAX_HP_ROUNDS + 4) {
        const i = rounds.length;
        const who = attackerAt(i, opener);
        const foeSide: "a" | "b" = who === "a" ? "b" : "a";
        const [att, def] = who === "a" ? [pupil, boss] : [boss, pupil];
        const st = hpStatus(rounds);
        const own = rounds[i - 2];
        const lastLabel = (who === "a" ? own?.a.label : own?.b.label) ?? null;

        const pick =
          who === "a"
            ? pupilPick(
                selectableFrom(
                  battleOptions(att, { roundIndex: i, superUsed: superUsed.a }),
                  lastLabel
                ),
                def,
                st.hpB
              )
            : chooseAiMove(boss, difficulty, petElement(pupil), lastLabel, Math.random, {
                roundIndex: i,
                superUsed: superUsed.b,
                hpSelf: st.hpB,
                hpOpponent: st.hpA,
                opponentLastGuard:
                  [...rounds].reverse().find((r) => r.winner === "b")?.guard ?? null,
                opponentGuards: guardsLeft(rounds, "a", opener),
              });
        if (pick?.kind === "super") superUsed[who] = true;

        const shields = guardsLeft(rounds, foeSide, opener);
        const guard: GuardChoice =
          foeSide === "a"
            ? shields > 0
              ? Math.random() < 0.7
                ? "block"
                : "dodge"
              : "take"
            : chooseAiGuard(difficulty, {
                guardsLeft: shields,
                opponentLastKind:
                  [...rounds].reverse().find((r) => r.winner === "a")?.a.kind ?? null,
              });
        rounds = [...rounds, resolveTurn(i, who, att, def, pick, Math.random, guard)];
      }
      if (hpStatus(rounds).winner === "a") wins += 1;
    }
    return (wins / runs) * 100;
  };

  it("gets harder with every rung", () => {
    const easy = winRate("easy", "tiger", 700);
    const normal = winRate("normal", "tiger", 700);
    const hard = winRate("hard", "tiger", 700);
    // Measured at roughly 96 / 83 / 61 — generous margins, because this is
    // guarding the ORDER, not the exact figures.
    expect(easy).toBeGreaterThan(normal + 5);
    expect(normal).toBeGreaterThan(hard + 10);
  });

  it("leaves the hardest rung winnable", () => {
    // A wall is not a challenge: a pupil playing well takes Hard about half the
    // time. Guarding every single blow put this at 42%.
    const hard = winRate("hard", "tiger", 700);
    expect(hard).toBeGreaterThan(45);
    expect(hard).toBeLessThan(78);
  });
});
