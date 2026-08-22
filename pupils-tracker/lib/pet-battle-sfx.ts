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
  // Drastic finale when the loser falls — bigger than critical/hit.
  // Three variants; live PK picks one at random per duel.
  "ko",
  "ko2",
  "ko3",
] as const;

export type BattleSound = (typeof BATTLE_SOUNDS)[number];

/** Finale slam clips — one is chosen per duel so endings don't feel identical. */
export const KO_FINALES = ["ko", "ko2", "ko3"] as const;
export type KoFinale = (typeof KO_FINALES)[number];

// Bump when a clip is regenerated so browsers drop the cached copy.
export const PET_BATTLE_VERSION = "5";

export function battleSoundSrc(id: BattleSound): string {
  return `/pets/battle/${id}.mp3?v=${PET_BATTLE_VERSION}`;
}

export function pickKoFinale(): KoFinale {
  return KO_FINALES[Math.floor(Math.random() * KO_FINALES.length)]!;
}
