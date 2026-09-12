/**
 * Authored storyboard tables for the 30s Purr Pop vs Dragon Flame cinematic.
 * Source: design handoff pet-fight.jsx — timings are absolute seconds on clock T.
 *
 * The original handoff ran 25s. A five-second power-up scene was inserted at
 * XFORM_IN, so every beat the handoff placed at or after 15.40 now sits five
 * seconds later. The finale beats are named in BEAT below — use those rather
 * than retyping the numbers, so the next retime stays a one-file edit.
 */

import {
  easeInCubic,
  easeInOutCubic,
  easeInOutSine,
  easeOutBack,
  easeOutCubic,
  easeOutExpo,
  easeOutQuad,
  type Keyframe,
} from "./timing";

export const FIGHT_DURATION = 32;
export const W = 1920;
export const H = 1080;

/**
 * The two fighting slots: same width, same ground line, mirrored about centre.
 *
 * The handoff drew the left slot 300 wide and the right 420, because it starred
 * one specific cat and one specific dragon whose art was framed differently. Any
 * of the sixteen species can stand in either slot now, and every one of the 64
 * sprites is a uniform 320x320 PNG — so unequal slots just meant whichever
 * pupil's pet landed on the left was drawn 40% smaller than their opponent.
 */
export const CAT = { x: 560, y: 770, w: 360 } as const;
export const DRA = { x: 1360, y: 770, w: 360 } as const;

/** The power-up scene: hush, quake, ignite, storm, pillar, flash, settle. */
export const XFORM_IN = 15.1;
export const XFORM_OUT = 22.1;

/**
 * Named beats for everything from the power-up onward. Components window their
 * effects off these instead of literals so a retime stays a one-file edit.
 */
export const BEAT = {
  /** The ground starts to tremble and the first fissures open. */
  quake: 15.6,
  /** Aura catches; rock tears loose and the wind turns outward. */
  ignite: 16.1,
  /** The sky churns over and lightning starts snapping. */
  storm: 17.0,
  /** Column of light punches out of the pet. */
  pillar: 18.6,
  /** White-out; the pet comes back golden and a size bigger. */
  flash: 19.6,
  /** "POWER UP!" then "LEVEL UP!". */
  banner: 19.8,
  levelBanner: 20.55,
  /** Both pets wind up their last-resort orbs. */
  chargeStart: 22.4,
  /** Finisher fires. */
  release: 25.55,
  /** Finisher connects — white flash, biggest shake. */
  impact: 26.05,
  /** Winner lunges; loser is knocked off their feet. */
  push: 29.1,
  /** Loser hits the ground — K.O. star, life bar empties. */
  ko: 29.9,
  /** Slam banner. */
  koText: 30.2,
  /** "<NAME> WINS!" and the victory bounce. */
  wins: 31.0,
} as const;

/**
 * Windows of the cinematic that stand up on their own, for the round-by-round
 * modes (vs PC and 2 Players). The stage is a pure function of the clock, so
 * playing a slice is just a matter of starting and stopping `T` somewhere other
 * than 0 and FIGHT_DURATION — see the `from`/`to` props on PetFightPlayer.
 *
 * `round` is one complete exchange: the left pet shouts (2.5), charges (3.9) and
 * connects (4.5), then the right pet does the same (6.5 / 7.85 / 8.85), and both
 * settle. It deliberately stops before the 11.6s melee combo, which reads as a
 * climax and would undercut the finish if it played every round.
 *
 * It starts at 2.4 because that is where CAM cuts back to the wide two-shot.
 * Starting at 2.0 — inside the 1.55x close-up on the right fighter — parked the
 * stage on one pet filling the screen with no sense of a fight about to happen,
 * which read as the page having hung.
 *
 * `finish` is that same exchange running on through the melee, the power-up, the
 * finisher and the K.O. — so the deciding round IS the cinematic the class
 * already knows, rather than a shortened version of it.
 */
