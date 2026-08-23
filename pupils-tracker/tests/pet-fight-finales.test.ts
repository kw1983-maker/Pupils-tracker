import { describe, expect, it } from "vitest";
import {
  FINALES,
  FINALE_IDS,
  finaleSpec,
  pickFinale,
  type FinaleId,
} from "@/lib/pet-fight/finales";
import {
  BATTLE_SOUNDS,
  KO_FINALES,
  TRANSFORM_BURST_AT,
} from "@/lib/pet-battle-sfx";
import {
  BEAT,
  CAT_KF,
  CAM,
  DARK,
  DRA_KF,
  FIGHT_DURATION,
  IMPACTS,
  impactLife,
  H,
  SHAKES,
  W,
  XFORM_IN,
  XFORM_OUT,
} from "@/lib/pet-fight/storyboard";
import { anchorOf, bodyBoxOf, otherSide, poseFor } from "@/lib/pet-fight/poses";
import { frameAt } from "@/lib/pet-fight/camera";
import type { Keyframe } from "@/lib/pet-fight/timing";
import {
  damageTimes,
  livesAt,
  type FightHud,
} from "@/lib/pet-fight/lives";

describe("finales", () => {
  it("covers every id and exposes them in FINALE_IDS", () => {
    expect(FINALE_IDS.length).toBeGreaterThanOrEqual(5);
    for (const id of FINALE_IDS) {
      expect(FINALES[id]?.id).toBe(id);
    }
    expect(Object.keys(FINALES).sort()).toEqual([...FINALE_IDS].sort());
  });

  it("names a battle clip that actually exists for every finisher", () => {
    // A finisher whose clip was never generated would leave the biggest beat of
    // the duel on a fallback, so the ids have to stay in step with the script.
    for (const id of FINALE_IDS) {
      expect(BATTLE_SOUNDS).toContain(FINALES[id].sound);
    }
  });

  it("gives each finisher its own K.O. word", () => {
    const words = FINALE_IDS.map((id) => FINALES[id].koWord);
    expect(new Set(words).size).toBe(words.length);
  });

  it("only ever picks a known id", () => {
    const seen = new Set<FinaleId>();
    for (let i = 0; i < 500; i++) seen.add(pickFinale());
    for (const id of seen) expect(FINALE_IDS).toContain(id);
    // With 500 draws across five options, every one should have come up.
    expect(seen.size).toBe(FINALE_IDS.length);
  });

  it("falls back to the beam for an unknown or missing id", () => {
    expect(finaleSpec(undefined).id).toBe("beam");
    expect(finaleSpec("nope" as FinaleId).id).toBe("beam");
  });

  it("keeps every K.O. slam clip in BATTLE_SOUNDS", () => {
    for (const id of KO_FINALES) expect(BATTLE_SOUNDS).toContain(id);
  });
});

describe("power-up audio", () => {
  it("has a clip for every layer of the scene", () => {
    // The beds have no fallback — a missing one is silence under the sting,
    // not a wrong noise, which is exactly the kind of gap nobody notices.
    for (const id of ["quake", "wind", "transform", "levelup"] as const) {
      expect(BATTLE_SOUNDS).toContain(id);
    }
  });

  it("lands the sting's loudest moment on the white flash", () => {
    const start = BEAT.flash - TRANSFORM_BURST_AT;
    // It may start before the scene's own beats, but never before the scene.
    expect(start).toBeGreaterThanOrEqual(XFORM_IN);
    expect(start).toBeLessThan(BEAT.flash);
    // And the beds have to be in place before it arrives.
    expect(BEAT.quake).toBeLessThan(start);
  });
});

describe("storyboard timing", () => {
  const lastT = (keys: Keyframe[]) => keys[keys.length - 1]!.t;

  it("runs every track to the end of the fight", () => {
    for (const table of [CAM, DARK, CAT_KF, DRA_KF]) {
      expect(lastT(table)).toBe(FIGHT_DURATION);
    }
  });

  it("keeps keyframes sorted", () => {
    for (const table of [CAM, DARK, CAT_KF, DRA_KF]) {
      for (let i = 1; i < table.length; i++) {
        expect(table[i]!.t).toBeGreaterThanOrEqual(table[i - 1]!.t);
      }
    }
  });

  it("orders the finale beats and fits them inside the fight", () => {
    const order = [
      XFORM_IN,
      BEAT.quake,
      BEAT.ignite,
      BEAT.storm,
      BEAT.pillar,
      BEAT.flash,
      BEAT.banner,
      BEAT.levelBanner,
      XFORM_OUT,
      BEAT.chargeStart,
      BEAT.release,
      BEAT.impact,
      BEAT.push,
      BEAT.ko,
      BEAT.koText,
      BEAT.wins,
    ];
    for (let i = 1; i < order.length; i++) {
      expect(order[i]!).toBeGreaterThan(order[i - 1]!);
    }
    expect(BEAT.wins).toBeLessThan(FIGHT_DURATION);
  });

  it("shakes the screen for the power-up burst", () => {
    expect(SHAKES.some(([t0]) => Math.abs(t0 - BEAT.flash) < 0.001)).toBe(true);
  });
});

