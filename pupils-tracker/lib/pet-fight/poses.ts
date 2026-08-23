/**
 * Shared cast types and pose lookup for the fight cinematic.
 *
 * These used to live in PetFightStage, but the finisher visuals need the same
 * pose maths to aim at a pet that is still moving, and importing them back out
 * of the stage would be a cycle.
 */

import { BEAT, CAT, CAT_KF, DRA, DRA_KF } from "./storyboard";
import { track, type Keyframe } from "./timing";

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
 * nothing about where it actually is. The right-hand slot is 420 wide against
 * 300 on the left, so the same fall reaches much further over there. The box is
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
