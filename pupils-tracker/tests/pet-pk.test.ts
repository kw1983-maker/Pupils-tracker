import { describe, expect, it } from "vitest";
import {
  PK_ROUNDS,
  SPECIES_SIGNATURE,
  collectionBonus,
  movePool,
  powerStrength,
  runPk,
  toFighter,
  type PkFighter,
} from "@/lib/pet-pk";
import { PET_POWERS, powerById } from "@/lib/pet-powers";
import { PET_SPECIES } from "@/lib/pets";

const fighter = (
  name: string,
  exp: number,
  powers: string[],
  species = "tiger"
): PkFighter =>
  toFighter({
    pupilId: name,
    pupilName: name,
    species,
    stageId: "adult",
    exp,
    powers,
  });

/** Win rate for A over many duels — the balance claims are statistical. */
function winRate(a: PkFighter, b: PkFighter, runs = 20_000) {
  let aWins = 0;
  let bWins = 0;
  for (let i = 0; i < runs; i++) {
    const r = runPk(a, b);
    if (r.winner === "a") aWins++;
    else if (r.winner === "b") bWins++;
  }
  return { a: (aWins / runs) * 100, b: (bWins / runs) * 100 };
}

describe("duel structure", () => {
  it("stops as soon as the duel is settled, and never ends level", () => {
    for (let i = 0; i < 2000; i++) {
      const r = runPk(fighter("A", 40, []), fighter("B", 40, []));
      // Always at least a majority's worth, never more than the schedule plus
      // sudden death, and numbered in order.
      expect(r.rounds.length).toBeGreaterThanOrEqual(2);
      expect(r.rounds.map((x) => x.index)).toEqual(
        r.rounds.map((_, idx) => idx)
      );
      if (r.flawless) {
        // Won in straight sets: the dead final round is not played.
        expect(r.rounds.length).toBeLessThan(PK_ROUNDS);
        expect(r.winner).not.toBe("draw");
      }
      if (r.suddenDeath) expect(r.rounds.length).toBeGreaterThan(PK_ROUNDS);
    }
  });

  it("goes to sudden death rather than settling for a draw", () => {
    let draws = 0;
    for (let i = 0; i < 5000; i++) {
      if (runPk(fighter("A", 40, []), fighter("B", 40, [])).winner === "draw") {
        draws++;
      }
    }
    // Was ~9%; sudden death should make an unresolved duel rare.
    expect(draws / 5000).toBeLessThan(0.02);
  });

  it("keeps the score consistent with the rounds", () => {
    for (let i = 0; i < 500; i++) {
      const r = runPk(
        fighter("A", 60, ["fire"]),
        fighter("B", 30, ["sparkle"])
      );
      expect(r.scoreA).toBe(r.rounds.filter((x) => x.winner === "a").length);
      expect(r.scoreB).toBe(r.rounds.filter((x) => x.winner === "b").length);
      expect(r.scoreA + r.scoreB).toBeLessThanOrEqual(r.rounds.length);
      const expected =
        r.scoreA > r.scoreB ? "a" : r.scoreB > r.scoreA ? "b" : "draw";
      expect(r.winner).toBe(expected);
    }
  });

  it("adds each round up from its own parts", () => {
    const r = runPk(fighter("A", 90, ["fire", "frost"]), fighter("B", 20, []));
    for (const round of r.rounds) {
      for (const move of [round.a, round.b]) {
        const crit = move.critical ? 4 : 0;
        expect(move.total).toBe(move.strength + move.levelBonus + move.roll + crit);
      }
      const expected =
        round.a.total > round.b.total
          ? "a"
          : round.b.total > round.a.total
            ? "b"
            : "draw";
      expect(round.winner).toBe(expected);
    }
  });

  it("is reproducible when the randomness is", () => {
    const seeded = () => {
      let s = 42;
      return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
    };
    const a = fighter("A", 80, ["fire", "whirlwind"]);
    const b = fighter("B", 40, ["sparkle"]);
    expect(runPk(a, b, seeded())).toEqual(runPk(a, b, seeded()));
  });
});

