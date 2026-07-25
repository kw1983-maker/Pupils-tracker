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
  return ctx;
}

/** Resume if needed, then run `fn` with a fresh currentTime. Fixes the common
 *  "first click is silent" race where notes were scheduled while suspended. */
async function withAudio(
  fn: (audio: AudioContext, t: number) => void
): Promise<void> {
  const audio = ensureAudio();
  if (!audio) return;
  try {
    if (audio.state === "suspended") await audio.resume();
  } catch {
    return;
  }
  fn(audio, audio.currentTime);
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
  const attack = Math.min(0.02, dur * 0.2);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + attack);
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
  void withAudio((audio, t) => {
    const notes =
      kind === "fanfare"
        ? [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
        : [660, 880, 1320];
    const step = kind === "fanfare" ? 0.09 : 0.1;
    notes.forEach((f, i) => tone(audio, f, t + i * step, 0.28, 0.3));
  });
}

// Discouraging "oh no" for behaviour-mark deductions: a single recorded clip
// served from public/sounds/. The source file is quiet (loudest 300ms ≈ -24
// dBFS), so it plays through a GainNode that lifts it to ~-16 dBFS without
// clipping (peak ≈ 0.57). The boost (>1) is why we route through Web Audio
// rather than HTMLAudio.volume. No-ops when muted or outside the browser.
const OH_NO_SRC = "/sounds/oh-no-1.mp3";
const OH_NO_GAIN = 2.4;
let ohNoEl: HTMLAudioElement | null = null;

function ensureOhNo(audio: AudioContext): HTMLAudioElement {
  if (ohNoEl) return ohNoEl;
  const el = new Audio(OH_NO_SRC);
  const node = audio.createGain();
  node.gain.value = OH_NO_GAIN;
  audio.createMediaElementSource(el).connect(node).connect(audio.destination);
  ohNoEl = el;
  return ohNoEl;
}

export function playWomp(): void {
  if (isSfxMuted()) return;
  void withAudio((audio) => {
    const el = ensureOhNo(audio);
    el.currentTime = 0;
    void el.play().catch(() => {});
  });
}

// Short applause clip for badge awards (and other "big" fanfares).
const APPLAUSE_SRC = "/sounds/applause.wav";
let applauseEl: HTMLAudioElement | null = null;

export function playApplause(): void {
  if (isSfxMuted()) return;
  if (typeof window === "undefined") return;
  // Unlock Web Audio on the same gesture so later synthesised sounds work.
  void withAudio(() => {});
  if (!applauseEl) {
    applauseEl = new Audio(APPLAUSE_SRC);
    applauseEl.volume = 0.7;
  }
  applauseEl.currentTime = 0;
  void applauseEl.play().catch(() => {});
}

// Pets tab care reactions — synthesised blips (no assets). Louder than a
// whisper so they're audible on classroom Chromebooks. Respects shared mute.
export function playPetCare(
  kind:
    | "pat"
    | "cheer"
    | "peek"
    | "feed"
    | "roar"
    | "sleep"
    | "wake"
    | "dance"
    | "tickle"
    | "dizzy"
): void {
  if (isSfxMuted()) return;
  void withAudio((audio, t) => {
    if (kind === "pat") {
      // Warm soft "boop".
      tone(audio, 392, t, 0.22, 0.38);
      tone(audio, 523.25, t + 0.08, 0.28, 0.32);
      return;
    }

    if (kind === "cheer") {
      // Bright sparkle arpeggio.
      [784, 988, 1175, 1568].forEach((f, i) =>
        tone(audio, f, t + i * 0.06, 0.2, 0.34, "triangle")
      );
      return;
    }

    if (kind === "feed") {
      // Soft "nom nom" chomps — low thuds then a happy lift.
      tone(audio, 220, t, 0.1, 0.36, "square");
      tone(audio, 196, t + 0.11, 0.1, 0.34, "square");
      tone(audio, 247, t + 0.22, 0.1, 0.32, "square");
      tone(audio, 392, t + 0.36, 0.2, 0.28, "triangle");
      return;
    }

    // Peek — quick upward "pop" then a tiny echo.
    tone(audio, 520, t, 0.1, 0.32, "triangle");
    tone(audio, 880, t + 0.06, 0.14, 0.28);
    tone(audio, 660, t + 0.18, 0.12, 0.18);
  });
}

/** Call from a click handler so later setTimeout beats can play Web Audio. */
export function unlockSfx(): void {
  const audio = ensureAudio();
  if (!audio) return;
  void audio.resume().catch(() => {});
}

function scheduleAnnounce(audio: AudioContext, t: number) {
  tone(audio, 523.25, t, 0.22, 0.42, "triangle");
  tone(audio, 659.25, t + 0.12, 0.26, 0.38, "triangle");
  tone(audio, 783.99, t + 0.26, 0.22, 0.32, "sine");
}

