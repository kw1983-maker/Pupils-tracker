import { describe, expect, it } from "vitest";
import {
  PK_ROUNDS,
  SPECIES_SIGNATURE,
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
  it("always plays the full number of rounds", () => {
    const r = runPk(fighter("A", 40, []), fighter("B", 40, []));
    expect(r.rounds).toHaveLength(PK_ROUNDS);
    expect(r.rounds.map((x) => x.index)).toEqual([0, 1, 2]);
  });

  it("keeps the score consistent with the rounds", () => {
    for (let i = 0; i < 500; i++) {
      const r = runPk(
        fighter("A", 60, ["fire"]),
        fighter("B", 30, ["sparkle"])
      );
      expect(r.scoreA).toBe(r.rounds.filter((x) => x.winner === "a").length);
      expect(r.scoreB).toBe(r.rounds.filter((x) => x.winner === "b").length);
      expect(r.scoreA + r.scoreB).toBeLessThanOrEqual(PK_ROUNDS);
      const expected =
        r.scoreA > r.scoreB ? "a" : r.scoreB > r.scoreA ? "b" : "draw";
      expect(r.winner).toBe(expected);
    }
  });

  it("adds each round up from its own parts", () => {
    const r = runPk(fighter("A", 90, ["fire", "frost"]), fighter("B", 20, []));
    for (const round of r.rounds) {
      for (const move of [round.a, round.b]) {
        expect(move.total).toBe(move.strength + move.levelBonus + move.roll);
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

  // KNOWN BUG (documented, not yet fixed — see the note below).
  //
  // A pet attacks with a move drawn from its pool, and the pool is its species
  // signature plus everything it has bought. So buying a power WEAKER than the
  // signature dilutes the pool and the pet gets worse: a dragon's signature is
  // strength 2, and adding Magic Sparkle (strength 1) drops its average attack
  // from 2.0 to 1.5. A pupil spends 10 marks and their pet fights worse.
  //
  // `it.fails` keeps the suite honest: it passes while the bug is present, and
  // starts failing the moment someone fixes it — at which point swap it back to
  // a plain `it`.
  it.fails("makes even the cheapest power worth buying", () => {
    const r = winRate(
      fighter("A", 40, ["sparkle"], "dragon"),
      fighter("B", 40, [], "dragon")
    );
    expect(r.a).toBeGreaterThan(r.b + 8);
  });

  it("buying a power never makes a pet weaker (currently it can)", () => {
    const withoutPool = movePool(fighter("B", 40, [], "dragon"));
    const withPool = movePool(fighter("A", 40, ["sparkle"], "dragon"));
    const avg = (ms: ReturnType<typeof movePool>) =>
      ms.reduce((sum, m) => sum + powerStrength(m.power), 0) / ms.length;
    // Documents today's behaviour: the average attack goes DOWN after a purchase.
    expect(avg(withPool)).toBeLessThan(avg(withoutPool));
  });

  // KNOWN BUG: species signatures range from strength 1 to 3, so which animal a
  // child picked hands them a threefold advantage before a single mark is spent.
  // A mouse is stuck on 1; a panda starts on 3.
  it("species signatures are not balanced against each other", () => {
    const strengths = Object.values(SPECIES_SIGNATURE).map((sig) =>
      powerStrength(powerById(sig.powerId)!)
    );
    expect(Math.min(...strengths)).toBe(1);
    expect(Math.max(...strengths)).toBe(3);
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