/**
 * Where a super's scene stops — short of the knockdown, so the duel goes on.
 *
 * Named because an ending that follows a super resumes from exactly here.
 */
export const SUPER_OUT = BEAT.impact + 1.5;

export const SEGMENT = {
  round: { from: 2.4, to: 10.2 },
  /**
   * One pet's half of the exchange, for the turn-based modes.
   *
   * The choreography already attacks in sequence — the left pet shouts at 2.5,
   * fires at 3.9 and connects at 4.5; the right pet does the same from 6.5. So a
   * turn is simply that half played on its own, cut at the camera's return to
   * the wide centre shot (5.4) between them. Nothing new had to be drawn.
   */
  turnA: { from: 2.4, to: 5.7 },
  turnB: { from: 5.7, to: 10.2 },
  /**
   * The ending, played on its own after the blow that finishes a pet: both wind
   * up, the finisher fires, the loser is knocked down and the winner is named.
   *
   * The killing turn used to jump straight to SEGMENT.finish — the whole
   * thirty-second piece from the top. After turns that last three seconds that
   * read as the game having stopped responding, and when the last blow was the
   * RIGHT pet's it replayed the LEFT pet attacking first. So the turn plays as
   * any other turn, and this follows it.
   *
   * It begins at the wind-up, AFTER XFORM_OUT, so no transformation happens
   * here. Powering up is what a super buys and the only thing that buys it — a
   * pet flaring gold at the end of an ordinary exchange had pupils asking why
   * their super had gone off when they had not spent it.
   */
  knockout: { from: BEAT.chargeStart, to: FIGHT_DURATION },
  finish: { from: 2.4, to: FIGHT_DURATION },
  /**
   * A super: the pet breaks through and unleashes its finisher.
   *
   * This IS the power-up scene the cinematic already ends on — hush, quake,
   * ignite, storm, pillar, flash, "OVERCHARGE!", then charge and release. It
   * runs from XFORM_IN to just past the finisher connecting, stopping short of
   * BEAT.push so nobody is knocked down: the duel carries on afterwards.
   *
   * A super was first built as a bigger projectile on the ordinary attack beat,
   * which was wrong — it borrowed the base power's art, so spending the one big
   * move of the duel looked like throwing the same move slightly larger. The
   * transformation is what the pupils already read as "the final power", so the
   * super is that, moved to where they can choose it.
   */
  super: { from: XFORM_IN, to: SUPER_OUT },
  /**
   * The ending for a duel whose finisher has ALREADY been fired.
   *
   * A super plays the finisher as its own scene; SEGMENT.knockout plays it
   * again on the way to the knockdown. So a pet that supered early and then won
   * with an ordinary punch fired the same beam twice in one duel, and the class
   * read the second one as a second superpower being spent.
   *
   * This picks up at the exact frame the super scene stopped on and delivers
   * only what that scene withheld: the push, the knockdown and the winner's
   * name. Nothing is repeated and nothing is missing.
   */
  knockdown: { from: SUPER_OUT, to: FIGHT_DURATION },
} as const;

/**
 * The transformed pet's aura, tint and light column.
 *
 * These are custom properties rather than literals so one duel's transformation
 * can be crimson and the next azure — PetFightStage sets the four vars from the
 * PowerUpSpec it drew (lib/pet-fight/powerups.ts). The fallbacks are the
 * original Super-Saiyan gold, so anything rendering the stage without a spec
 * looks exactly as it always did.
 *
 * Kept as vars instead of props because forty-five places across four files
 * paint with this ramp; var() lets every one of them stay as written.
 */
export const GOLD = "var(--pu-aura,rgba(255,210,60,0.95))";
export const GOLD_CORE = "var(--pu-core,#fff6c0)";
export const GOLD_MID = "var(--pu-mid,#ffd23c)";
export const GOLD_DEEP = "var(--pu-deep,#ff9d1c)";