describe("poses", () => {
  it("grows the winner and leaves the loser at normal size", () => {
    const after = BEAT.chargeStart;
    expect(poseFor(after, "left", "left").sc).toBeGreaterThan(1.1);
    expect(poseFor(after, "right", "left").sc).toBeCloseTo(1, 1);
    // Mirrored when the right-hand pet is the one who wins.
    expect(poseFor(after, "right", "right").sc).toBeGreaterThan(1.1);
    expect(poseFor(after, "left", "right").sc).toBeCloseTo(1, 1);
  });

  it("freezes a draw before the K.O. fall", () => {
    // Neither pet is knocked down, so both hold the pose from just before it.
    const freeze = BEAT.push - 0.1;
    expect(poseFor(FIGHT_DURATION, "right", "draw")).toEqual(
      poseFor(freeze, "right", "draw")
    );
  });

  it("keeps the two fighters apart for a finisher to aim between", () => {
    const a = anchorOf(BEAT.release, "left", "left");
    const b = anchorOf(BEAT.release, "right", "left");
    expect(Math.abs(b.x - a.x)).toBeGreaterThan(200);
  });
});

describe("life bars", () => {
  const hud = (
    roundWinners: Array<"a" | "b" | "draw">,
    duelWinner: "left" | "right" | "draw"
  ): FightHud => ({
    leftName: "L",
    rightName: "R",
    roundWinners,
    maxHp: 3,
    duelWinner,
  });

  it("never drains the bar of the pet whose attack is landing", () => {
    // The regression: the left pet's projectile lands at 4.5 and the right
    // pet's at 8.85, so a pip may only come off the pet being hit on that beat.
    const outcomes: Array<Array<"a" | "b" | "draw">> = [
      ["a", "a", "a"],
      ["b", "b", "b"],
      ["a", "b", "a"],
      ["b", "a", "b"],
      ["a", "a", "b"],
      ["b", "b", "a"],
      ["draw", "b", "b"],
      ["a", "draw", "b"],
    ];
    for (const rounds of outcomes) {
      for (const win of ["left", "right"] as const) {
        const h = hud(rounds, win);
        // 4.5 and 14.3 are left-lands-a-hit beats: the LEFT bar must not move.
        expect(damageTimes(h, "a")).not.toContain(4.5);
        expect(damageTimes(h, "a")).not.toContain(14.3);
        // 8.85 is the right pet's hit: the RIGHT bar must not move.
        expect(damageTimes(h, "b")).not.toContain(8.85);
      }
    }
  });

  it("deals a pip for every round a pet lost", () => {
    const h = hud(["b", "b", "a"], "right");
    // Left dropped two rounds, right dropped one.
    expect(damageTimes(h, "a")).toHaveLength(2);
    expect(damageTimes(h, "b")).toHaveLength(1);
  });

  it("puts overflow on the finisher and K.O., which land on the loser", () => {
    // Left lost all three but only one early beat shows the left pet hit.
    const h = hud(["b", "b", "b"], "right");
    expect(damageTimes(h, "a")).toEqual([8.85, BEAT.impact, BEAT.ko]);
    expect(damageTimes(h, "b")).toEqual([]);
  });

  it("empties the loser's bar at the K.O. and leaves the winner standing", () => {
    const h = hud(["a", "b", "a"], "left");
    expect(livesAt(BEAT.ko, "b", h)).toBe(0);
    expect(livesAt(BEAT.ko, "a", h)).toBeGreaterThan(0);
  });

  it("starts both pets on full health", () => {
    const h = hud(["a", "b", "a"], "left");
    expect(livesAt(0, "a", h)).toBe(3);
    expect(livesAt(0, "b", h)).toBe(3);
  });

  it("leaves both bars alive on a draw", () => {
    const h = hud(["a", "b", "draw"], "draw");
    expect(livesAt(FIGHT_DURATION, "a", h)).toBeGreaterThan(0);
    expect(livesAt(FIGHT_DURATION, "b", h)).toBeGreaterThan(0);
  });
});

