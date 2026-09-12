import { describe, expect, it } from "vitest";
import { chooseAiMove, countersTo } from "@/lib/pet-ai";
import { BOSSES, bossFighter, bossFor, isBossId } from "@/lib/pet-boss";
import { ELEMENTS, elementOf, type PetElement } from "@/lib/pet-elements";
import {
  battleOptions,
  movePool,
  toFighter,
  MAX_HP,
  MOVE_DAMAGE,
  type PkFighter,
} from "@/lib/pet-pk";

const pupilPet = (powers: string[], species = "tiger", exp = 40): PkFighter =>
  toFighter({
    pupilId: "p1",
    pupilName: "Ama",
    species,
    stageId: "adult",
    exp,
    powers,
  });

/** Every element the fighter can actually throw. */
const elementsOf = (f: PkFighter) =>
  new Set(movePool(f).map((o) => elementOf(o.power?.id)));

describe("house bosses", () => {
  it("offers one boss per difficulty, each with a reserved id", () => {
    expect(BOSSES.map((b) => b.difficulty)).toEqual(["easy", "normal", "hard"]);
    for (const b of BOSSES) {
      expect(isBossId(bossFighter(b, 4).pupilId)).toBe(true);
    }
  });

  it("gets harder up the ladder", () => {
    const at = (d: "easy" | "normal" | "hard") => bossFighter(bossFor(d), 5);
    expect(at("easy").level).toBeLessThan(at("normal").level);
    expect(at("normal").level).toBeLessThan(at("hard").level);
    expect(movePool(at("easy")).length).toBeLessThan(movePool(at("hard")).length);
  });

  // A level-1 pupil meeting Vortex at level 8 loses on the level bonus before
  // the elements ever matter, and stops wanting a turn.
  it("meets the player near their own level", () => {
    for (const b of BOSSES) {
      const low = bossFighter(b, 1).level;
      const high = bossFighter(b, 20).level;
      expect(high).toBeGreaterThan(low);
      expect(low).toBeGreaterThanOrEqual(1);
    }
  });

  it("always has something to fight with", () => {
    for (const b of BOSSES) {
      expect(movePool(bossFighter(b, 5)).length).toBeGreaterThan(0);
    }
  });

  /**
   * The ladder climbs one move at a time, from what a pupil's own pet brings.
   *
   * Every hatched pet in a real class owns its species signature and nothing
   * else — one power, a punch and a super. A boss carrying seven powers is not
   * "hard", it is a different game: it never gets locked out by the no-repeat
   * rule, and it holds an answer to every type while the pupil holds one.
   */
  it("climbs one move at a time from what a pupil's pet brings", () => {
    expect(BOSSES.map((b) => movePool(bossFighter(b, 2)).length)).toEqual([1, 2, 3]);
  });
});

describe("counters", () => {
  it("finds only moves that beat the target element", () => {
    const f = bossFighter(bossFor("hard"), 8);
    for (const el of Object.keys(ELEMENTS) as PetElement[]) {
      for (const o of countersTo(battleOptions(f), el)) {
        expect(ELEMENTS[elementOf(o.power?.id)!].beats).toBe(el);
      }
    }
  });

  it("finds nothing when there is nothing to read", () => {
    expect(countersTo(battleOptions(bossFighter(bossFor("hard"), 8)), null)).toEqual([]);
  });
});

describe("the PC opponent", () => {
  const hard = bossFighter(bossFor("hard"), 8);

  it("answers what the player threw last round, on hard", () => {
    for (const el of Object.keys(ELEMENTS) as PetElement[]) {
      if (countersTo(battleOptions(hard), el).length === 0) continue;
      for (let i = 0; i < 200; i++) {
        // superUsed so the big move is out of the way — it is chosen on its own
        // terms and is covered separately below.
        const pick = chooseAiMove(hard, "hard", el, null, Math.random, {
          superUsed: true,
        });
        expect(ELEMENTS[elementOf(pick!.power?.id)!].beats).toBe(el);
      }
    }
  });

  it("ignores last round entirely on easy", () => {
    // Easy picks uniformly, so over many draws it uses elements that do NOT
    // counter — otherwise it is just hard under another name.
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      seen.add(
        chooseAiMove(hard, "easy", "frost", null, Math.random, { superUsed: true })!
          .label
      );
    }
    expect(seen.size).toBeGreaterThan(countersTo(battleOptions(hard), "frost").length);
  });

  it("sits between the two on normal", () => {
    const rate = (d: "easy" | "normal" | "hard") => {
      let hits = 0;
      for (let i = 0; i < 3000; i++) {
        const pick = chooseAiMove(hard, d, "frost", null, Math.random, {
          superUsed: true,
        });
        if (elementOf(pick!.power?.id) === "fire") hits += 1;
      }
      return hits / 3000;
    };
    const easy = rate("easy");
    const normal = rate("normal");
    expect(normal).toBeGreaterThan(easy + 0.1);
    expect(normal).toBeLessThan(rate("hard") - 0.1);
  });

  // The rule that keeps it fair rather than merely difficult: it is told what
  // the player threw LAST round, never the pick they have just locked in.
  it("cannot do better than chance against a player who never repeats", () => {
    // The player alternates, so last round's element is always the one they are
    // about to stop using. A cheating AI would still counter the current move.
    const player = pupilPet(["fire", "frost", "whirlwind"]);
    const els = [...elementsOf(player)].filter(Boolean) as PetElement[];
    let countered = 0;
    for (let i = 0; i < 2000; i++) {
      const previous = els[i % els.length];
      const current = els[(i + 1) % els.length];
      const pick = chooseAiMove(hard, "hard", previous, null, Math.random, {
        superUsed: true,
      });
      const el = elementOf(pick!.power?.id)!;
      if (ELEMENTS[el].beats === current) countered += 1;
      // It answered the PREVIOUS move, which is all it was given.
      expect(ELEMENTS[el].beats).toBe(previous);
    }
    expect(countered).toBe(0);
  });

  it("falls back to a normal pick when it holds no answer", () => {
    // Sparky has no shop powers at all, so nothing in his pool counters frost
    // except by luck of his signature.
    const sparky = bossFighter(bossFor("easy"), 3);
    for (let i = 0; i < 200; i++) {
      const pick = chooseAiMove(sparky, "hard", "fire", null, Math.random, {
        superUsed: true,
      });
      expect(pick).not.toBeNull();
      expect(battleOptions(sparky).some((o) => o.label === pick!.label)).toBe(true);
    }
  });

  it("does not repeat its own last move when it has another answer", () => {
    for (let i = 0; i < 300; i++) {
      const opts = { superUsed: true };
      const first = chooseAiMove(hard, "hard", "frost", null, Math.random, opts)!;
      const counters = countersTo(battleOptions(hard), "frost");
      if (counters.length < 2) break;
      const next = chooseAiMove(hard, "hard", "frost", first.label, Math.random, opts)!;
      expect(next.label).not.toBe(first.label);
    }
  });
});

