import { describe, expect, it } from "vitest";
import {
  battleOptions,
  certainDamage,
  meleeOption,
  selectableFrom,
  superOption,
  BASIC_MOVE,
  MELEE_MOVES,
  MELEE_STRENGTH,
  SUPER_STRENGTH,
  attackerAt,
  petElement,
  resolveTurn,
  BRACE_MOVE,
  CRIT_DAMAGE_BONUS,
  ELEMENT_DAMAGE_BONUS,
  duelStatus,
  hpStatus,
  MAX_HP,
  MAX_HP_ROUNDS,
  MOVE_DAMAGE,
  movePool,
  pickOption,
  resolveMove,
  resolveRound,
  runPk,
  selectableMoves,
  toFighter,
  PK_ROUNDS,
  type MoveOption,
  type PkFighter,
  type PkRound,
} from "@/lib/pet-pk";
import { ELEMENT_BONUS, ELEMENTS, elementOf } from "@/lib/pet-elements";

const fighter = (name: string, exp: number, powers: string[], species = "tiger") =>
  toFighter({ pupilId: name, pupilName: name, species, stageId: "adult", exp, powers });

const moveNamed = (f: PkFighter, label: string): MoveOption =>
  movePool(f).find((o) => o.label === label)!;

/** A round with a known winner, for driving duelStatus. */
const round = (winner: "a" | "b" | "draw", index = 0): PkRound =>
  ({ index, winner }) as PkRound;

describe("duelStatus", () => {
  it("is unsettled before anything has been played", () => {
    const s = duelStatus([]);
    expect(s).toMatchObject({ scoreA: 0, scoreB: 0, winner: "draw", settled: false });
    expect(s.flawless).toBe(false);
    expect(s.suddenDeath).toBe(false);
  });

  it("settles the moment someone takes the majority, and calls it flawless", () => {
    const s = duelStatus([round("a"), round("a", 1)]);
    expect(s).toMatchObject({ scoreA: 2, scoreB: 0, winner: "a", settled: true });
    // The dead third round is never played — that is what flawless means.
    expect(s.flawless).toBe(true);
  });

  it("keeps going while the scheduled rounds could still decide it", () => {
    expect(duelStatus([round("a")]).settled).toBe(false);
    expect(duelStatus([round("a"), round("b", 1)]).settled).toBe(false);
  });

  it("is not flawless when it goes the distance", () => {
    const s = duelStatus([round("a"), round("b", 1), round("a", 2)]);
    expect(s).toMatchObject({ winner: "a", settled: true, flawless: false });
  });

  it("goes to sudden death rather than ending level", () => {
    const drawn = [round("draw"), round("draw", 1), round("draw", 2)];
    expect(duelStatus(drawn).settled).toBe(false);
    expect(duelStatus([...drawn, round("a", 3)])).toMatchObject({
      winner: "a",
      settled: true,
      suddenDeath: true,
    });
  });

  it("finally accepts a draw rather than playing forever", () => {
    const rounds = [0, 1, 2, 3, 4, 5].map((i) => round("draw", i));
    const s = duelStatus(rounds);
    expect(s.settled).toBe(true);
    expect(s.winner).toBe("draw");
  });

  // The interactive modes ask duelStatus after every round; runPk loops on it.
  // If they disagreed, a fight could end on a different score to the one shown.
  it("agrees with the result runPk reports", () => {
    for (let i = 0; i < 500; i++) {
      const r = runPk(fighter("A", 60, ["fire"]), fighter("B", 30, ["sparkle"]));
      const s = duelStatus(r.rounds);
      expect(s.settled).toBe(true);
      expect({
        scoreA: s.scoreA,
        scoreB: s.scoreB,
        winner: s.winner,
        flawless: s.flawless,
        suddenDeath: s.suddenDeath,
      }).toEqual({
        scoreA: r.scoreA,
        scoreB: r.scoreB,
        winner: r.winner,
        flawless: r.flawless,
        suddenDeath: r.suddenDeath,
      });
      expect(r.rounds.length).toBeGreaterThanOrEqual(2);
      if (s.flawless) expect(r.rounds.length).toBeLessThan(PK_ROUNDS);
    }
  });
});

