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
/**
 * Ambience is loud enough at first to tell you where the pet is, then eases
 * back so it doesn't wear thin while a modal stays open — the place registers,
 * then gets out of the way.
 */
const AMBIENT_SUSTAIN_VOLUME = 0.11;
const AMBIENT_LOOPS_BEFORE_SOFTENING = 2;
const AMBIENT_SOFTEN_MS = 3000;

let softenTimer: number | null = null;
let softenRamp: number | null = null;

function clearSoftening(): void {
  if (softenTimer !== null) window.clearTimeout(softenTimer);
  if (softenRamp !== null) window.clearInterval(softenRamp);
  softenTimer = null;
  softenRamp = null;
}

/** Ease an element's volume down to `target` over `ms`, in small steps. */
function rampVolume(audio: HTMLAudioElement, target: number, ms: number): void {
  const steps = 30;
  const from = audio.volume;
  let i = 0;
  softenRamp = window.setInterval(() => {
    i += 1;
    if (ambientAudio !== audio) {
      clearSoftening();
      return;
    }
    audio.volume = Math.max(target, from + ((target - from) * i) / steps);
    if (i >= steps) clearSoftening();
  }, ms / steps);
}

export function stopSceneAmbience(): void {
  clearSoftening();
  const audio = ambientAudio;
  ambientAudio = null;
  if (!audio) return;
  audio.onerror = null;
  audio.onended = null;
  audio.onloadedmetadata = null;
  try {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  } catch {
    /* ignore */
  }
}

/**
 * Play a scene's background sound softly, looping until stopped. The clips are
 * faded in and out at both ends (see scripts/generate-scene-ambience.mjs) so the
 * loop point passes through a quiet dip rather than clicking.
 *
 * No-ops when SFX are muted. Calling it again swaps scenes cleanly.
 */
export function playSceneAmbience(src: string): void {
  if (isSfxMuted()) return;
  // Already playing this exact scene — let it keep running rather than
  // restarting the loop from the top.
  if (ambientAudio && ambientAudio.src.endsWith(src)) return;
  stopSceneAmbience();

  const audio = new Audio(src);
  audio.volume = AMBIENT_VOLUME;
  audio.loop = true;
  audio.preload = "auto";
  ambientAudio = audio;

  const clear = () => {
    if (ambientAudio === audio) {
      clearSoftening();
      ambientAudio = null;
    }
  };
  audio.onerror = clear;

  // Once we know the clip length, schedule the drop for after two full loops.
  const scheduleSoftening = () => {
    if (ambientAudio !== audio || softenTimer !== null) return;
    const loopMs = (audio.duration || 6) * 1000;
    softenTimer = window.setTimeout(() => {
      if (ambientAudio === audio) {
        rampVolume(audio, AMBIENT_SUSTAIN_VOLUME, AMBIENT_SOFTEN_MS);
      }
    }, loopMs * AMBIENT_LOOPS_BEFORE_SOFTENING);
  };
  audio.onloadedmetadata = scheduleSoftening;
  // A cached clip can already have its metadata, in which case the event above
  // has nothing left to fire.
  if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) scheduleSoftening();

  // Autoplay is only permitted off the back of a user gesture; opening a pet or
  // tapping a scene is one, but bail quietly if the browser refuses.
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
