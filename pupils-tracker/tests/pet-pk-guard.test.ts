import { describe, expect, it } from "vitest";
import {
  attackerAt,
  blockedDamage,
  guardOptions,
  guardedDamage,
  guardsFor,
  guardsLeft,
  hpStatus,
  meleeOption,
  movePool,
  resolveTurn,
  spendsGuard,
  superOption,
  toFighter,
  CRIT_DAMAGE_BONUS,
  DODGE_PUNISH,
  ELEMENT_DAMAGE_BONUS,
  GUARDS_PER_DUEL,
  MAX_HP,
  SECOND_STRIKE_SHIELD,
  MOVE_DAMAGE,
  type GuardChoice,
  type PkRound,
} from "@/lib/pet-pk";

const fighter = (name: string, exp: number, powers: string[], species = "tiger") =>
  toFighter({ pupilId: name, pupilName: name, species, stageId: "adult", exp, powers });

const noRoll = () => 0;
const critRoll = () => 0.999;

describe("guardedDamage", () => {
  it("leaves a blow alone when the pet just takes it", () => {
    expect(guardedDamage(20, "power", "take")).toEqual({
      damage: 20,
      outcome: "taken",
    });
    expect(guardedDamage(10, "melee", "take")).toEqual({
      damage: 10,
      outcome: "taken",
    });
  });

  it("halves a blocked blow, to a figure a child can say out loud", () => {
    expect(guardedDamage(20, "power", "block").damage).toBe(10);
    expect(guardedDamage(30, "power", "block").damage).toBe(15);
    expect(guardedDamage(40, "power", "block").damage).toBe(20);
    expect(guardedDamage(10, "melee", "block").damage).toBe(5);
    // Never a figure with a 1 or a 7 in it: everything lands on a five.
    for (let raw = 0; raw <= 60; raw += 5) {
      expect(blockedDamage(raw) % 5).toBe(0);
      expect(blockedDamage(raw)).toBeLessThanOrEqual(raw);
    }
  });

  it("slips anything thrown for nothing at all", () => {
    expect(guardedDamage(20, "power", "dodge")).toEqual({
      damage: 0,
      outcome: "evaded",
    });
    expect(guardedDamage(30, "power", "dodge").damage).toBe(0);
  });

  it("catches a pet that ducks into a punch", () => {
    expect(guardedDamage(10, "melee", "dodge")).toEqual({
      damage: 10 * DODGE_PUNISH,
      outcome: "punished",
    });
    // The whole point of the punch: dodging it costs MORE than taking it.
    expect(guardedDamage(10, "melee", "dodge").damage).toBeGreaterThan(
      guardedDamage(10, "melee", "take").damage
    );
  });

  // Rule 1: the star breaks through. It is the one promise the chooser makes.
  it("lets a super through whatever the guard was", () => {
    for (const g of ["take", "block", "dodge"] as GuardChoice[]) {
      expect(guardedDamage(MOVE_DAMAGE.super, "super", g)).toEqual({
        damage: MOVE_DAMAGE.super,
        outcome: "taken",
      });
    }
  });

  // No pure strategy: each guard is the wrong one against something.
  it("leaves neither guard safe against both attacks", () => {
    const vsBlock = {
      punch: guardedDamage(MOVE_DAMAGE.melee, "melee", "block").damage,
      power: guardedDamage(MOVE_DAMAGE.power, "power", "block").damage,
    };
    const vsDodge = {
      punch: guardedDamage(MOVE_DAMAGE.melee, "melee", "dodge").damage,
      power: guardedDamage(MOVE_DAMAGE.power, "power", "dodge").damage,
    };
    // Block is better into a power; dodge is better into a punch. Strictly.
    expect(vsDodge.power).toBeLessThan(vsBlock.power);
    expect(vsBlock.punch).toBeLessThan(vsDodge.punch);
  });
});