export const CAM: Keyframe[] = [
  { t: 0.0, s: 1.0, fx: 960, fy: 560 },
  { t: 1.1, s: 1.14, fx: 960, fy: 540, ease: easeInOutSine },
  { t: 1.15, s: 1.55, fx: 600, fy: 560, cut: true },
  { t: 1.75, s: 1.55, fx: 600, fy: 560 },
  { t: 1.8, s: 1.55, fx: 1320, fy: 570, cut: true },
  { t: 2.35, s: 1.55, fx: 1320, fy: 570 },
  { t: 2.4, s: 1.06, fx: 960, fy: 560, cut: true },
  { t: 3.0, s: 1.06, fx: 960, fy: 560 },
  { t: 3.3, s: 1.22, fx: 640, fy: 540, ease: easeOutCubic },
  { t: 3.9, s: 1.18, fx: 820, fy: 540 },
  { t: 4.45, s: 1.16, fx: 1180, fy: 560, ease: easeInOutCubic },
  { t: 4.5, s: 1.35, fx: 1320, fy: 590, cut: true },
  { t: 5.2, s: 1.3, fx: 1320, fy: 600 },
  { t: 5.4, s: 1.08, fx: 960, fy: 560, ease: easeInOutCubic },
  { t: 7.0, s: 1.06, fx: 960, fy: 560 },
  { t: 7.3, s: 1.24, fx: 1300, fy: 560, ease: easeOutCubic },
  { t: 7.9, s: 1.2, fx: 1120, fy: 560 },
  { t: 8.6, s: 1.16, fx: 760, fy: 560, ease: easeInOutCubic },
  { t: 8.7, s: 1.42, fx: 600, fy: 560, cut: true },
  { t: 9.4, s: 1.34, fx: 560, fy: 560 },
  { t: 9.6, s: 1.08, fx: 960, fy: 560, ease: easeInOutCubic },
  { t: 11.0, s: 1.06, fx: 960, fy: 560 },
  { t: 11.3, s: 1.2, fx: 820, fy: 560, ease: easeOutCubic },
  { t: 11.6, s: 1.34, fx: 900, fy: 540, cut: true },
  { t: 12.2, s: 1.22, fx: 1040, fy: 560, cut: true },
  { t: 12.9, s: 1.36, fx: 900, fy: 540, cut: true },
  { t: 13.6, s: 1.22, fx: 1060, fy: 560, cut: true },
  { t: 14.3, s: 1.36, fx: 940, fy: 540, cut: true },
  { t: 14.7, s: 1.0, fx: 960, fy: 560, ease: easeOutCubic },
  { t: 15.1, s: 1.0, fx: 960, fy: 540 },
  // Power-up. `fx`/`fy` stay centred here because one table has to serve both
  // outcomes — PetFightStage blends the focus onto whichever pet is actually
  // transforming while XFORM_IN..XFORM_OUT is on screen.
  { t: 15.6, s: 1.06, fx: 960, fy: 545, ease: easeInOutSine },
  { t: 16.1, s: 1.18, fx: 960, fy: 520, ease: easeInOutSine },
  { t: 17.0, s: 1.26, fx: 960, fy: 505, ease: easeInOutSine },
  { t: 18.6, s: 1.46, fx: 960, fy: 495, ease: easeInOutCubic },
  { t: 19.5, s: 1.54, fx: 960, fy: 495 },
  { t: 19.6, s: 1.02, fx: 960, fy: 540, cut: true },
  { t: 20.3, s: 1.05, fx: 960, fy: 540 },
  { t: 21.0, s: 1.12, fx: 960, fy: 540, ease: easeOutCubic },
  { t: 22.1, s: 1.02, fx: 960, fy: 550, ease: easeInOutCubic },
  { t: 23, s: 1.05, fx: 960, fy: 520, ease: easeInOutSine },
  { t: 23.1, s: 1.34, fx: 560, fy: 340, cut: true },
  { t: 23.9, s: 1.3, fx: 560, fy: 320, ease: easeInOutSine },
  { t: 24, s: 1.34, fx: 1180, fy: 520, cut: true },
  { t: 24.8, s: 1.3, fx: 1160, fy: 520 },
  { t: 24.85, s: 1.12, fx: 960, fy: 540, cut: true },
  { t: 25.5, s: 1.12, fx: 960, fy: 540 },
  { t: 25.55, s: 0.92, fx: 960, fy: 540, ease: easeOutExpo },
  { t: 26, s: 0.95, fx: 960, fy: 540 },
  { t: 26.05, s: 1.5, fx: 960, fy: 540, cut: true },
  { t: 26.45, s: 1.5, fx: 960, fy: 540 },
  { t: 26.85, s: 1.55, fx: 960, fy: 540 },
  { t: 27, s: 1.1, fx: 1000, fy: 560, ease: easeInOutCubic },
  { t: 29, s: 1.08, fx: 1000, fy: 560 },
  { t: 29.1, s: 1.4, fx: 640, fy: 560, cut: true },
  { t: 29.5, s: 1.42, fx: 660, fy: 560 },
  { t: 29.9, s: 1.6, fx: 660, fy: 540, cut: true },
  { t: 30.05, s: 1.6, fx: 660, fy: 540 },
  { t: 30.2, s: 1.3, fx: 820, fy: 560, ease: easeOutCubic },
  // Pull back off the slam into a two-shot: the winner posing and the pet they
  // put down, both in frame. PetFightStage mirrors this focus when the winner
  // is the right-hand pet (see lib/pet-fight/camera.ts).
  { t: 30.8, s: 1.02, fx: 1210, fy: 640, ease: easeInOutCubic },
  { t: 31, s: 1.02, fx: 1210, fy: 640 },
  { t: 32, s: 1.02, fx: 1210, fy: 640 },
];