describe("a chosen move", () => {
  const tiger = fighter("A", 40, ["fire", "frost", "whirlwind"]);
  const dragon = fighter("B", 40, ["fire", "frost", "whirlwind"], "dragon");
  const fire = moveNamed(tiger, "Fire Breath");
  const frost = moveNamed(dragon, "Frost Breath");
  const whirl = moveNamed(dragon, "Whirlwind");

  it("pays the element bonus to the side holding the advantage", () => {
    // Fire melts Frost.
    const r = resolveRound(0, tiger, dragon, fire, frost, () => 0, true);
    expect(r.a.elementBonus).toBe(ELEMENT_BONUS);
    expect(r.b.elementBonus).toBe(0);
    expect(r.a.element).toBe("fire");
    expect(r.b.element).toBe("frost");
  });

  it("pays nobody when the elements match or neither answers the other", () => {
    const same = resolveRound(0, tiger, dragon, fire, moveNamed(dragon, "Fire Breath"), () => 0, true);
    expect(same.a.elementBonus).toBe(0);
    expect(same.b.elementBonus).toBe(0);
  });

  it("flips the advantage when the picks are swapped", () => {
    // Storm blows out Fire.
    const r = resolveRound(0, tiger, dragon, fire, whirl, () => 0, true);
    expect(r.a.elementBonus).toBe(0);
    expect(r.b.elementBonus).toBe(ELEMENT_BONUS);
    expect(ELEMENTS[elementOf(whirl.power?.id)!].beats).toBe("fire");
  });

  it("adds the bonus into the total and nowhere else", () => {
    const r = resolveRound(0, tiger, dragon, fire, frost, () => 0.5, true);
    for (const m of [r.a, r.b]) {
      expect(m.total).toBe(
        m.strength + m.levelBonus + m.roll + (m.critical ? 4 : 0) + m.elementBonus
      );
    }
  });

  // The rule stated in resolveMove: reading your opponent is worth the bonus,
  // and you can only read them if you are the one choosing.
  it("is worth nothing when nobody chose it", () => {
    const r = resolveRound(0, tiger, dragon, fire, frost, () => 0);
    expect(r.a.elementBonus).toBe(0);
    expect(r.b.elementBonus).toBe(0);
    expect(r.a.total).toBeLessThan(
      resolveRound(0, tiger, dragon, fire, frost, () => 0, true).a.total
    );
  });

  it("scores a tackle for a pet with nothing, without an element", () => {
    const bare = toFighter({
      pupilId: "z",
      pupilName: "Zed",
      stageId: "egg",
      exp: 0,
      powers: [],
    });
    expect(movePool(bare)).toHaveLength(0);
    const m = resolveMove(bare, null, fire, () => 0, true);
    expect(m.label).toBe("Tackle");
    expect(m.element).toBeNull();
    expect(m.elementBonus).toBe(0);
  });

  it("gives the advantage a real but not decisive edge", () => {
    // Same pet, same level, same everything except the read.
    let wins = 0;
    const runs = 20_000;
    for (let i = 0; i < runs; i++) {
      if (resolveRound(0, tiger, dragon, fire, frost).winner === "a") wins += 1;
    }
    const neutral = (wins / runs) * 100;

    let read = 0;
    for (let i = 0; i < runs; i++) {
      if (resolveRound(0, tiger, dragon, fire, frost, Math.random, true).winner === "a") {
        read += 1;
      }
    }
    const withRead = (read / runs) * 100;

    expect(withRead).toBeGreaterThan(neutral + 10); // the pick is worth making
    expect(withRead).toBeLessThan(80); // and still loses often enough to play on
  });
});

describe("pickOption", () => {
  it("returns null only when there is nothing to throw", () => {
    const bare = toFighter({
      pupilId: "z",
      pupilName: "Zed",
      stageId: "egg",
      exp: 0,
      powers: [],
    });
    expect(pickOption(bare, Math.random)).toBeNull();
    expect(pickOption(fighter("A", 10, [], "fox"), Math.random)).not.toBeNull();
  });

  it("never repeats the move it is told to avoid, given a choice", () => {
    const f = fighter("A", 40, ["fire", "frost", "whirlwind"]);
    for (let i = 0; i < 500; i++) {
      expect(pickOption(f, Math.random, "Fire Breath")!.label).not.toBe("Fire Breath");
    }
  });

  it("throws the only move it has even when asked to avoid it", () => {
    const f = fighter("A", 10, [], "fox");
    const only = movePool(f)[0].label;
    expect(pickOption(f, Math.random, only)!.label).toBe(only);
  });
});

