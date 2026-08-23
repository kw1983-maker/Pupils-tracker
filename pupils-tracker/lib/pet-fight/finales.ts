/**
 * Finishing moves for the Pet PK cinematic.
 *
 * The duel used to end exactly one way — the winner poured a power beam, the
 * loser fell, "K.O.!" — so a class had seen the whole ending after two duels.
 * The spine is still shared (charge → release → impact → fall → banner); what
 * varies is the release-to-impact visual, the extra screen shake, the word on
 * the slam and the clip that plays under it.
 *
 * Visuals live in components/ui/pet-fight/Finales.tsx, one component per id.
 */

import type { BattleSound } from "@/lib/pet-battle-sfx";

export type FinaleId =
  | "beam"
  | "meteor"
  | "rush"
  | "orb"
  | "freeze"
  | "skyfall";

export type FinaleSpec = {
  id: FinaleId;
  /** Clip fired at BEAT.release. */
  sound: BattleSound;
  /** Slam banner replacing the old hardcoded "K.O.!". */
  koWord: string;
  koColor: string;
  koStroke: string;
  /** Drop shadow under the banner — the second colour of the 3D offset. */
  koShadow: string;
  /** Label + colour of the star burst thrown at the loser. */
  starLabel: string;
  starColor: string;
  /** [t0, amp, dur] impulses layered on top of storyboard SHAKES. */
  shakes: [number, number, number][];
};

export const FINALES: Record<FinaleId, FinaleSpec> = {
  // The original: a continuous stream poured from the winner into the foe.
  beam: {
    id: "beam",
    sound: "beam",
    koWord: "K.O.!",
    koColor: "#ffe14d",
    koStroke: "#6d0f18",
    koShadow: "#b21e2a",
    starLabel: "K.O",
    starColor: "#ffd23c",
    shakes: [],
  },
  // Winner leaves the frame upward, comes back down as a comet.
  meteor: {
    id: "meteor",
    sound: "meteor",
    koWord: "SMASH!",
    koColor: "#ffb03c",
    koStroke: "#5c2306",
    koShadow: "#c1400e",
    starLabel: "BOOM",
    starColor: "#ff8a3c",
    // The landing is a single enormous hit rather than a sustained pour, so it
    // needs its own slam on top of the shared impact shake.
    shakes: [
      [24.05, 60, 1.1],
      [24.5, 22, 0.6],
    ],
  },
  // Blink-and-strike: afterimages ringing the loser, then one uppercut.
  rush: {
    id: "rush",
    sound: "rush",
    koWord: "COMBO K.O.!",
    koColor: "#ff8ede",
    koStroke: "#4a0d3a",
    koShadow: "#b3208a",
    starLabel: "RUSH",
    starColor: "#ff5ec7",
    // One short jolt per blink so the screen keeps snapping with the strikes.
    shakes: [
      [23.7, 16, 0.14],
      [23.86, 16, 0.14],
      [24.02, 18, 0.14],
      [24.18, 18, 0.14],
      [24.34, 22, 0.18],
      [24.55, 44, 0.7],
    ],
  },
  // Spirit bomb: a huge sphere raised overhead, then thrown.
  orb: {
    id: "orb",
    sound: "orb",
    koWord: "BOOM!",
    koColor: "#7dffd4",
    koStroke: "#063528",
    koShadow: "#0a7a5c",
    starLabel: "BOOM",
    starColor: "#4fe3b0",
    shakes: [
      [23.55, 8, 0.9],
      [24.05, 56, 1.3],
    ],
  },
  // Called down rather than thrown: the winner raises a hand and a column of
  // power falls on the foe out of the sky. The one finisher aimed straight
  // down, so it reads differently from the meteor even at a glance.
  skyfall: {
    id: "skyfall",
    sound: "skyfall",
    koWord: "WIPEOUT!",
    koColor: "#e0c2ff",
    koStroke: "#2e0d5c",
    koShadow: "#7b2ff7",
    starLabel: "ZAP",
    starColor: "#c46bff",
    shakes: [
      [23.9, 14, 0.45],
      [24.05, 58, 1.4],
    ],
  },
  // Encase and shatter — the only finisher that goes quiet before it lands.
  freeze: {
    id: "freeze",
    sound: "freeze",
    koWord: "SHATTER!",
    koColor: "#bfe9ff",
    koStroke: "#0b3552",
    koShadow: "#1d74ad",
    starLabel: "CRAK",
    starColor: "#8fd8ff",
    shakes: [[24.05, 40, 0.8]],
  },
};

export const FINALE_IDS = Object.keys(FINALES) as FinaleId[];

export function finaleSpec(id: FinaleId | undefined): FinaleSpec {
  return FINALES[id ?? "beam"] ?? FINALES.beam;
}

/** One finisher per duel, so consecutive matches don't end the same way. */
export function pickFinale(): FinaleId {
  return FINALE_IDS[Math.floor(Math.random() * FINALE_IDS.length)]!;
}