export const DARK: Keyframe[] = [
  { t: 0, v: 0.06 },
  { t: 1.0, v: 0.22 },
  { t: 3, v: 0.14 },
  { t: 15, v: 0.14 },
  // The power-up dims the arena right down so the gold is the only light in
  // the frame, then the flash blows it away in one cut.
  { t: 15.6, v: 0.24 },
  { t: 16.1, v: 0.36 },
  { t: 17.0, v: 0.52 },
  { t: 18.6, v: 0.64 },
  { t: 19.5, v: 0.68 },
  { t: 19.6, v: 0.0, cut: true },
  { t: 20.3, v: 0.1 },
  { t: 21.0, v: 0.18 },
  { t: 22.1, v: 0.16 },
  { t: 23, v: 0.44 },
  { t: 25.5, v: 0.52 },
  { t: 26, v: 0.12 },
  { t: 26.4, v: 0.0 },
  { t: 27, v: 0.32 },
  { t: 29, v: 0.28 },
  { t: 29.9, v: 0.08 },
  { t: 30.5, v: 0.26 },
  { t: 31, v: 0.12 },
  { t: 32, v: 0.12 },
];

export const CAT_KF: Keyframe[] = [
  { t: 0, dx: 0, dy: 0, rot: 0, sc: 1 },
  { t: 3.0, dx: 0, dy: 0, rot: 0, sc: 1 },
  { t: 3.15, dx: -10, dy: 24, rot: -6, sc: 1, ease: easeOutQuad },
  { t: 3.35, dx: 130, dy: -150, rot: 0, sc: 1.05, ease: easeOutCubic },
  { t: 3.75, dx: 210, dy: -120, rot: 720, sc: 1.05 },
  { t: 3.95, dx: 180, dy: -40, rot: 720, sc: 1.0 },
  { t: 4.6, dx: 0, dy: 0, rot: 720, sc: 1, ease: easeInOutCubic },
  { t: 8.7, dx: 0, dy: 0, rot: 720, sc: 1 },
  { t: 8.8, dx: -40, dy: -30, rot: 700, sc: 1.06 },
  { t: 9.35, dx: -160, dy: 0, rot: 360, sc: 1, ease: easeOutCubic },
  { t: 10.2, dx: 0, dy: 0, rot: 360, sc: 1, ease: easeInOutCubic },
  { t: 11.0, dx: 0, dy: 0, rot: 360, sc: 1 },
  { t: 11.3, dx: 250, dy: 0, rot: 360, sc: 1.05, ease: easeInCubic },
  { t: 14.4, dx: 250, dy: 0, rot: 360, sc: 1.05 },
  { t: 14.75, dx: -30, dy: -50, rot: 360, sc: 1.0, ease: easeOutCubic },
  { t: 15.1, dx: 0, dy: 0, rot: 360, sc: 1 },
  // Power-up: crouch and brace, strain upward for five seconds, then burst out
  // a size bigger.
  // The 1.12 scale is kept for the rest of the fight — this pet is stronger now.
  { t: 15.6, dx: 0, dy: 18, rot: 360, sc: 0.97, ease: easeOutQuad },
  { t: 16.1, dx: 0, dy: 14, rot: 360, sc: 1.0 },
  { t: 17.0, dx: 0, dy: 8, rot: 360, sc: 1.02, ease: easeInOutSine },
  { t: 18.6, dx: 0, dy: 2, rot: 360, sc: 1.05, ease: easeInOutSine },
  { t: 19.5, dx: 0, dy: -6, rot: 360, sc: 1.07 },
  { t: 19.6, dx: 0, dy: -40, rot: 360, sc: 1.16, ease: easeOutExpo },
  { t: 20.05, dx: 0, dy: -18, rot: 360, sc: 1.12, ease: easeOutCubic },
  { t: 21.0, dx: 0, dy: -22, rot: 360, sc: 1.12 },
  { t: 22.1, dx: 0, dy: 0, rot: 360, sc: 1.12, ease: easeInOutCubic },
  { t: 25.4, dx: 0, dy: 0, rot: 360, sc: 1.12 },
  { t: 25.55, dx: 24, dy: -22, rot: 360, sc: 1.2 },
  { t: 26, dx: 0, dy: 0, rot: 360, sc: 1.12 },
  { t: 26.1, dx: -50, dy: 0, rot: 360, sc: 1.12, ease: easeOutQuad },
  { t: 29, dx: -30, dy: 0, rot: 360, sc: 1.12 },
  { t: 29.1, dx: 20, dy: -70, rot: 360, sc: 1.17, ease: easeOutQuad },
  { t: 29.5, dx: 70, dy: 0, rot: 360, sc: 1.24, ease: easeOutBack },
  { t: 32, dx: 70, dy: 0, rot: 360, sc: 1.24 },
];