describe("a whole interactive duel", () => {
  // Walks the loop InteractiveDuel runs: commit a round, ask duelStatus whether
  // it is over, carry the pips into the next clip. This is the join between the
  // engine and the choreography, and it is where a mistake shows up as the class
  // seeing the wrong score or the finisher firing twice.
  const play = (a: PkFighter, b: PkFighter) => {
    const rounds: PkRound[] = [];
    const steps: Array<{
      finishing: boolean;
      priorLosses: { a: number; b: number };
      winner: "a" | "b" | "draw";
    }> = [];

    let lastA: string | null = null;
    let lastB: string | null = null;
    let guard = 0;

    while (!duelStatus(rounds).settled && guard++ < 20) {
      const optA = pickOption(a, Math.random, lastA);
      const optB = pickOption(b, Math.random, lastB);
      lastA = optA?.label ?? null;
      lastB = optB?.label ?? null;
      rounds.push(resolveRound(rounds.length, a, b, optA, optB, Math.random, true));

      const earlier = rounds.slice(0, -1);
      steps.push({
        finishing: duelStatus(rounds).settled,
        priorLosses: {
          a: earlier.filter((r) => r.winner === "b").length,
          b: earlier.filter((r) => r.winner === "a").length,
        },
        winner: rounds[rounds.length - 1].winner,
      });
    }
    return { rounds, steps, status: duelStatus(rounds) };
  };

  it("fires the finisher exactly once, on the last round", () => {
    for (let i = 0; i < 800; i++) {
      const { steps } = play(
        fighter("A", 40, ["fire", "frost"]),
        fighter("B", 40, ["whirlwind"], "penguin")
      );
      expect(steps.filter((s) => s.finishing)).toHaveLength(1);
      expect(steps[steps.length - 1].finishing).toBe(true);
    }
  });

  it("carries the pips so the bars never reset or go negative", () => {
    for (let i = 0; i < 400; i++) {
      const { rounds, steps, status } = play(
        fighter("A", 40, ["fire"]),
        fighter("B", 40, ["frost"], "penguin")
      );
      steps.forEach((step, idx) => {
        // What the previous clips took off, plus this round, is the running score.
        const losses = {
          a: step.priorLosses.a + (step.winner === "b" ? 1 : 0),
          b: step.priorLosses.b + (step.winner === "a" ? 1 : 0),
        };
        expect(losses.a).toBe(
          rounds.slice(0, idx + 1).filter((r) => r.winner === "b").length
        );
        expect(losses.b).toBe(
          rounds.slice(0, idx + 1).filter((r) => r.winner === "a").length
        );
        expect(step.priorLosses.a).toBeGreaterThanOrEqual(0);
        expect(step.priorLosses.b).toBeGreaterThanOrEqual(0);
      });
      // The bars end telling the same story as the score.
      const final = steps[steps.length - 1];
      expect(final.priorLosses.b + (final.winner === "a" ? 1 : 0)).toBe(status.scoreA);
      expect(final.priorLosses.a + (final.winner === "b" ? 1 : 0)).toBe(status.scoreB);
    }
  });

  it("always ends, even between two pets with a single move each", () => {
    for (let i = 0; i < 400; i++) {
      const { rounds, status } = play(
        fighter("A", 10, [], "fox"),
        fighter("B", 10, [], "fox")
      );
      expect(status.settled).toBe(true);
      expect(rounds.length).toBeGreaterThanOrEqual(2);
      expect(rounds.length).toBeLessThanOrEqual(PK_ROUNDS + 3);
    }
  });
});

