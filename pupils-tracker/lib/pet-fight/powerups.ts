/**
 * Transformations for the Pet PK power-up scene.
 *
 * The scene used to run exactly one way — the winner flared Super-Saiyan gold,
 * the same storm rolled over, the same sting played — so a class had seen every
 * level-up after one duel. This is the same trick FINALES plays on the ending:
 * the spine is shared (hush → quake → ignite → storm → pillar → flash →
 * banner), and what varies is the palette, which of the seven FX assets carry
 * the scene, the word on the banner and the clip underneath.
 *
 * The palette reaches the visuals as CSS custom properties set on the stage
 * root, not as props. Forty-five places across four files paint with the gold
 * ramp; var() lets every one of them stay exactly as written.
 */

import type { BattleSound } from "@/lib/pet-battle-sfx";

export type PowerUpId = "gold" | "crimson" | "violet" | "azure" | "emerald";

/**
 * How strongly each of the seven FX assets features, as a multiplier on its
 * default. This is what stops the five reading as one scene recoloured: an
 * azure transformation is mostly lightning, an emerald one mostly ground.
 */
export type PowerUpWeights = {
  flame: number;
  lightning: number;
  rock: number;
  wind: number;
  crack: number;
};

export type PowerUpSpec = {
  id: PowerUpId;
  /** Sting fired so its swell lands on BEAT.flash. */
  sound: BattleSound;
  /**
   * Seconds into that clip where the loudest moment sits, MEASURED off the
   * finished file — sound generation gives no control over when the payoff
   * lands, so this is never assumed. See TRANSFORM_BURST_AT in pet-battle-sfx.
   */
  burstAt: number;
  /** The aura ramp: bright core, body, deep edge, plus the orb/glow colour. */
  core: string;
  mid: string;
  deep: string;
  aura: string;
  /** Replaces the hardcoded "POWER UP!". */
  banner: string;
  bannerColor: string;
  bannerStroke: string;
  bannerShadow: string;
  weights: PowerUpWeights;
};

const EVEN: PowerUpWeights = {
  flame: 1,
  lightning: 1,
  rock: 1,
  wind: 1,
  crack: 1,
};

export const POWERUPS: Record<PowerUpId, PowerUpSpec> = {
  // The original Super-Saiyan gold, and the only one with a measured sting
  // before this change. Everything in balance.
  gold: {
    id: "gold",
    sound: "transform",
    burstAt: 2.7,
    core: "#fff6c0",
    mid: "#ffd23c",
    deep: "#ff9d1c",
    aura: "rgba(255,210,60,0.95)",
    banner: "POWER UP!",
    bannerColor: "#ffe14d",
    bannerStroke: "#5c3000",
    bannerShadow: "#a55a00",
    weights: EVEN,
  },
  // Rage. The aura itself does the work — flame everywhere, little lightning.
  crimson: {
    id: "crimson",
    sound: "transform2",
    burstAt: 3.11,
    core: "#fff0e0",
    mid: "#ff6b3d",
    deep: "#c81e1e",
    aura: "rgba(255,90,50,0.95)",
    banner: "BURNING!",
    bannerColor: "#ffd0a0",
    bannerStroke: "#5c1200",
    bannerShadow: "#a52a00",
    weights: { ...EVEN, flame: 1.8, lightning: 0.35, rock: 0.6, crack: 0.8 },
  },
  // Gravity. The arena comes apart and hangs in the air; the pet barely burns.
  violet: {
    id: "violet",
    sound: "transform3",
    burstAt: 3.37,
    core: "#f4e6ff",
    mid: "#b46bff",
    deep: "#6a1fb0",
    aura: "rgba(190,110,255,0.95)",
    banner: "AWAKENED!",
    bannerColor: "#e6c8ff",
    bannerStroke: "#2e0a52",
    bannerShadow: "#6a1fb0",
    weights: { flame: 0.6, lightning: 0.6, rock: 2, wind: 0.7, crack: 0.9 },
  },
  // Storm. Almost all lightning, driven on a hard wind.
  azure: {
    id: "azure",
    sound: "transform4",
    // Front-loaded: this clip is loudest almost immediately and decays, so the
    // sting starts around the pillar rather than the ignite. The quake and wind
    // beds still cover the build, so nothing goes quiet.
    burstAt: 1.2,
    core: "#eaffff",
    mid: "#57d8ff",
    deep: "#1a6fd4",
    aura: "rgba(90,210,255,0.95)",
    banner: "OVERCHARGE!",
    bannerColor: "#d8f8ff",
    bannerStroke: "#062f57",
    bannerShadow: "#1a6fd4",
    weights: { flame: 0.45, lightning: 2, rock: 0.6, wind: 1.3, crack: 0.7 },
  },
  // Earth. The ground does everything; the sky stays comparatively quiet.
  emerald: {
    id: "emerald",
    sound: "transform5",
    burstAt: 1.75,
    core: "#eeffe4",
    mid: "#6ee06a",
    deep: "#1f8f3a",
    aura: "rgba(110,224,106,0.95)",
    banner: "UNLEASHED!",
    bannerColor: "#dcffd0",
    bannerStroke: "#083a16",
    bannerShadow: "#1f8f3a",
    weights: { flame: 0.6, lightning: 0.5, rock: 1.4, wind: 0.8, crack: 1.9 },
  },
};

export const POWERUP_IDS = Object.keys(POWERUPS) as PowerUpId[];

export function powerUpSpec(id: PowerUpId | undefined): PowerUpSpec {
  return POWERUPS[id ?? "gold"] ?? POWERUPS.gold;
}

/** One transformation per duel, the way pickFinale() picks the ending. */
export function pickPowerUp(): PowerUpId {
  return POWERUP_IDS[Math.floor(Math.random() * POWERUP_IDS.length)]!;
}

/**
 * The palette as CSS custom properties for the stage root.
 *
 * Every gold token in storyboard.ts is a var() with the gold value as its
 * fallback, so a stage that sets nothing still renders exactly as before.
 */
export function powerUpVars(spec: PowerUpSpec): Record<string, string> {
  return {
    "--pu-core": spec.core,
    "--pu-mid": spec.mid,
    "--pu-deep": spec.deep,
    "--pu-aura": spec.aura,
  };
}