describe("when the PC spends its super", () => {
  const hard = bossFighter(bossFor("hard"), 8);
  const isSuper = (o: { kind: string } | null) => o?.kind === "super";

  const rate = (d: "easy" | "normal" | "hard", ctx: object, runs = 2000) => {
    let n = 0;
    for (let i = 0; i < runs; i++) {
      if (isSuper(chooseAiMove(hard, d, null, null, Math.random, ctx))) n += 1;
    }
    return n / runs;
  };

  // Spending it while both pets are fresh and then losing anyway reads as the
  // computer wasting its best move, and a pupil who has been saving theirs
  // feels daft for having done so.
  it("holds it back while the duel is still wide open", () => {
    const fresh = { hpSelf: MAX_HP, hpOpponent: MAX_HP };
    expect(rate("hard", fresh)).toBe(0);
    expect(rate("normal", fresh)).toBe(0);
  });

  it("throws it the moment it would finish the other pet", () => {
    expect(rate("hard", { hpSelf: MAX_HP, hpOpponent: MOVE_DAMAGE.super })).toBe(1);
    expect(rate("hard", { hpSelf: MAX_HP, hpOpponent: MOVE_DAMAGE.super - 10 })).toBe(1);
  });

  it("throws it when there may be no later", () => {
    expect(rate("hard", { hpSelf: MOVE_DAMAGE.power, hpOpponent: MAX_HP })).toBe(1);
  });

  it("never leaks into an ordinary random pick", () => {
    // Easy is the only difficulty that fires it without a plan, and even then
    // only sometimes — never as just another face on the dice.
    const easy = rate("easy", { hpSelf: MAX_HP, hpOpponent: MAX_HP }, 4000);
    expect(easy).toBeGreaterThan(0);
    expect(easy).toBeLessThan(0.45);
  });

  it("cannot throw it twice", () => {
    for (let i = 0; i < 300; i++) {
      expect(
        isSuper(
          chooseAiMove(hard, "hard", null, null, Math.random, {
            superUsed: true,
            hpSelf: 20,
            hpOpponent: 20,
          })
        )
      ).toBe(false);
    }
  });
});

describe("one super each, however the turns fall", () => {
  const hard = bossFighter(bossFor("hard"), 8);

  // Regression: the computer took two turns in one tick, and each of them read
  // superUsed as still false — so it spent a super it no longer had.
  it("is never offered a second one once it is marked spent", () => {
    const desperate = { hpSelf: 10, hpOpponent: 100, superUsed: true };
    for (let i = 0; i < 500; i++) {
      const pick = chooseAiMove(hard, "hard", null, null, Math.random, desperate);
      expect(pick!.kind).not.toBe("super");
    }
  });

  it("offers exactly one while it is unspent", () => {
    const opts = battleOptions(hard, { superUsed: false });
    expect(opts.filter((o) => o.kind === "super")).toHaveLength(1);
    expect(battleOptions(hard, { superUsed: true }).filter((o) => o.kind === "super"))
      .toHaveLength(0);
  });

  // Walking a whole duel the way the screen does: once it throws the super, the
  // flag is set and it can never come back.
  it("cannot spend it twice across a whole duel", () => {
    let spent = false;
    let thrown = 0;
    for (let turn = 0; turn < 12; turn++) {
      const pick = chooseAiMove(hard, "hard", null, null, Math.random, {
        roundIndex: turn,
        superUsed: spent,
        hpSelf: 30,
        hpOpponent: 30,
      });
      if (pick!.kind === "super") {
        thrown += 1;
        spent = true;
      }
    }
    expect(thrown).toBe(1);
  });
});
