/**
 * Shared cast types and pose lookup for the fight cinematic.
 *
 * These used to live in PetFightStage, but the finisher visuals need the same
 * pose maths to aim at a pet that is still moving, and importing them back out
 * of the stage would be a cycle.
 */

import {
  BEAT,
  CAT,
  CAT_KF,
  DRA,
  DRA_KF,
  FINISH_HITS,
  IMPACTS,
} from "./storyboard";
import { GHOST_AGES, meleeFlurry } from "./melee";
import { clamp, pulse, track, type Keyframe } from "./timing";

export type FightWinner = "left" | "right" | "draw";

export type FightCast = {
  name: string;
  spriteSrc: string;
  /** Aura / charge colour */
  aura: string;
  starColor: string;
  /** Projectile art; when missing, a tinted energy orb is used */
  projectileSrc?: string;
  tint: string;
};

/** On-screen speech bubble timed to clock T (seconds). */
export type FightSpeechLine = {
  side: "left" | "right";
  text: string;
  from: number;
  to: number;
};

export type FightPose = {
  dx: number;
  dy: number;
  rot: number;
  sc: number;
  isHero: boolean;
};

/** Ground anchor for a side, before that side's per-frame offset. */
export function baseFor(side: "left" | "right") {
  return side === "left" ? CAT : DRA;
}

export function otherSide(side: "left" | "right"): "left" | "right" {
  return side === "left" ? "right" : "left";
}

/**
 * Storyboard: left=hero (CAT_KF), right=foe (DRA_KF).
 * When right wins, swap those tracks and mirror X so each stays on their side.
 * Draw: freeze both just before the KO fall — neither pet is knocked down.
 */
export function poseFor(
  T: number,
  side: "left" | "right",
  winner: FightWinner
): FightPose {
  const freeze = BEAT.push - 0.1;
  const tPose = winner === "draw" && T > freeze ? freeze : T;
  const leftIsHero = winner !== "right";
  const isHero = side === "left" ? leftIsHero : !leftIsHero;
  const kf: Keyframe[] = isHero ? CAT_KF : DRA_KF;
  const m = track(tPose, kf, ["dx", "dy", "rot", "sc"]);
  // Hero track assumes left (+dx toward foe). Foe track assumes right (+dx away).
  // When roles are swapped (right wins), mirror both onto their corners.
  if (winner === "right") {
    return {
      dx: -(m.dx ?? 0),
      dy: m.dy ?? 0,
      rot: -(m.rot ?? 0),
      sc: m.sc ?? 1,
      isHero,
    };
  }
  return {
    dx: m.dx ?? 0,
    dy: m.dy ?? 0,
    rot: m.rot ?? 0,
    sc: m.sc ?? 1,
    isHero,
  };
}

/**
 * What is actually drawn: the authored pose plus everything that rides on top of
 * it — the idle sway, the victory bounce, the strain shudder, the flinch off a
 * landed hit, and the close-quarters flurry (lib/pet-fight/melee.ts).
 *
 * Deliberately separate from poseFor(). That one is the record of the authored
 * choreography and is what the camera framing, the impact reactions and the
 * K.O. tests are all measured against; this one is a render detail that may
 * wobble freely. Kept out of PetFightStage so the afterimage trail can evaluate
 * it at T minus a few frames — sampling the past is the whole trick — and so
 * vitest, which cannot import TSX, can check it.
 */
export type RenderPose = FightPose & {
  /** 0-1 white flash over the sprite from a hit landing on it. */
  hitFlash: number;
};

