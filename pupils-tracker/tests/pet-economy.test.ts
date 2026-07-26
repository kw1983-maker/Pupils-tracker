import { describe, expect, it } from "vitest";
import { PET_POWERS, SHOP_POWERS, powerById, powerSoundSrc } from "@/lib/pet-powers";
import { levelFromExp, stageForLevel } from "@/lib/pets";
import { behaviorDelta } from "@/lib/behaviors";
import type { BehaviorRecord } from "@/lib/types";

/**
 * Mirrors getPupilExp / getPupilBalance in lib/store.tsx. Those live inside the
 * React provider, so the rules are restated here — the point of the suite is to
 * pin the *rules*, above all the one that matters most: spending marks must
 * never cost a pet its level.
 */
type Mark = Pick<BehaviorRecord, "type" | "points">;

const exp = (marks: Mark[]) =>
  marks
    .filter((m) => m.type === "positive")
    .reduce((sum, m) => sum + Math.abs(m.points), 0);

const net = (marks: Mark[]) =>
  marks.reduce((sum, m) => sum + behaviorDelta(m), 0);

const balance = (marks: Mark[], spent: number) => Math.max(0, net(marks) - spent);

const marks = (positive: number, negative: number): Mark[] => [
  ...Array.from({ length: positive / 2 }, () => ({
    type: "positive" as const,
    points: 2,
  })),
  ...Array.from({ length: negative / 2 }, () => ({
    type: "negative" as const,
    points: 2,
  })),
];

describe("the mark economy", () => {
  it("counts only positive marks towards the pet's level", () => {
    expect(exp(marks(30, 0))).toBe(30);
    expect(exp(marks(30, 28))).toBe(30);
  });

  it("counts negatives against what a pupil can spend", () => {
    expect(balance(marks(30, 0), 0)).toBe(30);
    expect(balance(marks(30, 12), 0)).toBe(18);
  });

  it("never lets the balance go negative", () => {
    expect(balance(marks(10, 20), 0)).toBe(0);
    expect(balance(marks(40, 40), 0)).toBe(0);
    expect(balance(marks(10, 0), 30)).toBe(0);
  });

  it("lets a pupil earn their way back after negatives", () => {
    expect(balance(marks(10, 20), 0)).toBe(0);
    expect(balance(marks(30, 20), 0)).toBe(10); // enough for a 10-mark power
  });

  // The rule the whole design hangs on. Without it, buying Fire Breath could
  // drop a pet a stage — or turn it back into an egg.
  it("keeps the pet's level identical no matter how much is spent", () => {
    const earned = marks(50, 0);
    const before = levelFromExp(exp(earned));
    const everything = PET_POWERS.reduce((sum, p) => sum + p.cost, 0);

    expect(balance(earned, everything)).toBe(0);

    const after = levelFromExp(exp(earned));
    expect(after.level).toBe(before.level);
    expect(stageForLevel(after.level).id).toBe(stageForLevel(before.level).id);
  });

  it("leaves the level alone even when negatives wipe out the balance", () => {
    const clean = marks(30, 0);
    const punished = marks(30, 28);
    expect(levelFromExp(exp(punished)).level).toBe(levelFromExp(exp(clean)).level);
    expect(balance(punished, 0)).toBeLessThan(balance(clean, 0));
  });
});

/** Mirrors buyPetPower's guards in lib/store.tsx. */
describe("buying a power", () => {
  const canBuy = (bal: number, owned: string[], id: string, cost: number) =>
    !owned.includes(id) && bal >= cost;

  it("allows a purchase that is exactly affordable", () => {
    expect(canBuy(20, [], "fire", 20)).toBe(true);
  });

  it("refuses when short, even by one mark", () => {
    expect(canBuy(19, [], "fire", 20)).toBe(false);
  });

  it("refuses a power already owned", () => {
    expect(canBuy(999, ["fire"], "fire", 20)).toBe(false);
  });
});

describe("the power catalog", () => {
  it("has unique ids", () => {
    const ids = PET_POWERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prices everything for sale in whole tiers of ten", () => {
    for (const p of SHOP_POWERS) {
      expect(p.cost).toBeGreaterThan(0);
      expect(p.cost % 10).toBe(0);
    }
  });

  it("keeps exclusive powers out of the shop and off the price list", () => {
    // An exclusive arrives with its pet. Priced, it would show up in the shop
    // and could be bought by a pupil who never earned that pet.
    for (const p of PET_POWERS) {
      if (!p.exclusive) continue;
      expect(p.cost, `${p.id} is priced`).toBe(0);
      expect(SHOP_POWERS, `${p.id} is on sale`).not.toContain(p);
    }
  });

  it("gives every power the pieces the UI and generator need", () => {
    for (const p of PET_POWERS) {
      expect(p.label).toBeTruthy();
      expect(p.emoji).toBeTruthy();
      expect(p.shout).toBeTruthy();
      expect(p.tint).toMatch(/^rgba?\(/);
      expect(p.glyphs).toHaveLength(3);
      // The sfx prompt drives scripts/generate-power-sounds.mjs.
      expect(p.sfx.length).toBeGreaterThan(10);
      expect(powerSoundSrc(p.id)).toMatch(
        new RegExp(`^/pets/powers/${p.id}\\.mp3\\?v=\\d+$`)
      );
    }
  });

  it("looks powers up by id", () => {
    expect(powerById("fire")?.label).toBe("Fire Breath");
    expect(powerById("nope")).toBeUndefined();
  });
});
