import { describe, expect, it } from "vitest";
import {
  GHOST_AGES,
  MELEE,
  MELEE_GHOSTS,
  MELEE_HITS,
  MELEE_RISE_PX,
  MELEE_SPREAD_PX,
  meleeAudioCues,
  ghostPulse,
  meleeFlurry,
  meleeIntensity,
} from "@/lib/pet-fight/melee";
import { poseFor, renderPoseFor, trailSpread } from "@/lib/pet-fight/poses";
import {
  BEAT,
  CAT,
  DRA,
  FIGHT_DURATION,
  IMPACTS,
  XFORM_IN,
} from "@/lib/pet-fight/storyboard";
import { BATTLE_SOUNDS } from "@/lib/pet-battle-sfx";

const SIDES = ["left", "right"] as const;
const WINNERS = ["left", "right", "draw"] as const;

describe("the close-quarters flurry", () => {
  it("is exactly zero outside the exchange", () => {
    // The guard for every other beat in the fight: the camera framing, the
    // impact reactions and the K.O. tests are all measured against poseFor, so
    // the flurry may only exist while the pets are inside each other's reach.
    for (const T of [0, 4.5, 8.85, MELEE.from, MELEE.to, 15.6, 26.05, 32]) {
      for (const side of SIDES) {
        expect(meleeFlurry(T, side)).toEqual({ dx: 0, dy: 0, rot: 0 });
      }
    }
  });

  it("stays clear of the power-up it builds towards", () => {
    expect(MELEE.to).toBeLessThan(XFORM_IN);
    expect(MELEE.from).toBeGreaterThan(0);
  });

  it("covers the whole combo and nothing else", () => {
    expect(MELEE_HITS.length).toBe(5);
    for (const imp of MELEE_HITS) {
      expect(imp.t).toBeGreaterThan(MELEE.from);
      expect(imp.t).toBeLessThan(MELEE.to);
    }
    // Read out of IMPACTS rather than retyped, so a retime carries the movement.
    for (const imp of IMPACTS) {
      if (imp.t > MELEE.from && imp.t < MELEE.to) {
        expect(MELEE_HITS).toContain(imp);
      }
    }
  });

  it("drives the attacker forward on every hit", () => {
    for (const imp of MELEE_HITS) {
      const lunge = meleeFlurry(imp.t, imp.by);
      // Toward the other pet: the left slot faces right, the right slot left.
      const toward = imp.by === "left" ? lunge.dx : -lunge.dx;
      expect(toward, `no lunge on the hit at ${imp.t}s`).toBeGreaterThan(20);
    }
  });

  it("never carries a pet past the middle of the stage", () => {
    // The two slots are 800px apart and the tracks already close that to ~300.
    // A shuffle that ate the rest would put one sprite through the other.
    for (let T = MELEE.from; T <= MELEE.to; T += 1 / 120) {
      const l = CAT.x + renderPoseFor(T, "left", "left").dx;
      const r = DRA.x + renderPoseFor(T, "right", "left").dx;
      expect(r - l, `pets crossed at ${T.toFixed(2)}s`).toBeGreaterThan(120);
    }
  });

  it("moves far enough, and steadily enough, to smear", () => {
    // Not just a peak: a trail that blinks out between shuffle beats reads as
    // flicker rather than speed, so the exchange has to hold a trail almost
    // throughout. The edges of the window are the ramp in and out.
    let peak = 0;
    let lit = 0;
    let frames = 0;
    for (let T = MELEE.from + 0.3; T <= MELEE.to - 0.3; T += 1 / 120) {
      const spread = trailSpread(T, "left", "left");
      peak = Math.max(peak, spread);
      if (spread > 0.1) lit++;
      frames++;
    }
    expect(peak).toBeGreaterThan(0.4);
    expect(lit / frames).toBeGreaterThan(0.9);
  });
});