describe("final framing", () => {
  /** Where a world point lands on the 1920x1080 stage under this frame. */
  const screenX = (x: number, f: { s: number; fx: number }) =>
    W / 2 + (x - f.fx) * f.s;
  const screenY = (y: number, f: { s: number; fy: number }) =>
    H / 2 + (y - f.fy) * f.s;

  it("holds both pets in frame at the end, whichever corner each is in", () => {
    // The regression: CAM's K.O. tail is authored with the winner on the left
    // and was never mirrored, so a right-hand loser lay off the right edge and
    // the class never saw the pet that had just been knocked down. The fallen
    // pet lies at the very bottom of the shot, so the vertical edge is just as
    // tight as the horizontal one.
    for (const winner of ["left", "right", "draw"] as const) {
      // Beat-relative: the property is about the final shot, which starts
      // once the camera has pulled back off the slam.
      for (const T of [BEAT.wins - 0.2, BEAT.wins + 0.4, FIGHT_DURATION]) {
        const f = frameAt(T, winner, true);
        for (const side of ["left", "right"] as const) {
          const box = bodyBoxOf(T, side, winner);
          expect(screenX(box.x0, f)).toBeGreaterThanOrEqual(0);
          expect(screenX(box.x1, f)).toBeLessThanOrEqual(W);
          expect(screenY(box.y0, f)).toBeGreaterThanOrEqual(0);
          expect(screenY(box.y1, f)).toBeLessThanOrEqual(H);
        }
      }
    }
  });

  it("mirrors the K.O. tail between the two outcomes", () => {
    for (const T of [BEAT.push, BEAT.ko, BEAT.koText, BEAT.wins]) {
      expect(frameAt(T, "left").fx + frameAt(T, "right").fx).toBeCloseTo(W, 6);
    }
  });

  it("leaves the camera alone before the K.O. push", () => {
    // Everything up to the lunge is side-based choreography (the projectiles
    // and the combo always run the same direction), so it must not mirror.
    for (const T of [1.2, 4.5, 8.85, 14.3, 25.0, BEAT.push - 0.01]) {
      expect(frameAt(T, "right").fx).toBeCloseTo(frameAt(T, "left").fx, 6);
    }
  });

  it("centres the last shot on a draw", () => {
    expect(frameAt(BEAT.wins, "draw").fx).toBeCloseTo(W / 2, 6);
  });
});

describe("impacts", () => {
  it("lands every hit inside the fight and clear of the power-up", () => {
    for (const imp of IMPACTS) {
      expect(imp.t).toBeGreaterThan(0);
      // The power-up owns everything from XFORM_IN on. A stray combo hit in
      // there would fight the scene it is meant to be building up to.
      expect(imp.t).toBeLessThan(XFORM_IN);
      expect(imp.power).toBeGreaterThan(0);
      expect(imp.power).toBeLessThanOrEqual(1);
    }
  });

  it("keeps a screen shake on every hit", () => {
    // IMPACTS and SHAKES are deliberately separate tables; this is the guard
    // that stops them drifting apart on the next retime.
    for (const imp of IMPACTS) {
      expect(
        SHAKES.some(([t0]) => Math.abs(t0 - imp.t) < 0.001),
        `no shake for the hit at ${imp.t}s`
      ).toBe(true);
    }
  });

  it("varies the effect between consecutive hits", () => {
    for (let i = 1; i < IMPACTS.length; i++) {
      expect(IMPACTS[i]!.t).toBeGreaterThan(IMPACTS[i - 1]!.t);
      expect(
        IMPACTS[i]!.kind,
        `hits at ${IMPACTS[i - 1]!.t}s and ${IMPACTS[i]!.t}s look the same`
      ).not.toBe(IMPACTS[i - 1]!.kind);
    }
  });

  it("clears one reaction before the next hit opens", () => {
    for (let i = 1; i < IMPACTS.length; i++) {
      const prev = IMPACTS[i - 1]!;
      expect(prev.t + impactLife(prev.power)).toBeLessThan(IMPACTS[i]!.t);
    }
  });

  it("stays smaller than the power-up it builds towards", () => {
    // The whole point of the beat: the transformation has to remain the biggest
    // thing in the fight. Its shortest window is quake → ignite.
    const longest = Math.max(...IMPACTS.map((i) => impactLife(i.power)));
    expect(longest).toBeLessThan(BEAT.ignite - BEAT.quake);
  });

  it("puts the reaction on the pet that was hit, not the one throwing", () => {
    for (const imp of IMPACTS) {
      expect(otherSide(imp.by)).not.toBe(imp.by);
    }
    // The star burst is the spark between the fighters, so it is NOT where the
    // reaction goes — if they ever coincide, one of the two is misplaced.
    const hit = IMPACTS.find((i) => i.t === 11.6)!;
    const defender = anchorOf(hit.t, otherSide(hit.by), "left");
    expect(Math.abs(defender.x - hit.star.x)).toBeGreaterThan(100);
  });
});
