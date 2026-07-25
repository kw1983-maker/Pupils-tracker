import { describe, expect, it } from "vitest";
import {
  PET_SPECIES,
  PET_STAGES,
  expToNext,
  levelFromExp,
  petEmoji,
  spriteFor,
  speciesById,
  stageForLevel,
  stageIndexOf,
} from "@/lib/pets";

describe("level curve", () => {
  it("starts at level 1 with nothing earned", () => {
    const info = levelFromExp(0);
    expect(info.level).toBe(1);
    expect(info.intoLevel).toBe(0);
    expect(info.progress).toBe(0);
  });

  it("gets steadily more expensive per level", () => {
    expect(expToNext(1)).toBe(10);
    expect(expToNext(2)).toBe(15);
    expect(expToNext(3)).toBe(20);
    for (let lv = 1; lv < 20; lv++) {
      expect(expToNext(lv + 1)).toBeGreaterThan(expToNext(lv));
    }
  });

  it("never reports more progress into a level than the level costs", () => {
    for (let exp = 0; exp <= 400; exp++) {
      const info = levelFromExp(exp);
      expect(info.intoLevel).toBeGreaterThanOrEqual(0);
      expect(info.intoLevel).toBeLessThan(info.needForNext);
      expect(info.progress).toBeGreaterThanOrEqual(0);
      expect(info.progress).toBeLessThan(1);
    }
  });

  it("only ever goes up as marks are earned", () => {
    let last = 0;
    for (let exp = 0; exp <= 400; exp++) {
      const lv = levelFromExp(exp).level;
      expect(lv).toBeGreaterThanOrEqual(last);
      last = lv;
    }
  });

  it("ignores junk input rather than looping forever", () => {
    expect(levelFromExp(-50).level).toBe(1);
    expect(levelFromExp(3.7).level).toBe(1);
    expect(levelFromExp(1e6).level).toBeLessThan(999);
  });
});

describe("evolution stages", () => {
  it("crosses each boundary exactly once over a pet's life", () => {
    const seen: { exp: number; from: string; to: string }[] = [];
    let stage = stageForLevel(levelFromExp(0).level).id;
    for (let exp = 0; exp <= 400; exp++) {
      const now = stageForLevel(levelFromExp(exp).level).id;
      if (now !== stage) {
        seen.push({ exp, from: stage, to: now });
        stage = now;
      }
    }
    // egg -> baby -> teen -> adult: three hatches, in order, at these marks.
    expect(seen).toEqual([
      { exp: 10, from: "egg", to: "baby" },
      { exp: 45, from: "baby", to: "teen" },
      { exp: 135, from: "teen", to: "adult" },
    ]);
  });

  it("orders stages egg -> adult", () => {
    expect(PET_STAGES.map((s) => s.id)).toEqual(["egg", "baby", "teen", "adult"]);
    expect(stageIndexOf("egg")).toBeLessThan(stageIndexOf("adult"));
    expect(stageIndexOf("nonsense")).toBe(-1);
    expect(stageIndexOf(undefined)).toBe(-1);
  });
});

/**
 * The Pets tab decides whether to throw a hatching ceremony by comparing the
 * live stage with the last one it celebrated (pet.seenStage). These mirror that
 * comparison, including the case that was originally wrong: after a positive
 * award is undone the pet drops back a stage, and re-earning those marks has to
 * hatch — and celebrate — all over again.
 */
describe("hatching ceremony triggers", () => {
  const stageAt = (exp: number) => stageForLevel(levelFromExp(exp).level).id;
  const shouldCelebrate = (exp: number, seen: string) =>
    stageIndexOf(stageAt(exp)) > stageIndexOf(seen);
  const shouldFollowDown = (exp: number, seen: string) =>
    stageIndexOf(stageAt(exp)) < stageIndexOf(seen);

  it("celebrates when a pet reaches a new stage", () => {
    expect(shouldCelebrate(12, "egg")).toBe(true);
    expect(shouldCelebrate(50, "baby")).toBe(true);
  });

  it("does not celebrate again on a revisit", () => {
    expect(shouldCelebrate(12, "baby")).toBe(false);
    expect(shouldCelebrate(200, "adult")).toBe(false);
  });

  it("never celebrates on the way down", () => {
    expect(shouldCelebrate(8, "baby")).toBe(false);
    expect(shouldCelebrate(0, "adult")).toBe(false);
  });

  it("follows a regressed pet down so it can hatch again", () => {
    // 12 marks -> baby, celebrated. Undo an award: 8 marks -> back to an egg.
    expect(shouldFollowDown(8, "baby")).toBe(true);
    // seenStage follows to "egg", so re-earning hatches and celebrates again.
    expect(shouldCelebrate(12, "egg")).toBe(true);
  });

  it("runs a full earn / undo / re-earn cycle correctly", () => {
    let seen = "egg";
    const step = (exp: number) => {
      const celebrated = shouldCelebrate(exp, seen);
      if (celebrated) seen = stageAt(exp);
      else if (shouldFollowDown(exp, seen)) seen = stageAt(exp);
      return celebrated;
    };
    expect(step(12)).toBe(true); // hatches
    expect(step(12)).toBe(false); // reopening the tab does not repeat it
    expect(step(8)).toBe(false); // undone award, no party on the way down
    expect(step(12)).toBe(true); // re-earned, hatches again
    expect(step(50)).toBe(true); // grows on to teen
    expect(step(20)).toBe(false); // knocked back to baby
    expect(step(50)).toBe(true); // and back up to teen
  });
});

describe("species and sprites", () => {
  it("has unique species ids", () => {
    const ids = PET_SPECIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("falls back to a real species for an unknown id", () => {
    expect(speciesById("does-not-exist").id).toBe(PET_SPECIES[0].id);
  });

  it("points every species/stage pair at a cache-busted sprite", () => {
    for (const s of PET_SPECIES) {
      for (const stage of PET_STAGES) {
        expect(spriteFor(s.id, stage.id)).toMatch(
          new RegExp(`^/pets/${s.id}/${stage.id}\\.png\\?v=\\d+$`)
        );
      }
    }
  });

  it("shows an egg for every species before it hatches", () => {
    for (const s of PET_SPECIES) {
      expect(petEmoji(s.id, "egg")).toBe("🥚");
      expect(petEmoji(s.id, "adult")).toBe(s.emoji);
    }
  });
});