describe("what the chooser lets a pupil click", () => {
  // Regression: a pet with no shop powers has exactly one move — its species
  // signature — and the no-repeat rule disabled it from round two on. The
  // chooser showed a single greyed-out button and the duel could not continue.
  it("always leaves a pet with something to throw", () => {
    for (const species of ["rabbit", "fox", "penguin", "robot"]) {
      const f = fighter("A", 10, [], species);
      const only = movePool(f)[0].label;
      expect(movePool(f)).toHaveLength(1);
      expect(selectableMoves(f, only)).toHaveLength(1);
      expect(selectableMoves(f, only)[0].label).toBe(only);
    }
  });

  /**
   * Regression: the rule was dropped only when it would leave NOTHING, and a
   * punch and a super count as something — so a pet whose only power was its
   * signature had that power greyed out every other round and was left pressing
   * a 10% punch it would never choose. Every pet a class actually owns is that
   * pet, which made the mode unwinnable for all of them.
   */
  it("never locks a pet out of its only power", () => {
    for (const species of ["rabbit", "penguin", "robot"]) {
      const f = fighter("A", 10, [], species);
      const only = movePool(f)[0].label;
      const allowed = selectableFrom(battleOptions(f), only).map((o) => o.label);
      expect(allowed).toContain(only);
    }
  });

  it("still drops last round's power from a pet that has another one", () => {
    const f = fighter("A", 40, ["fire"], "dragon");
    const allowed = selectableFrom(battleOptions(f), "Dragon Flame").map((o) => o.label);
    expect(allowed).not.toContain("Dragon Flame");
    expect(allowed).toContain("Fire Breath");
  });

  it("drops last round's move once there is a real choice", () => {
    const f = fighter("A", 40, ["fire", "frost"]);
    const labels = selectableMoves(f, "Fire Breath").map((o) => o.label);
    expect(labels).not.toContain("Fire Breath");
    expect(labels.length).toBe(movePool(f).length - 1);
  });

  it("offers everything when nothing was thrown yet", () => {
    const f = fighter("A", 40, ["fire", "frost"]);
    expect(selectableMoves(f, null)).toEqual(movePool(f));
  });

  // The chooser and the random picker must agree, or the buttons a child sees
  // are not the moves the game thinks they have.
  it("is the same rule the random picker uses", () => {
    for (const powers of [[], ["fire"], ["fire", "frost", "whirlwind"]]) {
      const f = fighter("A", 40, powers, "rabbit");
      for (const last of [null, ...movePool(f).map((o) => o.label)]) {
        const allowed = new Set(selectableMoves(f, last).map((o) => o.label));
        for (let i = 0; i < 200; i++) {
          expect(allowed.has(pickOption(f, Math.random, last)!.label)).toBe(true);
        }
      }
    }
  });
});

/**
 * The star is the one real decision the duel asks for, and a child had nothing
 * to decide it with: the computer spends its own the moment it would finish you,
 * while a pupil saving theirs "for later" watched later never come. This is the
 * number they need, said in words — and it promises only what is certain.
 */
describe("what a move is about to take off", () => {
  const rabbit = fighter("A", 10, [], "rabbit"); // Hop Beam, storm
  const hopBeam = moveNamed(rabbit, "Hop Beam");
  const punch = meleeOption(0);

  it("is the move's own worth against a pet it holds no advantage over", () => {
    // Hop Beam is storm, and storm answers fire — not frost.
    expect(certainDamage(hopBeam, "frost")).toBe(MOVE_DAMAGE.power);
    expect(certainDamage(punch, "frost")).toBe(MOVE_DAMAGE.melee);
  });

  it("counts the type bonus, which is not a roll", () => {
    // storm blows out fire, so Hop Beam is worth its 20 and 10 more.
    expect(certainDamage(hopBeam, "fire")).toBe(
      MOVE_DAMAGE.power + ELEMENT_DAMAGE_BONUS
    );
    const dragon = fighter("B", 10, [], "dragon"); // Dragon Flame, fire
    expect(certainDamage(moveNamed(dragon, "Dragon Flame"), "frost")).toBe(
      MOVE_DAMAGE.power + ELEMENT_DAMAGE_BONUS
    );
  });

  it("never promises what only a critical would do", () => {
    expect(certainDamage(hopBeam, "frost")).toBeLessThan(
      MOVE_DAMAGE.power + CRIT_DAMAGE_BONUS
    );
  });

  it("gives the super its flat sixty, whatever it is thrown into", () => {
    const big = superOption(rabbit)!;
    for (const against of ["fire", "frost", "storm", null] as const) {
      expect(certainDamage(big, against)).toBe(MOVE_DAMAGE.super);
    }
  });

  // The whole point: the caption has to agree with the blow that lands.
  it("agrees with the damage resolveTurn actually deals", () => {
    const penguin = fighter("B", 10, [], "penguin");
    for (let i = 0; i < 200; i++) {
      const round = resolveTurn(0, "a", rabbit, penguin, hopBeam);
      expect(round.damage).toBeGreaterThanOrEqual(
        certainDamage(hopBeam, petElement(penguin))
      );
    }
  });
});

