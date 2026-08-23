/**
 * Artwork for the power-up scene.
 *
 * The energy pieces are painted as white shapes on a solid black background —
 * no alpha. FxTint composites them with a multiply/screen sandwich that both
 * tints them gold and drops the black, so one asset serves any colour and the
 * scene stays in step with the GOLD_* tokens. The rocks are ordinary painted
 * PNGs with real transparency, because earth should not glow.
 */

export const PET_FX_VERSION = "1";

/** White-on-black energy art, composited through FxTint. */
export const FX_ENERGY = [
  "crack-ground",
  "wind-streak",
  "lightning-arc",
  "shockwave-ring",
  "dust-sheet",
  "aura-flame",
] as const;

/** Dark-on-white cloud art, multiplied straight over the sky. */
export const FX_SKY = ["storm-clouds"] as const;

/** Painted earth chunks with real transparency, drawn as normal images. */
export const FX_ROCKS = ["rock-a", "rock-b", "rock-c"] as const;

export type FxAsset =
  | (typeof FX_ENERGY)[number]
  | (typeof FX_SKY)[number]
  | (typeof FX_ROCKS)[number];

/**
 * Whether the art in public/pets/fx exists yet.
 *
 * This is not belt-and-braces. FxTint colours the art by multiplying a gold
 * layer over it inside an isolated box; if the image 404s there is nothing to
 * multiply against and the box paints as a solid gold rectangle across the
 * stage. Until every file is in the repo the scene falls back to the div-only
 * version, which is worse but correct.
 */
export const FX_ART_READY = true;

export function fxSrc(name: FxAsset): string {
  return `/pets/fx/${name}.webp?v=${PET_FX_VERSION}`;
}