export function renderPoseFor(
  T: number,
  side: "left" | "right",
  winner: FightWinner
): RenderPose {
  const pose = poseFor(T, side, winner);
  const isLeft = side === "left";

  let dx = 0;
  let dy = 0;
  let rot = 0;
  let sc = 0;

  if (T < 3) {
    rot += Math.sin(T * 3 + (isLeft ? 0 : 1.9)) * 2.3;
    sc += Math.sin(T * 2.4) * 0.02;
  }

  const celebrating =
    winner !== "draw" &&
    ((winner === "left" && isLeft) || (winner === "right" && !isLeft));
  if (celebrating && T > BEAT.wins) {
    dy -= Math.abs(Math.sin((T - BEAT.wins) * 5.5)) * 34;
  }

  // Straining shudder while the aura is building, before the burst. Both pets:
  // one is breaking through and the other is bracing against it.
  if (T >= BEAT.ignite && T < BEAT.flash) {
    const strain = clamp((T - BEAT.ignite) / 1.2, 0, 1);
    rot += Math.sin(T * 46) * 2.2 * strain;
    sc += Math.sin(T * 38) * 0.012 * strain;
  }

  // Flinch: the pet that just took a hit rocks away from it and flashes white.
  // The real knockback is authored in CAT_KF/DRA_KF — the camera and the K.O.
  // framing are tuned against those exact numbers, so this only adds the rock.
  let hitFlash = 0;
  for (const imp of IMPACTS) {
    if (otherSide(imp.by) !== side) continue;
    hitFlash = Math.max(hitFlash, pulse(T, imp.t, 0.12 + imp.power * 0.06));
    const recoil = pulse(T, imp.t, 0.18 + imp.power * 0.08);
    if (recoil <= 0) continue;
    const away = imp.by === "left" ? 1 : -1;
    rot += away * recoil * (9 + imp.power * 11);
    dx += away * recoil * (16 + imp.power * 26);
    sc -= recoil * imp.power * 0.05;
  }

  // The finisher landing, and the body hitting the floor. Only the flash: the
  // knockback for these is authored too.
  const lost =
    winner !== "draw" &&
    ((winner === "left" && !isLeft) || (winner === "right" && isLeft));
  if (lost) {
    for (const fh of FINISH_HITS) {
      hitFlash = Math.max(hitFlash, pulse(T, fh.t, 0.16 + fh.power * 0.1));
    }
  }

  const flurry = meleeFlurry(T, side);

  return {
    dx: pose.dx + dx + flurry.dx,
    dy: pose.dy + dy + flurry.dy,
    rot: pose.rot + rot + flurry.rot,
    sc: pose.sc + sc,
    hitFlash,
    isHero: pose.isHero,
  };
}

/** Ignore this much travel: a pet is never perfectly still. */
const TRAIL_FLOOR = 8;
/** Travel that earns a trail at full strength. */
const TRAIL_RANGE = 70;

/**
 * 0-1: how far this pet has travelled across the afterimage window.
 *
 * Deliberately measured as distance and not as speed. A sinusoidal shuffle
 * passes through zero velocity twice a cycle, so a speed-gated trail strobes
 * off nineteen times a second in the middle of the exchange — where distance
 * from a moment ago stays high right through the turn, which is also what an
 * afterimage actually is.
 *
 * This is the single signal behind both the ghosts and the motion blur, so
 * they can never disagree about whether the pet is moving.
 */
export function trailSpread(
  T: number,
  side: "left" | "right",
  winner: FightWinner
): number {
  const now = renderPoseFor(T, side, winner);
  let far = 0;
  for (const age of GHOST_AGES) {
    const past = renderPoseFor(Math.max(0, T - age), side, winner);
    far = Math.max(far, Math.hypot(now.dx - past.dx, now.dy - past.dy));
  }
  return clamp((far - TRAIL_FLOOR) / TRAIL_RANGE, 0, 1);
}

/** World-space centre of a pet's body at T — what a finisher aims at. */
export function anchorOf(
  T: number,
  side: "left" | "right",
  winner: FightWinner
): { x: number; y: number; w: number } {
  const base = baseFor(side);
  const pose = poseFor(T, side, winner);
  const w = base.w * pose.sc;
  return {
    x: base.x + pose.dx,
    y: base.y + pose.dy - w * 0.45,
    w,
  };
}

/**
 * The pet's box in world space — what the K.O. camera has to hold.
 *
 * A knocked-down pet rotates about its feet (DRA_KF ends on rot 90), so its
 * body swings out sideways by its whole sprite width and the anchor alone says
 * nothing about where it actually is — which is what puts a fallen pet off the
 * edge of the frame if the final camera is not checked against it. The box is
 * the wrapper in PetFightStage: `width: base.w; height: base.w`, transform
 * origin at its bottom centre, scaled by the pose.
 */
export function bodyBoxOf(
  T: number,
  side: "left" | "right",
  winner: FightWinner
): { x0: number; x1: number; y0: number; y1: number } {
  const base = baseFor(side);
  const pose = poseFor(T, side, winner);
  const footX = base.x + pose.dx;
  const footY = base.y + pose.dy;
  const w = base.w * pose.sc;
  const rad = (pose.rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const [x, y] of [
    [-w / 2, -w],
    [w / 2, -w],
    [-w / 2, 0],
    [w / 2, 0],
  ] as const) {
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    if (rx < x0) x0 = rx;
    if (rx > x1) x1 = rx;
    if (ry < y0) y0 = ry;
    if (ry > y1) y1 = ry;
  }
  return { x0: footX + x0, x1: footX + x1, y0: footY + y0, y1: footY + y1 };
}