describe("the punch and the super", () => {
  const bare = fighter("A", 10, [], "rabbit");
  const armed = fighter("B", 40, ["fire", "frost", "whirlwind"], "dragon");

  it("gives even a pet with nothing bought a real choice every round", () => {
    expect(movePool(bare)).toHaveLength(1);
    const opts = battleOptions(bare);
    expect(opts.length).toBeGreaterThanOrEqual(3); // punch + signature + super
    expect(opts.filter((o) => o.kind === "melee")).toHaveLength(1);
    expect(opts.filter((o) => o.kind === "super")).toHaveLength(1);
    // And with any one of them used last round, something is still clickable.
    for (const used of opts) {
      expect(selectableFrom(opts, used.label).length).toBeGreaterThan(0);
    }
  });

  it("cycles the punch flavour so it is not the same word every round", () => {
    const labels = [0, 1, 2, 3].map((i) => meleeOption(i).label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(meleeOption(MELEE_MOVES.length).label).toBe(meleeOption(0).label);
  });

  // The punch's real job: it carries no element, so it cannot be countered and
  // it cannot hand the opponent their +4.
  it("cannot be countered, and cannot be used to counter", () => {
    const punch = meleeOption(0);
    const fire = movePool(armed).find((o) => o.power?.id === "fire")!;
    const r = resolveRound(0, bare, armed, punch, fire, () => 0, true);
    expect(r.a.element).toBeNull();
    expect(r.a.elementBonus).toBe(0);
    expect(r.b.elementBonus).toBe(0); // fire beats frost, but punch is neither
  });

  it("hits harder than a bare tackle but softer than a power", () => {
    expect(MELEE_STRENGTH).toBeGreaterThan(BASIC_MOVE.power);
    const punch = meleeOption(0);
    for (const o of movePool(armed)) {
      expect(punch.strength).toBeLessThanOrEqual(o.strength);
    }
  });

  it("builds the super from the pet's best move, keeping its element", () => {
    const big = superOption(armed)!;
    expect(big.kind).toBe("super");
    expect(big.strength).toBe(SUPER_STRENGTH);
    expect(big.label).toContain("Super");
    // It keeps an element, so spending it into a counter still costs you.
    expect(elementOf(big.power?.id)).not.toBeNull();
    const best = movePool(armed).reduce((m, o) => (o.strength > m.strength ? o : m));
    expect(big.power?.id).toBe(best.power?.id);
  });

  it("is the biggest hit available", () => {
    const big = superOption(armed)!;
    for (const o of battleOptions(armed).filter((o) => o.kind !== "super")) {
      expect(big.strength).toBeGreaterThan(o.strength);
    }
  });

  // It plays as a finisher that visibly connects, so it cannot then lose: the
  // screen showed a pet break through, transform and land its ultimate attack,
  // and then its own life bar dropped.
  it("takes its round outright, whatever the roll says", () => {
    const big = superOption(armed)!;
    const punch = meleeOption(0);
    for (let i = 0; i < 5000; i++) {
      expect(resolveRound(0, armed, bare, big, punch, Math.random, true).winner).toBe("a");
      expect(resolveRound(0, bare, armed, punch, big, Math.random, true).winner).toBe("b");
    }
  });

  it("beats even the other side's best ordinary move", () => {
    const big = superOption(bare)!;
    for (const o of movePool(armed)) {
      expect(resolveRound(0, bare, armed, big, o, Math.random, true).winner).toBe("a");
    }
  });

  // Both sides hold exactly one, so neither can lean on it — and when they are
  // spent on the same round it is decided on the roll like any other.
  it("is settled normally when both sides super at once", () => {
    const mine = superOption(armed)!;
    const theirs = superOption(bare)!;
    const winners = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      winners.add(resolveRound(0, armed, bare, mine, theirs, Math.random, true).winner);
    }
    expect(winners.size).toBeGreaterThan(1);
  });

  it("disappears once it has been spent", () => {
    expect(battleOptions(armed, { superUsed: true }).some((o) => o.kind === "super"))
      .toBe(false);
    expect(battleOptions(armed, { superUsed: false }).some((o) => o.kind === "super"))
      .toBe(true);
  });

  it("gives a pet with no moves at all nothing to super with", () => {
    const nothing = toFighter({
      pupilId: "z",
      pupilName: "Zed",
      stageId: "egg",
      exp: 0,
      powers: [],
    });
    expect(superOption(nothing)).toBeNull();
    // But it can still punch, so it is never stuck.
    expect(battleOptions(nothing).length).toBeGreaterThan(0);
  });

  // Watch mode is a movie, not a game: nobody is choosing, so a punch would be a
  // weak move drawn at random and a super a coin flip deciding the duel.
  it("stays out of the watched duel entirely", () => {
    for (let i = 0; i < 300; i++) {
      for (const round of runPk(armed, fighter("C", 40, ["fire"])).rounds) {
        for (const m of [round.a, round.b]) {
          expect(m.label).not.toContain("Super");
          expect(MELEE_MOVES.some((f) => f.label === m.label)).toBe(false);
        }
      }
    }
  });
});