function scheduleHit(audio: AudioContext, t: number) {
  tone(audio, 110, t, 0.14, 0.55, "square");
  tone(audio, 90, t + 0.06, 0.16, 0.45, "square");
  tone(audio, 880, t + 0.1, 0.14, 0.32, "triangle");
  tone(audio, 1320, t + 0.18, 0.16, 0.26, "sine");
}

function scheduleDraw(audio: AudioContext, t: number) {
  tone(audio, 440, t, 0.16, 0.36, "triangle");
  tone(audio, 440, t + 0.18, 0.18, 0.3, "triangle");
}

function scheduleTackle(audio: AudioContext, t: number) {
  tone(audio, 180, t, 0.12, 0.52, "square");
  tone(audio, 140, t + 0.08, 0.16, 0.45, "square");
  tone(audio, 320, t + 0.18, 0.14, 0.32, "triangle");
}

function schedulePower(audio: AudioContext, t: number, powerId: string) {
  switch (powerId) {
    case "sparkle":
      [988, 1175, 1568, 1976].forEach((f, i) =>
        tone(audio, f, t + i * 0.05, 0.18, 0.38, "triangle")
      );
      break;
    case "bubble":
      [392, 330, 440, 523].forEach((f, i) =>
        tone(audio, f, t + i * 0.07, 0.14, 0.34, "sine")
      );
      break;
    case "fire":
      tone(audio, 120, t, 0.24, 0.5, "square");
      tone(audio, 90, t + 0.08, 0.3, 0.45, "square");
      tone(audio, 220, t + 0.18, 0.18, 0.35, "triangle");
      break;
    case "frost":
      [880, 990, 1320, 1760].forEach((f, i) =>
        tone(audio, f, t + i * 0.04, 0.22, 0.36, "sine")
      );
      break;
    case "lightning":
      tone(audio, 1600, t, 0.07, 0.45, "square");
      tone(audio, 400, t + 0.05, 0.09, 0.5, "square");
      tone(audio, 2000, t + 0.1, 0.1, 0.4, "triangle");
      break;
    case "whirlwind":
      tone(audio, 200, t, 0.35, 0.4, "triangle");
      tone(audio, 280, t + 0.1, 0.3, 0.36, "triangle");
      tone(audio, 160, t + 0.2, 0.28, 0.32, "sine");
      break;
    case "rainbow":
      [523, 659, 784, 988, 1175].forEach((f, i) =>
        tone(audio, f, t + i * 0.06, 0.24, 0.34, "triangle")
      );
      break;
    case "flight":
      tone(audio, 300, t, 0.16, 0.4, "triangle");
      tone(audio, 450, t + 0.1, 0.22, 0.36, "triangle");
      tone(audio, 700, t + 0.22, 0.28, 0.32, "sine");
      break;
    default:
      scheduleTackle(audio, t);
  }
}

export type PkAudioCue =
  | { atMs: number; kind: "announce" | "hit" | "draw" | "tackle" }
  | { atMs: number; kind: "power"; powerId: string };

/**
 * Schedule the whole duel soundtrack up-front from a user click.
 * Timers that call play*() later are unreliable on classroom Chromebooks;
 * AudioContext scheduling from the gesture is not.
 */
export function schedulePkDuelAudio(cues: PkAudioCue[]): void {
  // Fighting should be heard — turn sound back on if a prior mute was left on.
  if (isSfxMuted()) setSfxMuted(false);

  const audio = ensureAudio();
  if (!audio) return;

  const run = () => {
    const t0 = audio.currentTime + 0.03;
    for (const cue of cues) {
      const t = t0 + cue.atMs / 1000;
      if (cue.kind === "announce") scheduleAnnounce(audio, t);
      else if (cue.kind === "hit") scheduleHit(audio, t);
      else if (cue.kind === "draw") scheduleDraw(audio, t);
      else if (cue.kind === "tackle") scheduleTackle(audio, t);
      else if (cue.kind === "power") schedulePower(audio, t, cue.powerId);
    }
  };

  if (audio.state === "suspended") {
    void audio.resume().then(run).catch(() => {});
  } else {
    run();
  }
}

/** Pet PK duel beats — Web Audio only (prefer schedulePkDuelAudio for fights). */
export function playPkSfx(kind: "announce" | "tackle" | "hit" | "draw"): void {
  if (isSfxMuted()) return;
  void withAudio((audio, t) => {
    if (kind === "announce") scheduleAnnounce(audio, t);
    else if (kind === "tackle") scheduleTackle(audio, t);
    else if (kind === "draw") scheduleDraw(audio, t);
    else scheduleHit(audio, t);
  });
}

/**
 * Distinct synth sting per superpower id. Prefer schedulePkDuelAudio in PK.
 */
export function playPkPowerSfx(powerId: string | null | undefined): void {
  if (isSfxMuted()) return;
  if (!powerId) {
    playPkSfx("tackle");
    return;
  }
  void withAudio((audio, t) => schedulePower(audio, t, powerId));
}