export const DRA_KF: Keyframe[] = [
  { t: 0, dx: 0, dy: 0, rot: 0, sc: 1 },
  { t: 4.4, dx: 0, dy: 0, rot: 0, sc: 1 },
  { t: 4.55, dx: 60, dy: -22, rot: 8, sc: 1.05 },
  { t: 5.1, dx: 150, dy: 0, rot: 12, sc: 1, ease: easeOutCubic },
  { t: 6.0, dx: 0, dy: 0, rot: 0, sc: 1, ease: easeInOutCubic },
  { t: 7.0, dx: 0, dy: 0, rot: 0, sc: 1 },
  { t: 7.2, dx: 34, dy: 22, rot: -4, sc: 1.02, ease: easeOutQuad },
  { t: 7.75, dx: -80, dy: -10, rot: 0, sc: 1.06, ease: easeOutCubic },
  { t: 8.4, dx: 0, dy: 0, rot: 0, sc: 1, ease: easeInOutCubic },
  { t: 11.0, dx: 0, dy: 0, rot: 0, sc: 1 },
  { t: 11.3, dx: -250, dy: 0, rot: 0, sc: 1.05, ease: easeInCubic },
  { t: 14.4, dx: -250, dy: 0, rot: 0, sc: 1.05 },
  { t: 14.75, dx: 30, dy: -34, rot: 0, sc: 1.0, ease: easeOutCubic },
  { t: 15.1, dx: 0, dy: 0, rot: 0, sc: 1 },
  // The foe digs in and is walked backwards by the wind for the whole scene —
  // only the pet on the hero track above actually grows — then the burst blows
  // them off their feet.
  { t: 15.6, dx: 0, dy: 8, rot: -2, sc: 0.99, ease: easeOutQuad },
  { t: 16.1, dx: 12, dy: 10, rot: -5, sc: 0.98, ease: easeOutQuad },
  { t: 17.0, dx: 26, dy: 8, rot: -8, sc: 0.98, ease: easeInOutSine },
  { t: 18.6, dx: 44, dy: 6, rot: -10, sc: 0.97, ease: easeInOutSine },
  { t: 19.5, dx: 52, dy: 4, rot: -11, sc: 0.97 },
  { t: 19.6, dx: 130, dy: 0, rot: -14, sc: 0.96, ease: easeOutExpo },
  { t: 20.5, dx: 80, dy: 0, rot: -6, sc: 0.98, ease: easeOutCubic },
  { t: 22.1, dx: 20, dy: 0, rot: 0, sc: 1, ease: easeInOutCubic },
  { t: 25.4, dx: 0, dy: 0, rot: 0, sc: 1 },
  { t: 25.55, dx: -22, dy: -16, rot: 0, sc: 1.08 },
  { t: 26, dx: 0, dy: 0, rot: 0, sc: 1 },
  { t: 26.1, dx: 44, dy: 0, rot: 0, sc: 1, ease: easeOutQuad },
  { t: 27, dx: 24, dy: 0, rot: 0, sc: 1 },
  { t: 29, dx: 24, dy: 0, rot: 0, sc: 1 },
  { t: 29.15, dx: 120, dy: -46, rot: 18, sc: 1.05, ease: easeOutQuad },
  { t: 29.55, dx: 150, dy: -26, rot: 24, sc: 1.05 },
  { t: 29.72, dx: 150, dy: -26, rot: 24, sc: 1.05 },
  // The fall rotates about the feet, so the body swings out sideways by a whole
  // sprite width — skidding any further than this hangs it off the stage.
  { t: 30.2, dx: 230, dy: 120, rot: 86, sc: 1, ease: easeInCubic },
  { t: 31, dx: 240, dy: 140, rot: 90, sc: 1, ease: easeOutQuad },
  { t: 32, dx: 240, dy: 140, rot: 90, sc: 1 },
];

