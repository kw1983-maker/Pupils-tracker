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
  // One sting per POWERUPS entry in lib/pet-fight/powerups.ts — a burning
  // transformation should not sound like a frozen one. The quake and wind beds
  // and the levelup chime are shared across all five.
  "transform",
  "transform2",
  "transform3",
  "transform4",
  "transform5",
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
 * Note on the transform stings: where each clip's loudest moment falls is
 * MEASURED off the finished file and lives in that variant's `burstAt` in
 * lib/pet-fight/powerups.ts. Sound generation gives no control over when the
 * payoff lands — every one of the five came back with its peak somewhere
 * different — so it is never assumed.
 *
 * Re-measure after regenerating a clip:
 *   ffmpeg -v info -i public/pets/battle/<id>.mp3 -af  *     "astats=metadata=1:reset=1, *      ametadata=print:key=lavfi.astats.Overall.RMS_level" -f null -
 * then take the loudest ~0.4s window at or after 1.2s, so the clip's opening
 * transient is not mistaken for its payoff.
 */

// Bump when a clip is regenerated so browsers drop the cached copy.
export const PET_BATTLE_VERSION = "8";

export function battleSoundSrc(id: BattleSound): string {
  return `/pets/battle/${id}.mp3?v=${PET_BATTLE_VERSION}`;
}

export function pickKoFinale(): KoFinale {
  return KO_FINALES[Math.floor(Math.random() * KO_FINALES.length)]!;
}
