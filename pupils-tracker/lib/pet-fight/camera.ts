/**
 * Where the camera looks at clock T.
 *
 * CAM is one authored table serving every outcome, so two things it cannot know
 * are patched on here: which corner is transforming, and which corner won. Kept
 * out of PetFightStage so it can be tested — vitest runs in a node environment
 * that cannot import the stage's TSX, which is why a framing bug lived here
 * with a green suite.
 */

import { BEAT, CAM, W, XFORM_IN, XFORM_OUT } from "./storyboard";
import { anchorOf, type FightWinner } from "./poses";
import { clamp, track } from "./timing";

export type FightFrame = { s: number; fx: number; fy: number };

export function frameAt(
  T: number,
  winner: FightWinner,
  transform = true
): FightFrame {
  const cam = track(T, CAM, ["s", "fx", "fy"]);
  let s = cam.s ?? 1;
  let fx = cam.fx ?? W / 2;
  let fy = cam.fy ?? 540;

  // The power-up: CAM stays centred because one table has to serve both
  // outcomes, so blend the focus onto whichever pet is actually breaking
  // through while the scene is on screen.
  if (transform && winner !== "draw" && T >= XFORM_IN && T <= XFORM_OUT) {
    const w = clamp(
      Math.min((T - XFORM_IN) / 0.5, (XFORM_OUT - T) / 0.8),
      0,
      1
    );
    const hero = anchorOf(T, winner, winner);
    fx += (hero.x - fx) * w;
    fy += (hero.y - fy) * w;
  }

  // The K.O. tail is authored with the winner in the left corner. poseFor()
  // mirrors the pets when the right-hand pet wins; the camera never did, so it
  // stayed on the loser's corner and the fallen pet sat off the right edge of
  // the frame. BEAT.push is a hard cut in CAM, so flipping there is invisible.
  if (T >= BEAT.push) {
    if (winner === "right") {
      fx = W - fx;
    } else if (winner === "draw") {
      // Nobody is knocked down in a draw, so the punch-in has no subject —
      // hold the centred two-shot rather than cropping into one corner.
      fx = W / 2;
      s = Math.min(s, 1.12);
    }
  }

  return { s, fx, fy };
}
