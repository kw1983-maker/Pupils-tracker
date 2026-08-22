/**
 * Authored storyboard tables for the 25s Purr Pop vs Dragon Flame cinematic.
 * Source: design handoff pet-fight.jsx — timings are absolute seconds on clock T.
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

export const FIGHT_DURATION = 25;
export const W = 1920;
export const H = 1080;

/** Ground-anchor of Purr Pop (cat). */
export const CAT = { x: 560, y: 760, w: 300 } as const;
/** Ground-anchor of Dragon Flame. */
export const DRA = { x: 1360, y: 780, w: 420 } as const;

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
  { t: 16.0, s: 1.05, fx: 960, fy: 520, ease: easeInOutSine },
  { t: 16.1, s: 1.34, fx: 560, fy: 340, cut: true },
  { t: 16.9, s: 1.3, fx: 560, fy: 320, ease: easeInOutSine },
  { t: 17.0, s: 1.34, fx: 1180, fy: 520, cut: true },
  { t: 17.8, s: 1.3, fx: 1160, fy: 520 },
  { t: 17.85, s: 1.12, fx: 960, fy: 540, cut: true },
  { t: 18.5, s: 1.12, fx: 960, fy: 540 },
  { t: 18.55, s: 0.92, fx: 960, fy: 540, ease: easeOutExpo },
  { t: 19.0, s: 0.95, fx: 960, fy: 540 },
  { t: 19.05, s: 1.5, fx: 960, fy: 540, cut: true },
  { t: 19.45, s: 1.5, fx: 960, fy: 540 },
  { t: 19.85, s: 1.55, fx: 960, fy: 540 },
  { t: 20.0, s: 1.1, fx: 1000, fy: 560, ease: easeInOutCubic },
  { t: 22.0, s: 1.08, fx: 1000, fy: 560 },
  { t: 22.1, s: 1.4, fx: 640, fy: 560, cut: true },
  { t: 22.5, s: 1.42, fx: 660, fy: 560 },
  { t: 22.9, s: 1.6, fx: 660, fy: 540, cut: true },
  { t: 23.05, s: 1.6, fx: 660, fy: 540 },
  { t: 23.2, s: 1.25, fx: 780, fy: 560, ease: easeOutCubic },
  { t: 24.0, s: 1.16, fx: 680, fy: 560, ease: easeInOutSine },
  { t: 25.0, s: 1.16, fx: 680, fy: 560 },
];

export const DARK: Keyframe[] = [
  { t: 0, v: 0.06 },
  { t: 1.0, v: 0.22 },
  { t: 3, v: 0.14 },
  { t: 15, v: 0.14 },
  { t: 16, v: 0.44 },
  { t: 18.5, v: 0.52 },
  { t: 19.0, v: 0.12 },
  { t: 19.4, v: 0.0 },
  { t: 20.0, v: 0.32 },
  { t: 22, v: 0.28 },
  { t: 22.9, v: 0.08 },
  { t: 23.5, v: 0.26 },
  { t: 24, v: 0.12 },
  { t: 25, v: 0.12 },
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
  { t: 18.4, dx: 0, dy: 0, rot: 360, sc: 1 },
  { t: 18.55, dx: 24, dy: -22, rot: 360, sc: 1.08 },
  { t: 19.0, dx: 0, dy: 0, rot: 360, sc: 1 },
  { t: 19.1, dx: -50, dy: 0, rot: 360, sc: 1.0, ease: easeOutQuad },
  { t: 22.0, dx: -30, dy: 0, rot: 360, sc: 1 },
  { t: 22.1, dx: 20, dy: -70, rot: 360, sc: 1.05, ease: easeOutQuad },
  { t: 22.5, dx: 70, dy: 0, rot: 360, sc: 1.12, ease: easeOutBack },
  { t: 25, dx: 70, dy: 0, rot: 360, sc: 1.12 },
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
  { t: 18.4, dx: 0, dy: 0, rot: 0, sc: 1 },
  { t: 18.55, dx: -22, dy: -16, rot: 0, sc: 1.08 },
  { t: 19.0, dx: 0, dy: 0, rot: 0, sc: 1 },
  { t: 19.1, dx: 44, dy: 0, rot: 0, sc: 1, ease: easeOutQuad },
  { t: 20.0, dx: 24, dy: 0, rot: 0, sc: 1 },
  { t: 22.0, dx: 24, dy: 0, rot: 0, sc: 1 },
  { t: 22.15, dx: 120, dy: -46, rot: 18, sc: 1.05, ease: easeOutQuad },
  { t: 22.55, dx: 150, dy: -26, rot: 24, sc: 1.05 },
  { t: 22.72, dx: 150, dy: -26, rot: 24, sc: 1.05 },
  { t: 23.2, dx: 300, dy: 120, rot: 86, sc: 1, ease: easeInCubic },
  { t: 24.0, dx: 320, dy: 140, rot: 90, sc: 1, ease: easeOutQuad },
  { t: 25, dx: 320, dy: 140, rot: 90, sc: 1 },
];

/** [t0, amp, dur] shake impulses. */
export const SHAKES: [number, number, number][] = [
  [4.5, 26, 0.5],
  [8.85, 30, 0.55],
  [11.6, 15, 0.22],
  [12.2, 15, 0.22],
  [12.9, 18, 0.24],
  [13.6, 15, 0.22],
  [14.3, 18, 0.24],
  [19.05, 46, 1.0],
  [22.15, 20, 0.4],
  [23.2, 48, 0.75],
];

export const COMBO_HITS = [
  { t: 11.6, x: 880, y: 540, label: "POW", side: "cat" as const },
  { t: 12.2, x: 1030, y: 570, label: "BAM", side: "dra" as const },
  { t: 12.9, x: 900, y: 520, label: "HIT", side: "cat" as const },
  { t: 13.6, x: 1050, y: 560, label: "WHAM", side: "dra" as const },
  { t: 14.3, x: 940, y: 540, label: "POW", side: "cat" as const },
];

export const CAT_AURA = "rgba(214,140,255,0.95)";
export const DRA_AURA = "rgba(255,150,60,0.9)";
export const STAR_CAT = "#c46bff";
export const STAR_DRA = "#ff8a3c";
export const STAR_KO = "#ffd23c";

/** Baked master soundtrack for the cinematic (copied from design handoff). */
export const FIGHT_MIX_SRC = "/pets/battle/fight-mix.wav";