/** [t0, amp, dur] shake impulses. */
export const SHAKES: [number, number, number][] = [
  // The seven mid-fight hits. Kept under the power-up's 40 (pillar) and 56
  // (flash) on purpose: if a combo punch shakes the screen harder than the
  // transformation does, the fifteen seconds of build-up count for nothing.
  [4.5, 36, 0.55],
  [8.85, 38, 0.6],
  [11.6, 24, 0.3],
  [12.2, 26, 0.3],
  [12.9, 30, 0.32],
  [13.6, 28, 0.3],
  [14.3, 32, 0.34],
  // Power-up: a long low rumble under the quake, escalating to the burst.
  [15.6, 8, 1.6],
  [16.1, 14, 1.2],
  [17.0, 26, 1.0],
  [18.6, 40, 0.9],
  [19.6, 56, 1.2],
  [26.05, 46, 1.0],
  [29.15, 20, 0.4],
  [30.2, 48, 0.75],
];

/**
 * How the arena reacts under the pet that just took a hit. Varied deliberately
 * so seven punches do not read as one punch played seven times.
 */
export type ImpactKind = "crack" | "gust" | "zap" | "dust";

export type Impact = {
  t: number;
  /** Who threw it. The reaction lands on the OTHER pet. */
  by: "left" | "right";
  kind: ImpactKind;
  /** 0-1: scales the reaction's size, opacity and how long it lives. */
  power: number;
  /**
   * The comic spark at the point of contact — roughly between the fighters,
   * which is NOT where the reaction goes. See ImpactFx.
   */
  star: { x: number; y: number; size: number; label?: string };
  /** Big screen-space word over the melee, and its x offset from centre. */
  shout?: { text: string; x: number };
};

