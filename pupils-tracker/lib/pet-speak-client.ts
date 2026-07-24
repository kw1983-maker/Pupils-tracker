// Play pre-generated pet voice clips from public/pets/voice/<species>/.
// Keeps natural pitch (no playbackRate chipmunk) so species voices stay distinct.

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
  } catch {
    /* ignore */
  }
}

/** Play a pre-saved pet line. No-ops when SFX are muted. */
export function speakPetLine(line: PetVoiceLine): void {
  if (isSfxMuted()) return;
  stopPetSpeak();

  const token = playToken;
  const audio = new Audio(line.src);
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
