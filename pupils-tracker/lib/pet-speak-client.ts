// Play pre-generated pet voice clips from public/pets/voice/. Falls back to
// browser Web Speech if a clip is missing. Respects the shared SFX mute.

import { isSfxMuted } from "@/lib/sound";
import type { PetVoiceLine } from "@/lib/pet-voice";

let currentAudio: HTMLAudioElement | null = null;

function stopBrowserSpeech() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}

function speakBrowser(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.05;
  u.pitch = 1.35;
  const voices = synth.getVoices();
  const en =
    voices.find((v) => /^en[-_]/i.test(v.lang)) ??
    voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
  if (en) u.voice = en;
  synth.speak(u);
}

export function stopPetSpeak(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  stopBrowserSpeech();
}

/** Play a pre-saved pet line. No-ops when SFX are muted. */
export function speakPetLine(line: PetVoiceLine): void {
  if (isSfxMuted()) return;
  stopPetSpeak();

  const audio = new Audio(line.src);
  audio.volume = 0.9;
  currentAudio = audio;

  const fallback = () => {
    if (currentAudio === audio) currentAudio = null;
    speakBrowser(line.display);
  };

  audio.onerror = fallback;
  audio.onended = () => {
    if (currentAudio === audio) currentAudio = null;
  };
  void audio.play().catch(fallback);
}
