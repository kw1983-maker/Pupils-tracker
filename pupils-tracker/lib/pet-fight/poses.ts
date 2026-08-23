/**
 * Shared cast types and pose lookup for the fight cinematic.
 *
 * These used to live in PetFightStage, but the finisher visuals need the same
 * pose maths to aim at a pet that is still moving, and importing them back out
 * of the stage would be a cycle.
 */

import { CAT, CAT_KF, DRA, DRA_KF } from "./storyboard";
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
 * Draw: freeze both before the KO fall (hold pose at T=27).
 */
export function poseFor(
  T: number,
  side: "left" | "right",
  winner: FightWinner
): FightPose {
  const tPose = winner === "draw" && T > 27 ? 27 : T;
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