describe("a super is distinguishable from the move it is built on", () => {
  const armed = fighter("B", 40, ["fire"], "dragon");

  // Regression: a super borrows the base power's art, tint and voice line, so
  // with nothing else to tell them apart a pupil spent their one big move of
  // the duel and the screen showed exactly the ordinary attack.
  it("is tagged as a super on the resolved move", () => {
    const big = superOption(armed)!;
    const normal = movePool(armed).find((o) => o.power?.id === big.power?.id)!;
    const r = resolveRound(0, armed, armed, big, normal, () => 0, true);
    expect(r.a.kind).toBe("super");
    expect(r.b.kind).toBe("power");
    // Same power underneath — which is exactly why the tag is needed.
    expect(r.a.power?.id).toBe(r.b.power?.id);
  });

  it("tags a punch and an ordinary power too", () => {
    const r = resolveRound(0, armed, armed, meleeOption(0), movePool(armed)[0], () => 0, true);
    expect(r.a.kind).toBe("melee");
    expect(r.b.kind).toBe("power");
  });

  it("falls back to melee for a pet with nothing to throw", () => {
    const nothing = toFighter({
      pupilId: "z", pupilName: "Zed", stageId: "egg", exp: 0, powers: [],
    });
    expect(resolveMove(nothing, null, null, () => 0).kind).toBe("melee");
  });
});

