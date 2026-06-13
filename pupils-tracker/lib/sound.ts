// Tiny mute-aware Web-Audio helper for short reward chimes. Mirrors the
// synthesised pattern proven in components/pages/SpinningRules.tsx (no audio
// asset to ship). Lazily creates a single shared AudioContext on first use —
// browsers only allow this after a user gesture, which every caller (button
// click / picker spin) satisfies.

const SFX_KEY = "pupil-tracker-sfx-muted";

let ctx: AudioContext | null = null;

function ensureAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  }
  void ctx.resume();
  return ctx;
}

// One enveloped oscillator note (soft attack/decay, no clicks).
function tone(
  audio: AudioContext,
  freq: number,
  start: number,
  dur: number,
  peak = 0.3,
  type: OscillatorType = "sine"
) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

export function isSfxMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SFX_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSfxMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SFX_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

// Play a celebratory chime. "ding" = a quick rising 3-note bell (positive
// behaviour / picker landing); "fanfare" = a fuller ascending arpeggio for the
// bigger moment of awarding a badge. No-ops when muted or audio is unavailable.
export function playChime(kind: "ding" | "fanfare" = "ding"): void {
  if (isSfxMuted()) return;
  const audio = ensureAudio();
  if (!audio) return;
  const t = audio.currentTime;
  const notes =
    kind === "fanfare"
      ? [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
      : [660, 880, 1320];
  const step = kind === "fanfare" ? 0.09 : 0.1;
  notes.forEach((f, i) => tone(audio, f, t + i * step, 0.28, 0.3));
}

// Discouraging "oh no" for behaviour-mark deductions: one of two recorded clips
// picked at random, served from public/sounds/. The source files differ a lot in
// level — clip 2's loudest moment is ~18 dB hotter than clip 1's and peaks near
// full scale — so each plays through a GainNode that levels them to roughly the
// same loudness (measured 300ms peak-RMS ≈ -16 dBFS) without clipping. The boost
// on clip 1 (>1) is why we route through Web Audio rather than HTMLAudio.volume.
// No-ops when muted or outside the browser.
const OH_NO_CLIPS = [
  { src: "/sounds/oh-no-1.mp3", gain: 2.4 },
  { src: "/sounds/oh-no-2.mp3", gain: 0.32 },
];
let ohNoEls: HTMLAudioElement[] | null = null;

function ensureOhNo(audio: AudioContext): HTMLAudioElement[] {
  if (ohNoEls) return ohNoEls;
  ohNoEls = OH_NO_CLIPS.map(({ src, gain }) => {
    const el = new Audio(src);
    const node = audio.createGain();
    node.gain.value = gain;
    audio.createMediaElementSource(el).connect(node).connect(audio.destination);
    return el;
  });
  return ohNoEls;
}

export function playWomp(): void {
  if (isSfxMuted()) return;
  const audio = ensureAudio();
  if (!audio) return;
  const els = ensureOhNo(audio);
  const el = els[Math.floor(Math.random() * els.length)];
  el.currentTime = 0;
  void el.play().catch(() => {});
}