describe("the drawn pose", () => {
  it("keeps the authored track underneath it", () => {
    // renderPoseFor only ever adds to poseFor — never replaces it. Sampled well
    // clear of the flinches and the flurry, the two agree.
    for (const winner of WINNERS) {
      for (const side of SIDES) {
        for (const T of [5.6, 10.5, 24.0, 28.0]) {
          const authored = poseFor(T, side, winner);
          const drawn = renderPoseFor(T, side, winner);
          expect(drawn.dx).toBeCloseTo(authored.dx, 6);
          expect(drawn.dy).toBeCloseTo(authored.dy, 6);
          expect(drawn.rot).toBeCloseTo(authored.rot, 6);
          expect(drawn.sc).toBeCloseTo(authored.sc, 6);
          expect(drawn.isHero).toBe(authored.isHero);
        }
      }
    }
  });

  it("flashes the pet that is being hit, not the one throwing", () => {
    for (const imp of IMPACTS) {
      const defender = imp.by === "left" ? "right" : "left";
      // pulse() peaks at the midpoint of its window, so the flash rises just
      // after the frame the hit lands on.
      const lit = imp.t + 0.04;
      expect(renderPoseFor(lit, defender, "left").hitFlash).toBeGreaterThan(0);
      expect(renderPoseFor(lit, imp.by, "left").hitFlash).toBe(0);
    }
  });

  it("stays finite for every frame of the fight", () => {
    for (const winner of WINNERS) {
      for (const side of SIDES) {
        for (let T = 0; T <= FIGHT_DURATION; T += 0.05) {
          const p = renderPoseFor(T, side, winner);
          expect(Number.isFinite(p.dx + p.dy + p.rot + p.sc)).toBe(true);
        }
      }
    }
  });
});

describe("the afterimage trail", () => {
  it("samples inside one shuffle period", () => {
    // Sample a full period back (2π/60 ≈ 0.105s) and the ghost lands where the
    // pet already is, which reads as a double image rather than a trail.
    for (const age of GHOST_AGES) {
      expect(age).toBeGreaterThan(0);
      expect(age).toBeLessThan((Math.PI * 2) / 60);
    }
    for (let i = 1; i < GHOST_AGES.length; i++) {
      expect(GHOST_AGES[i]!).toBeGreaterThan(GHOST_AGES[i - 1]!);
    }
  });

  it("keeps the melee fan inside one shuffle period too", () => {
    // Same ceiling as GHOST_AGES, and the reason the fan spreads sideways
    // rather than by reaching further back: past a full period the copy lands
    // where the pet already is.
    for (const g of MELEE_GHOSTS) {
      expect(g.age).toBeGreaterThan(0);
      expect(g.age).toBeLessThan((Math.PI * 2) / 60);
    }
    for (let i = 1; i < MELEE_GHOSTS.length; i++) {
      expect(MELEE_GHOSTS[i]!.age).toBeGreaterThan(MELEE_GHOSTS[i - 1]!.age);
    }
    // The whole point of the layer: the copies must sit out in space, on both
    // sides of the pet and above and below it. A crowd that only trails behind
    // in a line is the shaky-halo effect this replaced.
    expect(MELEE_GHOSTS.some((g) => g.back > 1)).toBe(true);
    expect(MELEE_GHOSTS.some((g) => g.back < 0)).toBe(true);
    expect(MELEE_GHOSTS.some((g) => g.rise > 0)).toBe(true);
    expect(MELEE_GHOSTS.some((g) => g.rise < 0)).toBe(true);
  });

  it("fires the copies one at a time, in order", () => {
    const n = MELEE_GHOSTS.length;
    // Only a handful may be alight at once — the whole point is a shadow
    // racing outward, not thirteen of them standing there shaking together.
    let worst = 0;
    for (let T = MELEE.from; T < MELEE.to; T += 1 / 240) {
      let lit = 0;
      for (let i = 0; i < n; i++) if (ghostPulse(T, i, n) > 0) lit++;
      worst = Math.max(worst, lit);
    }
    expect(worst).toBeLessThanOrEqual(5);
    expect(worst).toBeGreaterThan(1);

    // Every copy must get its turn, or the far ones are dead weight.
    for (let i = 0; i < n; i++) {
      let peak = 0;
      for (let T = MELEE.from; T < MELEE.from + 1; T += 1 / 480) {
        peak = Math.max(peak, ghostPulse(T, i, n));
      }
      expect(peak, `copy ${i} never lights`).toBeGreaterThan(0.9);
    }

    // And the turns must run in table order — the table is sorted by distance,
    // so that is what makes the sweep travel outward instead of popping about.
    // The sweep repeats, so measure from a cycle boundary (where copy 0 peaks)
    // rather than from MELEE.from, which lands mid-cycle.
    // The pulse deliberately saturates — a copy snaps to full brightness and
    // holds it briefly — so several read as "1" at once. Order therefore has to
    // be measured at the rising edge, the moment a copy switches on. And the
    // sweep repeats, so the copy that fires first in any given window depends on
    // where that window starts: what must hold is that the firing order is the
    // table order, read cyclically.
    const onsetAfter = (i: number, from: number) => {
      let prev = ghostPulse(from, i, n);
      for (let T = from + 1 / 4000; T < from + 1.2; T += 1 / 4000) {
        const cur = ghostPulse(T, i, n);
        if (prev <= 0 && cur > 0) return T;
        prev = cur;
      }
      return Infinity;
    };
    const onsets = MELEE_GHOSTS.map((_, i) => onsetAfter(i, MELEE.from + 0.6));
    for (const t of onsets) expect(t).toBeLessThan(Infinity);

    const order = onsets
      .map((t, i) => ({ t, i }))
      .sort((a, b) => a.t - b.t)
      .map((o) => o.i);
    const zeroAt = order.indexOf(0);
    for (let j = 0; j < n; j++) {
      expect(order[(zeroAt + j) % n], `firing order at slot ${j}`).toBe(j);
    }

    // Evenly spaced, so it reads as a steady sweep and not a stutter.
    const times = [...onsets].sort((a, b) => a - b);
    const gaps = times.slice(1).map((t, k) => t - times[k]!);
    const lo = Math.min(...gaps);
    const hi = Math.max(...gaps);
    expect(hi - lo).toBeLessThan(0.005);
  });

  it("throws the crowd clear of the pet", () => {
    // A copy has to land further from the pet than the shuffle is wide (±32px)
    // or it sits under the sprite and reads as a halo rather than a copy.
    const widest = Math.max(
      ...MELEE_GHOSTS.map((g) =>
        Math.hypot(g.back * MELEE_SPREAD_PX, g.rise * MELEE_RISE_PX)
      )
    );
    expect(widest).toBeGreaterThan(120);
  });

  it("draws the fan only during the close-quarters exchange", () => {
    // The teacher asked for the clash, not for every fast move: the dashes and
    // the K.O. lunge must be left with the plain trail.
    for (const T of [0, 3.3, 8.85, 11.0, 15.6, 26.05, BEAT.push, 31.5]) {
      expect(meleeIntensity(T), `T=${T}`).toBe(0);
    }
    let peak = 0;
    for (let T = MELEE.from; T <= MELEE.to; T += 1 / 120) {
      peak = Math.max(peak, meleeIntensity(T));
    }
    expect(peak).toBe(1);
  });

  it("shows nothing while a pet is standing still", () => {
    for (const T of [1.0, 10.5, 24.0]) {
      for (const side of SIDES) {
        expect(trailSpread(T, side, "left")).toBe(0);
      }
    }
  });

  it("shows on the dashes and the K.O. lunge", () => {
    // The point of driving this off measured speed rather than a table: these
    // come for free and stay right through a retime.
    const peak = (side: "left" | "right", from: number, to: number) => {
      let m = 0;
      for (let T = from; T <= to; T += 1 / 120) {
        m = Math.max(m, trailSpread(T, side, "left"));
      }
      return m;
    };
    expect(peak("left", 3.1, 3.5), "the opening pounce").toBeGreaterThan(0.4);
    expect(peak("left", 11.0, 11.35), "the closing dash").toBeGreaterThan(0.4);
    expect(
      peak("left", BEAT.push - 0.15, BEAT.push + 0.4),
      "the winner’s lunge"
    ).toBeGreaterThan(0.25);
  });
});