describe("the life bar", () => {
  const armed = fighter("B", 40, ["fire", "frost"], "dragon");
  const won = (winner: "a" | "b" | "draw", kind: "melee" | "power" | "super") =>
    ({ index: 0, winner, a: { kind }, b: { kind } }) as unknown as PkRound;

  it("costs what the landed move is worth", () => {
    expect(MOVE_DAMAGE).toEqual({ melee: 10, power: 20, super: 60 });
    expect(hpStatus([won("a", "melee")]).hpB).toBe(MAX_HP - 10);
    expect(hpStatus([won("a", "power")]).hpB).toBe(MAX_HP - 20);
    expect(hpStatus([won("a", "super")]).hpB).toBe(MAX_HP - 60);
  });

  it("only takes life off the pet that lost the round", () => {
    const s = hpStatus([won("a", "power")]);
    expect(s.hpA).toBe(MAX_HP);
    expect(s.hpB).toBe(MAX_HP - 20);
  });

  it("costs nobody anything on a drawn round", () => {
    const s = hpStatus([won("draw", "super")]);
    expect(s.hpA).toBe(MAX_HP);
    expect(s.hpB).toBe(MAX_HP);
    expect(s.settled).toBe(false);
  });

  it("is not over while both pets are still standing", () => {
    expect(hpStatus([]).settled).toBe(false);
    expect(hpStatus([won("a", "super")]).settled).toBe(false);
  });

  it("ends the moment a pet is out, and never reads below zero", () => {
    const s = hpStatus([won("a", "super"), won("a", "super")]);
    expect(s.hpB).toBe(0);
    expect(s.settled).toBe(true);
    expect(s.winner).toBe("a");
  });

  it("takes a super plus two powers to finish a full-life pet", () => {
    const rounds = [won("a", "super"), won("a", "power"), won("a", "power")];
    expect(hpStatus(rounds.slice(0, 2)).settled).toBe(false);
    expect(hpStatus(rounds).hpB).toBe(0);
    expect(hpStatus(rounds).settled).toBe(true);
  });

  // Two pets trading punches need ten clean wins each, and alternating wins
  // would never get there — so the bout is stopped rather than run all lesson.
  it("is stopped on points rather than running forever", () => {
    const trading = Array.from({ length: MAX_HP_ROUNDS }, (_, i) =>
      won(i % 2 === 0 ? "a" : "b", "melee")
    );
    const s = hpStatus(trading);
    expect(s.settled).toBe(true);
    expect(s.onPoints).toBe(true);
    expect(s.hpA).toBe(s.hpB);
  });

  it("gives the win to whoever is ahead when it is stopped", () => {
    // Seven rounds to A and five to B: 70 and 50 of punches, so both are still
    // on their feet when the cap falls.
    const rounds = Array.from({ length: MAX_HP_ROUNDS }, (_, i) =>
      won(i % 2 === 0 || i === MAX_HP_ROUNDS - 1 ? "a" : "b", "melee")
    );
    const s = hpStatus(rounds);
    expect(s.hpA).toBeGreaterThan(0);
    expect(s.hpB).toBeGreaterThan(0);
    expect(s.onPoints).toBe(true);
    expect(s.winner).toBe("a");
    expect(s.hpA).toBeGreaterThan(s.hpB);
  });

  // Watch mode is cut to exactly three rounds of cinematic, so it keeps pips.
  it("leaves the watched duel on its own scoring", () => {
    const r = runPk(armed, fighter("C", 40, ["fire"]));
    expect(duelStatus(r.rounds).settled).toBe(true);
    expect(r.rounds.length).toBeLessThanOrEqual(PK_ROUNDS + 3);
  });
});

