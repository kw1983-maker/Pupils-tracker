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
  "announce",
  "charge",
  "hit",
  "critical",
  "block",
  "victory",
] as const;

export type BattleSound = (typeof BATTLE_SOUNDS)[number];

// Bump when a clip is regenerated so browsers drop the cached copy.
export const PET_BATTLE_VERSION = "1";

export function battleSoundSrc(id: BattleSound): string {
  return `/pets/battle/${id}.mp3?v=${PET_BATTLE_VERSION}`;
}