describe("shields", () => {
  const turn = (winner: "a" | "b", guard: GuardChoice): PkRound =>
    ({ index: 0, winner, guard, guardOutcome: "taken" }) as PkRound;

  it("starts each pet with its own allowance", () => {
    expect(guardsLeft([], "a")).toBe(guardsFor("a"));
    expect(guardsLeft([], "b")).toBe(guardsFor("b"));
  });

  /**
   * The compensation for the free turn the opener gets, and the reason the seats
   * are now worth the same — see SECOND_STRIKE_SHIELD and the measurement in
   * tests/pet-pk-opener.test.ts.
   */
  it("gives the pet that does not open one more", () => {
    const opener = attackerAt(0);
    const answer: "a" | "b" = opener === "a" ? "b" : "a";
    expect(guardsFor(answer)).toBe(guardsFor(opener) + SECOND_STRIKE_SHIELD);
    expect(guardsFor(opener)).toBe(GUARDS_PER_DUEL);
  });

  it("charges the pet that guarded, not the one that swung", () => {
    const rounds = [turn("a", "block")];
    expect(guardsLeft(rounds, "b")).toBe(guardsFor("b") - 1);
    expect(guardsLeft(rounds, "a")).toBe(guardsFor("a"));
  });

  it("costs nothing to stand there and take it", () => {
    expect(guardsLeft([turn("a", "take")], "b")).toBe(guardsFor("b"));
    expect(spendsGuard("take")).toBe(false);
    expect(spendsGuard("block")).toBe(true);
    expect(spendsGuard("dodge")).toBe(true);
  });

  // Rule 3: a dodge is spent whether or not it worked, which is what makes
  // pressing it a decision rather than a free roll.
  it("spends a dodge that walked into a punch", () => {
    const missed = {
      index: 0,
      winner: "a",
      guard: "dodge",
      guardOutcome: "punished",
    } as PkRound;
    expect(guardsLeft([missed], "b")).toBe(guardsFor("b") - 1);
  });

  it("runs out and never reads below zero", () => {
    const spent = Array.from({ length: 10 }, () => turn("a", "block"));
    expect(guardsLeft(spent, "b")).toBe(0);
  });

  it("offers only Take it once the shields are gone", () => {
    expect(guardOptions(2)).toContain("dodge");
    expect(guardOptions(0)).toEqual(["take"]);
  });
});

describe("a guarded turn", () => {
  const dragon = fighter("A", 40, ["fire", "frost"], "dragon"); // Fire pet
  const penguin = fighter("B", 40, ["whirlwind"], "penguin"); // Frost pet
  const fire = movePool(dragon).find((o) => o.power?.id === "fire")!;

  it("reports the guard and the outcome it actually applied", () => {
    const t = resolveTurn(0, "a", dragon, penguin, fire, noRoll, "block");
    expect(t.guard).toBe("block");
    expect(t.guardOutcome).toBe("blocked");
    // Fire into a Frost pet is 30; blocked, it is 15.
    expect(t.damage).toBe(blockedDamage(MOVE_DAMAGE.power + ELEMENT_DAMAGE_BONUS));
  });

  it("still lands clean when the defender takes it", () => {
    const t = resolveTurn(0, "a", dragon, penguin, fire, noRoll, "take");
    expect(t.damage).toBe(MOVE_DAMAGE.power + ELEMENT_DAMAGE_BONUS);
    expect(t.guardOutcome).toBe("taken");
  });

  it("costs nothing at all when the blow is slipped", () => {
    const t = resolveTurn(0, "a", dragon, penguin, fire, critRoll, "dodge");
    expect(t.damage).toBe(0);
    expect(t.guardOutcome).toBe("evaded");
    expect(hpStatus([t]).hpB).toBe(MAX_HP);
  });

  // A bonus that was never paid must never be announced — the same rule the
  // super already follows.
  it("announces neither the type read nor the critical on a blow that missed", () => {
    const t = resolveTurn(0, "a", dragon, penguin, fire, critRoll, "dodge");
    expect(t.a.critical).toBe(false);
    expect(t.a.elementBonus).toBe(0);
  });

  it("still announces them on a blow that was merely blocked", () => {
    const t = resolveTurn(0, "a", dragon, penguin, fire, critRoll, "block");
    expect(t.a.critical).toBe(true);
    expect(t.a.elementBonus).toBe(ELEMENT_DAMAGE_BONUS);
    expect(t.damage).toBe(
      blockedDamage(MOVE_DAMAGE.power + ELEMENT_DAMAGE_BONUS + CRIT_DAMAGE_BONUS)
    );
  });

  it("doubles a punch that was dodged", () => {
    const t = resolveTurn(0, "a", dragon, penguin, meleeOption(0), noRoll, "dodge");
    expect(t.damage).toBe(MOVE_DAMAGE.melee * DODGE_PUNISH);
    expect(t.guardOutcome).toBe("punished");
  });

  it("gives the super its flat sixty through any guard", () => {
    const big = superOption(dragon)!;
    for (const g of ["take", "block", "dodge"] as GuardChoice[]) {
      const t = resolveTurn(0, "a", dragon, penguin, big, critRoll, g);
      expect(t.damage).toBe(MOVE_DAMAGE.super);
      expect(t.guardOutcome).toBe("taken");
    }
  });

  it("leaves every existing caller describing a blow that lands clean", () => {
    const withoutGuard = resolveTurn(0, "a", dragon, penguin, fire, noRoll);
    expect(withoutGuard.guard).toBe("take");
    expect(withoutGuard.damage).toBe(MOVE_DAMAGE.power + ELEMENT_DAMAGE_BONUS);
  });
});