/**
 * Every hit that lands before the power-up: two thrown attacks and a five-hit
 * melee. The finisher and the K.O. are not here — they carry their own visuals.
 *
 * One table for three jobs (star burst, shout, arena reaction) so a hit can
 * gain a field without being edited in three places. SHAKES still holds its own
 * matching entries; a test keeps the two in step.
 */
/** How long one hit's reaction lives. Heavier hits linger slightly longer. */
export function impactLife(power: number): number {
  return 0.34 + power * 0.28;
}

export const IMPACTS: Impact[] = [
  {
    t: 4.5,
    by: "left",
    kind: "gust",
    power: 0.85,
    star: { x: 1280, y: 590, size: 300, label: "POW" },
  },
  {
    t: 8.85,
    by: "right",
    kind: "zap",
    power: 0.9,
    star: { x: 620, y: 580, size: 300, label: "KRAK" },
  },
  {
    t: 11.6,
    by: "left",
    kind: "dust",
    power: 0.5,
    star: { x: 880, y: 540, size: 230, label: "POW" },
    shout: { text: "HIT!", x: -140 },
  },
  {
    t: 12.2,
    by: "right",
    kind: "crack",
    power: 0.55,
    star: { x: 1030, y: 570, size: 230, label: "BAM" },
    shout: { text: "HIT!", x: 160 },
  },
  {
    t: 12.9,
    by: "left",
    kind: "zap",
    power: 0.65,
    star: { x: 900, y: 520, size: 230, label: "HIT" },
    shout: { text: "COMBO!", x: -40 },
  },
  {
    t: 13.6,
    by: "right",
    kind: "gust",
    power: 0.6,
    star: { x: 1050, y: 560, size: 230, label: "WHAM" },
    shout: { text: "HIT!", x: 180 },
  },
  {
    t: 14.3,
    by: "left",
    kind: "crack",
    power: 0.8,
    star: { x: 940, y: 540, size: 230, label: "POW" },
    shout: { text: "COMBO!", x: 0 },
  },
];

/**
 * The finisher landing, and the pet going down under it.
 *
 * Separate from IMPACTS because the target is not scripted: these land on
 * whoever LOST, which is only known per duel, so `by` is filled in as the
 * winner at render time. Nothing here fires on a draw — neither pet connects.
 *
 * `boost` scales the reaction past what a combo punch can reach. This is the
 * blow the whole fight has been building to; it is allowed to dwarf them.
 */
export type FinishHit = {
  t: number;
  kind: ImpactKind;
  power: number;
  /** Multiplies both the size and how long it lives. */
  boost: number;
};

export const FINISH_HITS: FinishHit[] = [
  // The blast connects: floor opens, then they are blown off it.
  { t: BEAT.impact, kind: "crack", power: 1, boost: 2.3 },
  { t: BEAT.impact + 0.08, kind: "gust", power: 1, boost: 1.9 },
  // Knocked off their feet by the lunge.
  { t: BEAT.push, kind: "gust", power: 0.85, boost: 1.4 },
  // And the body hits the ground.
  { t: BEAT.ko, kind: "crack", power: 1, boost: 2.0 },
  { t: BEAT.ko + 0.06, kind: "dust", power: 1, boost: 1.8 },
];

export const CAT_AURA = "rgba(214,140,255,0.95)";
export const DRA_AURA = "rgba(255,150,60,0.9)";
export const STAR_CAT = "#c46bff";
export const STAR_DRA = "#ff8a3c";
export const STAR_KO = "#ffd23c";
