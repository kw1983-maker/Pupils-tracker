// Recorded sound effects for a Pet PK duel.
//
// The duel used to run entirely on synthesised oscillator tones. Those existed
// to dodge an autoplay problem — setTimeout + audio.play() is silent on many
// school Chromebooks — not because they sounded good; a dragon fighting a tiger
// sounded like a calculator. These are real clips (see
// scripts/generate-battle-sounds.mjs), and lib/sound.ts decodes them up-front
// and schedules them on the very AudioContext clock that fixed the silence, so
// the reliability is kept and the beeps go away.

/** Battle cues, distinct from the per-power sounds in lib/pet-powers.ts. */
export const BATTLE_SOUNDS = [
  "countdown",
  // The go signal on "FIGHT!", so the countdown resolves into something rather
  // than just stopping.
  "fight",
  "announce",
  // A round past the schedule is the duel's rarest moment; it gets its own
  // sting instead of the same bell as round one.
  "sudden",
  "charge",
  "hit",
  // A second impact, alternated with "hit" — three identical thuds in a row
  // read as a stuck sound rather than three blows.
  "hit2",
  "critical",
  // The class reacting: a gasp behind a critical, cheering over the win. The
  // arena already draws a crowd and confetti; this is them making a noise.
  "gasp",
  "crowd",
  "block",
  "victory",
  // The power-up scene before the charge: the winner flares gold and levels up.
  // Seven seconds is longer than one clip can carry, so quake and wind run
  // underneath the sting as beds rather than landing on a beat of their own.
  "quake",
  "wind",
  "transform",
  "levelup",
  // Drastic finale when the loser falls — bigger than critical/hit.
  // Five variants; live PK picks one at random per duel.
  "ko",
  "ko2",
  "ko3",
  "ko4",
  "ko5",
  // Finishers — one clip per FINALES entry in lib/pet-fight/finales.ts.
  // "beam" is the original Dragon Ball last-resort power stream.
  "beam",
  "meteor",
  "rush",
  "orb",
  "freeze",
  "skyfall",
] as const;

export type BattleSound = (typeof BATTLE_SOUNDS)[number];

/** Finale slam clips — one is chosen per duel so endings don't feel identical. */
export const KO_FINALES = ["ko", "ko2", "ko3", "ko4", "ko5"] as const;
export type KoFinale = (typeof KO_FINALES)[number];

/**
 * Where the transform sting's loudest moment falls inside its own clip.
 *
 * Sound generation gives no control over when the payoff lands, so this is
 * measured off the finished file rather than assumed — the clip swells to a
 * plateau at 2.7s and decays from about 3.4s. The scene cues the sting by this
 * offset so the swell covers the pillar and the white flash instead of
 * starting with the scene and peaking somewhere in the middle of it.
 *
 * Re-measure after regenerating the clip:
 *   ffmpeg -i public/pets/battle/transform.mp3 -af  *     "aresample=8000,asetnsamples=800,astats=metadata=1:reset=1, *      ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null -
 */
export const TRANSFORM_BURST_AT = 2.7;

// Bump when a clip is regenerated so browsers drop the cached copy.
export const PET_BATTLE_VERSION = "8";

export function battleSoundSrc(id: BattleSound): string {
  return `/pets/battle/${id}.mp3?v=${PET_BATTLE_VERSION}`;
}

export function pickKoFinale(): KoFinale {
  return KO_FINALES[Math.floor(Math.random() * KO_FINALES.length)]!;
}