describe("taking turns", () => {
  const dragon = fighter("A", 40, ["fire", "frost"], "dragon"); // Fire pet
  const penguin = fighter("B", 40, ["whirlwind"], "penguin"); // Frost pet
  const noRoll = () => 0;

  it("alternates, with the left pet opening", () => {
    expect([0, 1, 2, 3, 4].map(attackerAt)).toEqual(["a", "b", "a", "b", "a"]);
  });

  it("reads a pet's own type from its species", () => {
    expect(petElement(dragon)).toBe("fire");
    expect(petElement(penguin)).toBe("frost");
    expect(petElement(fighter("C", 40, [], "panda"))).toBe("storm");
  });

  it("lands only the attacker's move, and only on the defender", () => {
    const fire = movePool(dragon).find((o) => o.power?.id === "fire")!;
    const t = resolveTurn(0, "a", dragon, penguin, fire, noRoll);
    expect(t.winner).toBe("a");
    expect(t.a.label).toBe("Fire Breath");
    // The pet taking it is bracing, not throwing.
    expect(t.b).toBe(BRACE_MOVE);
    expect(hpStatus([t]).hpA).toBe(MAX_HP);
    expect(hpStatus([t]).hpB).toBeLessThan(MAX_HP);
  });

  it("puts the blow in the right slot when the right pet attacks", () => {
    const whirl = movePool(penguin).find((o) => o.power?.id === "whirlwind")!;
    const t = resolveTurn(1, "b", penguin, dragon, whirl, noRoll);
    expect(t.winner).toBe("b");
    expect(t.a).toBe(BRACE_MOVE);
    expect(t.b.label).toBe("Whirlwind");
  });

  it("charges the move's own worth", () => {
    const fire = movePool(dragon).find((o) => o.power?.id === "fire")!;
    // Fire into a Frost pet is strong, so it costs the bonus on top.
    expect(resolveTurn(0, "a", dragon, penguin, fire, noRoll).damage).toBe(
      MOVE_DAMAGE.power + ELEMENT_DAMAGE_BONUS
    );
    // Frost into a Frost pet is not.
    const frost = movePool(dragon).find((o) => o.power?.id === "frost")!;
    expect(resolveTurn(0, "a", dragon, penguin, frost, noRoll).damage).toBe(
      MOVE_DAMAGE.power
    );
  });

  it("charges a punch its ten, with no type to help or hinder", () => {
    const t = resolveTurn(0, "a", dragon, penguin, meleeOption(0), noRoll);
    expect(t.damage).toBe(MOVE_DAMAGE.melee);
    expect(t.a.element).toBeNull();
    expect(t.a.elementBonus).toBe(0);
  });

  it("charges a super its sixty whatever it is thrown into", () => {
    const big = superOption(dragon)!; // built on Fire
    // Fire into a Frost pet is the strongest read there is, and a super still
    // costs exactly its sixty: it is spent, not aimed.
    const t = resolveTurn(0, "a", dragon, penguin, big, noRoll);
    expect(t.damage).toBe(MOVE_DAMAGE.super);
    expect(t.a.kind).toBe("super");
    expect(t.a.elementBonus).toBe(0);
  });

  it("charges a super its sixty even on a critical roll", () => {
    const big = superOption(dragon)!;
    const crit = () => 0.999;
    const t = resolveTurn(0, "a", dragon, penguin, big, crit);
    expect(t.damage).toBe(MOVE_DAMAGE.super);
    // And it must not be announced as a critical either, or the class is told
    // about a bonus that was never paid.
    expect(t.a.critical).toBe(false);
  });

  it("is the one move whose cost never varies", () => {
    const big = superOption(dragon)!;
    const seen = new Set(
      Array.from({ length: 200 }, (_, i) =>
        resolveTurn(0, "a", dragon, penguin, big, () => i / 200).damage
      )
    );
    expect([...seen]).toEqual([MOVE_DAMAGE.super]);
  });

  it("adds a critical on top of everything else", () => {
    const fire = movePool(dragon).find((o) => o.power?.id === "fire")!;
    const crit = () => 0.999;
    const t = resolveTurn(0, "a", dragon, penguin, fire, crit);
    expect(t.a.critical).toBe(true);
    expect(t.damage).toBe(
      MOVE_DAMAGE.power + ELEMENT_DAMAGE_BONUS + CRIT_DAMAGE_BONUS
    );
  });

  it("lets a pet with nothing bought still take its turn", () => {
    const bare = toFighter({
      pupilId: "z", pupilName: "Zed", stageId: "egg", exp: 0, powers: [],
    });
    const t = resolveTurn(0, "a", bare, penguin, null, noRoll);
    expect(t.damage).toBeGreaterThan(0);
    expect(t.winner).toBe("a");
  });

  it("runs a whole duel down to a knockout, turn by turn", () => {
    let rounds: PkRound[] = [];
    let guard = 0;
    while (!hpStatus(rounds).settled && guard++ < 30) {
      const who = attackerAt(rounds.length);
      const [att, def] = who === "a" ? [dragon, penguin] : [penguin, dragon];
      const own = rounds[rounds.length - 2];
      const lastLabel = (who === "a" ? own?.a.label : own?.b.label) ?? null;
      const pick = pickOption(att, Math.random, lastLabel);
      rounds = [...rounds, resolveTurn(rounds.length, who, att, def, pick)];
    }
    const s = hpStatus(rounds);
    expect(s.settled).toBe(true);
    // Every turn belongs to whoever's turn it was, in strict alternation.
    rounds.forEach((r, i) => expect(r.winner).toBe(attackerAt(i)));
    expect(Math.min(s.hpA, s.hpB)).toBe(0);
  });
});