describe("what a pet can attack with", () => {
  it("gives every species its own signature move", () => {
    for (const s of PET_SPECIES) {
      const sig = SPECIES_SIGNATURE[s.id];
      expect(sig, `no signature for ${s.id}`).toBeTruthy();
      expect(powerById(sig.powerId), `${s.id} -> unknown power`).toBeTruthy();
    }
  });

  it("lets a pet fight even with nothing bought", () => {
    const pool = movePool(fighter("A", 10, [], "fox"));
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.some((m) => m.label === SPECIES_SIGNATURE.fox.label)).toBe(true);
  });

  it("keeps two species distinguishable before anyone shops", () => {
    const fox = movePool(fighter("A", 10, [], "fox")).map((m) => m.label);
    const penguin = movePool(fighter("B", 10, [], "penguin")).map((m) => m.label);
    expect(fox).not.toEqual(penguin);
  });

  it("offers bought powers alongside the signature, without duplicates", () => {
    const pool = movePool(fighter("A", 10, ["fire", "fire", "frost"], "tiger"));
    const labels = pool.map((m) => m.label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).toContain("Fire Breath");
    expect(labels).toContain("Frost Breath");
    expect(labels).toContain(SPECIES_SIGNATURE.tiger.label);
  });

  it("ignores power ids that are not in the catalog", () => {
    const f = fighter("A", 10, ["fire", "not-a-power"]);
    expect(f.powers).toEqual(["fire"]);
  });

  // Regression: every round used to show the same move, which made the duel
  // look broken even though the maths was fine.
  it("avoids repeating the previous round's move when it has a choice", () => {
    const a = fighter("A", 40, ["fire", "frost", "whirlwind"]);
    let sameAllThree = 0;
    for (let i = 0; i < 400; i++) {
      const labels = runPk(a, fighter("B", 40, [])).rounds.map((r) => r.a.label);
      if (labels[0] === labels[1] && labels[1] === labels[2]) sameAllThree++;
      // Consecutive rounds must never repeat.
      expect(labels[0]).not.toBe(labels[1]);
      expect(labels[1]).not.toBe(labels[2]);
    }
    expect(sameAllThree).toBe(0);
  });
});

describe("balance", () => {
  it("scales a power's clout with its price", () => {
    for (const p of PET_POWERS) {
      expect(powerStrength(p)).toBe(Math.max(1, Math.round(p.cost / 10)));
    }
    expect(powerStrength(powerById("sparkle")!)).toBe(1);
    expect(powerStrength(powerById("whirlwind")!)).toBe(3);
  });

  it("gives evenly matched pets an even chance", () => {
    const r = winRate(fighter("A", 40, []), fighter("B", 40, []));
    expect(Math.abs(r.a - r.b)).toBeLessThan(4);
  });

  // Was a bug: a dragon buying Magic Sparkle used to get WORSE, because the
  // weaker bought move diluted its pool. The collection bonus fixes it.
  it("makes even the cheapest power worth buying", () => {
    const r = winRate(
      fighter("A", 40, ["sparkle"], "dragon"),
      fighter("B", 40, [], "dragon")
    );
    expect(r.a).toBeGreaterThan(r.b + 8);
  });

  it("never lets a purchase make a pet weaker, for any species", () => {
    for (const s of PET_SPECIES) {
      const before = fighter("B", 40, [], s.id);
      for (const p of PET_POWERS) {
        const after = fighter("A", 40, [p.id], s.id);
        const avg = (f: PkFighter) =>
          movePool(f).reduce((sum, m) => sum + m.strength, 0) /
            movePool(f).length +
          collectionBonus(f);
        expect(
          avg(after),
          `${s.id} got weaker after buying ${p.id}`
        ).toBeGreaterThan(avg(before));
      }
    }
  });

  // Was a bug: signature strength came from the power it borrowed its look
  // from, so a panda started 3x stronger than a mouse. It is now flat.
  it("starts every species on an equal footing", () => {
    const opening = PET_SPECIES.map((s) => {
      const pool = movePool(fighter("X", 10, [], s.id));
      expect(pool).toHaveLength(1); // just the signature, nothing bought
      return pool[0].strength;
    });
    expect(new Set(opening).size).toBe(1);
  });

  it("gives two pets with different species but no powers an even chance", () => {
    const r = winRate(fighter("A", 40, [], "mouse"), fighter("B", 40, [], "panda"));
    expect(Math.abs(r.a - r.b)).toBeLessThan(4);
  });

  it("lands criticals often enough to be exciting, rarely enough to matter", () => {
    let crits = 0;
    let moves = 0;
    for (let i = 0; i < 4000; i++) {
      for (const round of runPk(fighter("A", 40, []), fighter("B", 40, [])).rounds) {
        for (const m of [round.a, round.b]) {
          moves += 1;
          if (m.critical) crits += 1;
        }
      }
    }
    const rate = crits / moves;
    expect(rate).toBeGreaterThan(0.05);
    expect(rate).toBeLessThan(0.25);
  });

  it("rewards buying more powers", () => {
    const one = winRate(
      fighter("A", 40, ["sparkle"], "dragon"),
      fighter("B", 40, [], "dragon")
    ).a;
    const many = winRate(
      fighter("A", 40, ["fire", "frost", "whirlwind", "flight"], "dragon"),
      fighter("B", 40, [], "dragon")
    ).a;
    expect(many).toBeGreaterThan(one);
  });

  it("rewards a higher level", () => {
    const r = winRate(fighter("A", 200, [], "dragon"), fighter("B", 0, [], "dragon"));
    expect(r.a).toBeGreaterThan(r.b);
  });

  // Regression: with a narrower roll the strongest pet in the class won ~90%,
  // which would put everyone else off ever taking a turn.
  it("still lets the weakest pet beat the champion often enough to be worth playing", () => {
    const r = winRate(
      fighter("A", 200, PET_POWERS.map((p) => p.id), "dragon"),
      fighter("B", 0, [], "mouse")
    );
    expect(r.a).toBeLessThan(88); // never a foregone conclusion
    expect(r.b).toBeGreaterThan(8); // roughly one duel in five, give or take
  });
});