describe("the clash wind", () => {
  it("puts every cue inside the exchange", () => {
    for (const cue of meleeAudioCues()) {
      expect(cue.atMs / 1000).toBeGreaterThanOrEqual(MELEE.from);
      expect(cue.atMs / 1000).toBeLessThanOrEqual(MELEE.to);
    }
  });

  it("cuts the bed before the power-up starts its own wind", () => {
    const bed = meleeAudioCues().find((c) => c.kind === "wind");
    expect(bed).toBeDefined();
    if (bed?.kind !== "wind") throw new Error("no bed");
    expect(bed.stopAfterMs).toBeDefined();
    expect((bed.atMs + bed.stopAfterMs!) / 1000).toBeLessThan(BEAT.quake);
    // A bed, not a beat: it must sit under the punches landing over it.
    expect(bed.volume ?? 1).toBeLessThan(0.4);
  });

  it("swipes on both sides and never twice at one pitch in a row", () => {
    const whooshes = meleeAudioCues().filter((c) => c.kind === "whoosh");
    expect(whooshes.length).toBeGreaterThanOrEqual(MELEE_HITS.length);
    const pans = new Set(whooshes.map((c) => (c.kind === "whoosh" ? c.pan : 0)));
    expect(pans.size).toBe(2);
    for (let i = 1; i < whooshes.length; i++) {
      const a = whooshes[i - 1]!;
      const b = whooshes[i]!;
      if (a.kind !== "whoosh" || b.kind !== "whoosh") continue;
      expect(b.rate).not.toBe(a.rate);
    }
  });

  it("names clips the duel can actually reach", () => {
    // The cue falls back to "charge" until the whoosh clips are generated, so
    // all three ids have to stay in the script's list.
    for (const id of ["whoosh", "whoosh2", "charge", "wind"] as const) {
      expect(BATTLE_SOUNDS).toContain(id);
    }
  });
});
