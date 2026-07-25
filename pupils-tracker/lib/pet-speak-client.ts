// Play pre-generated pet voice clips from public/pets/voice/<species>/.
// Always creates a fresh Audio element so switching pets can't reuse the
// previous species' buffer.

import { isSfxMuted } from "@/lib/sound";
import type { PetVoiceLine } from "@/lib/pet-voice";

let currentAudio: HTMLAudioElement | null = null;
let playToken = 0;

export function stopPetSpeak(): void {
  playToken += 1;
  const audio = currentAudio;
  currentAudio = null;
  if (!audio) return;
  audio.onerror = null;
  audio.onended = null;
  try {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  } catch {
    /* ignore */
  }
}

// Scene ambience gets its own element rather than going through the speech
// player above: it is meant to sit UNDER the pet's voice, so the two must be
// able to overlap instead of one cutting the other off.
let ambientAudio: HTMLAudioElement | null = null;

/** Quiet enough to stay behind a child's voice in a classroom. */
const AMBIENT_VOLUME = 0.32;

export function stopSceneAmbience(): void {
  const audio = ambientAudio;
  ambientAudio = null;
  if (!audio) return;
  audio.onerror = null;
  audio.onended = null;
  try {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  } catch {
    /* ignore */
  }
}

/** Play a scene's background sound once, softly. No-ops when SFX are muted. */
export function playSceneAmbience(src: string): void {
  if (isSfxMuted()) return;
  stopSceneAmbience();

  const audio = new Audio(src);
  audio.volume = AMBIENT_VOLUME;
  audio.preload = "auto";
  ambientAudio = audio;

  const clear = () => {
    if (ambientAudio === audio) ambientAudio = null;
  };
  audio.onended = clear;
  audio.onerror = clear;
  void audio.play().catch(clear);
}

/** Play a pre-saved pet line. No-ops when SFX are muted. */
export function speakPetLine(line: PetVoiceLine): void {
  if (isSfxMuted()) return;
  stopPetSpeak();

  const token = playToken;
  const audio = new Audio();
  // voiceName in the URL makes each species' request unique to the cache.
  audio.src = `${line.src}&voice=${encodeURIComponent(line.voiceName)}`;
  audio.preload = "auto";
  audio.volume = 1;
  currentAudio = audio;

  audio.onended = () => {
    if (playToken === token && currentAudio === audio) currentAudio = null;
  };
  audio.onerror = () => {
    if (playToken === token && currentAudio === audio) currentAudio = null;
  };
  void audio.play().catch(() => {
    if (playToken === token && currentAudio === audio) currentAudio = null;
  });
}
