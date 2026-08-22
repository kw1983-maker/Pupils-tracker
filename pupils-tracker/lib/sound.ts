import { BATTLE_SOUNDS, battleSoundSrc } from "./pet-battle-sfx";
import { PET_POWERS, powerSoundSrc } from "./pet-powers";
import { PET_SPECIES } from "./pets";
import { voiceSrc } from "./pet-voice";
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
  | {
      atMs: number;
      kind:
        | "announce"
        | "sudden"
        | "hit"
        | "hit2"
        | "draw"
        | "tackle"
        | "fight"
        | "charge"
        | "critical"
        | "gasp"
        | "crowd"
        | "victory";
    }
  // Finale slam when the loser falls. `koId` picks among ko / ko2 / ko3.
  | { atMs: number; kind: "ko"; koId?: "ko" | "ko2" | "ko3" }
  // Rising pitch across 3 · 2 · 1 via `rate` (playbackRate). Same clip three
  // times at 1.0 feels flat; each tick a step higher builds into FIGHT!.
  | { atMs: number; kind: "countdown"; rate?: number }
  // `pan` places the clip in the corner the pet throwing it stands in: -1 hard
  // left, +1 hard right. Both fighters fire in the same beat, so without it the
  // two powers pile up in the middle and read as one muddled noise.
  | { atMs: number; kind: "power"; powerId: string; pan?: number }
  // The winning pet's own voice over the victory banner.
  | { atMs: number; kind: "cheer"; species: string }
  // The attacking pet naming its move before it throws it, in its own voice.
  // `shoutId` is a clip id from lib/pet-battle-lines.ts.
  | { atMs: number; kind: "shout"; species: string; shoutId: string };

// ---- recorded battle audio --------------------------------------------------
// Decoded once and reused. Everything below falls back to the synth stings if a
// clip is missing or the browser refuses to decode it, so a duel is never silent.
const pkBuffers = new Map<string, AudioBuffer>();
let pkPreloaded = false;
/** Keys already fetched, hit or miss — a 404 must not be retried on every render. */
const pkAttempted = new Set<string>();

/** Decode a batch of clips into the shared buffer map, skipping known keys. */
async function decodeIntoPkBuffers(sources: [string, string][]): Promise<void> {
  if (typeof window === "undefined") return;
  const pending = sources.filter(([key]) => !pkAttempted.has(key));
  if (!pending.length) return;

  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return;
  const decoder = new Ctx();

  await Promise.all(
    pending.map(async ([key, url]) => {
      pkAttempted.add(key);
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        pkBuffers.set(key, await decoder.decodeAudioData(await res.arrayBuffer()));
      } catch {
        /* fall back to the synth sting for this cue */
      }
    })
  );
  void decoder.close().catch(() => {});
}

/** Fetch + decode every duel clip. Safe to call repeatedly. */
export async function preloadPkAudio(): Promise<void> {
  if (pkPreloaded || typeof window === "undefined") return;
  pkPreloaded = true;

  await decodeIntoPkBuffers([
    ...BATTLE_SOUNDS.map((id) => [`battle:${id}`, battleSoundSrc(id)] as [string, string]),
    ...PET_POWERS.map((p) => [`power:${p.id}`, powerSoundSrc(p.id)] as [string, string]),
    // Each species' cheer, so the winner celebrates in its own voice.
    ...PET_SPECIES.map(
      (sp) => [`voice:${sp.id}`, voiceSrc(sp.id, "cheer-0")] as [string, string]
    ),
  ]);
}

/**
 * How long a decoded shout runs, in ms — 0 when it isn't loaded. The duel sizes
 * the beat it plays in from this, so a pet always finishes its line before it
 * charges rather than being cut off by a fixed beat.
 */
export function pkShoutDurationMs(species: string, shoutId: string): number {
  return (pkBuffers.get(`shout:${species}:${shoutId}`)?.duration ?? 0) * 1000;
}

/**
 * Decode the move shouts two chosen fighters might use. Deliberately narrow:
 * there is one clip per species per power, so preloading the whole set would
 * pull well over a hundred MP3s for a duel that uses at most six of them.
 */
export async function preloadPkShouts(
  entries: { species: string; shoutId: string }[]
): Promise<void> {
  await decodeIntoPkBuffers(
    entries.map(
      ({ species, shoutId }) =>
        [`shout:${species}:${shoutId}`, voiceSrc(species, shoutId)] as [string, string]
    )
  );
}

/** Play a decoded clip at an absolute time on the duel's clock. */
function scheduleBuffer(
  audio: AudioContext,
  key: string,
  at: number,
  volume = 1,
  /** -1 hard left … +1 hard right. Omit to leave the clip centred. */
  pan?: number,
  /** Playback rate — used to pitch the countdown ticks up. */
  rate = 1
): boolean {
  const buffer = pkBuffers.get(key);
  if (!buffer) return false;
  try {
    const src = audio.createBufferSource();
    const gain = audio.createGain();
    gain.gain.value = volume;
    src.buffer = buffer;
    if (rate !== 1) src.playbackRate.value = rate;
    src.connect(gain);
    // createStereoPanner is missing on a few older school-device browsers —
    // fall through to a centred clip rather than dropping the sound.
    if (pan != null && typeof audio.createStereoPanner === "function") {
      const panner = audio.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      gain.connect(panner);
      panner.connect(audio.destination);
    } else {
      gain.connect(audio.destination);
    }
    src.start(at);
    return true;
  } catch {
    return false;
  }
}

/**
 * Schedule the whole duel soundtrack up-front from a user click.
 * Creates a fresh AudioContext inside the gesture (required on many school
 * Chromebooks) and schedules every cue on that clock — no setTimeout audio.
 */
export function schedulePkDuelAudio(cues: PkAudioCue[]): void {
  if (typeof window === "undefined") return;
  setSfxMuted(false);

  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return;

  // Fresh context created during the click — do not reuse a long-suspended one.
  const audio = new Ctx();
  ctx = audio;

  // Immediate gesture-bound confirmation so the click itself always makes a sound.
  try {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.value = 880;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(audio.destination);
    const now = audio.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.4, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.14);
  } catch {
    /* ignore */
  }

  const arm = () => {
    const t0 = Math.max(audio.currentTime, 0) + 0.05;
    for (const cue of cues) {
      const t = t0 + cue.atMs / 1000;
      switch (cue.kind) {
        case "announce":
          if (!scheduleBuffer(audio, "battle:announce", t)) scheduleAnnounce(audio, t);
          break;
        case "sudden":
          // Past the scheduled rounds — tenser than the ordinary bell.
          if (!scheduleBuffer(audio, "battle:sudden", t)) scheduleAnnounce(audio, t);
          break;
        case "countdown":
          scheduleBuffer(audio, "battle:countdown", t, 0.75, undefined, cue.rate ?? 1);
          break;
        case "fight":
          // The go signal on "FIGHT!" — brighter than a countdown tick.
          if (!scheduleBuffer(audio, "battle:fight", t, 0.9)) scheduleAnnounce(audio, t);
          break;
        case "charge":
          // Well under the powers that follow it. At full weight this one
          // generic whoosh masked them and every round sounded identical.
          scheduleBuffer(audio, "battle:charge", t, 0.28);
          break;
        case "hit":
          if (!scheduleBuffer(audio, "battle:hit", t, 0.95)) scheduleHit(audio, t);
          break;
        case "hit2":
          // Alternated with hit so three rounds don't share one identical thud.
          if (!scheduleBuffer(audio, "battle:hit2", t, 0.95)) scheduleHit(audio, t);
          break;
        case "critical":
          // The moment worth shouting about — let it ring out over the rest.
          if (!scheduleBuffer(audio, "battle:critical", t, 1)) scheduleHit(audio, t);
          break;
        case "gasp":
          // Soft under the critical boom — the class reacting, not replacing it.
          scheduleBuffer(audio, "battle:gasp", t, 0.4);
          break;
        case "crowd":
          // Under the fanfare and winner cheer so the room fills without
          // drowning the pet's own voice.
          scheduleBuffer(audio, "battle:crowd", t, 0.45);
          break;
        case "draw":
          if (!scheduleBuffer(audio, "battle:block", t)) scheduleDraw(audio, t);
          break;
        case "cheer":
          scheduleBuffer(audio, `voice:${cue.species}`, t, 1);
          break;
        case "shout":
          // No synth fallback: a missing clip leaves the pet's speech bubble
          // to carry the line, which beats a bleep standing in for a voice.
          scheduleBuffer(audio, `shout:${cue.species}:${cue.shoutId}`, t, 1);
          break;
        case "victory":
          if (!scheduleBuffer(audio, "battle:victory", t)) scheduleAnnounce(audio, t);
          break;
        case "ko": {
          // Finale slam — louder than a normal hit so the K.O. reads from the back.
          // Falls through ko → ko2 → ko3 → critical → synth if a clip is missing.
          const order = [cue.koId ?? "ko", "ko", "ko2", "ko3"] as const;
          const tried = new Set<string>();
          let played = false;
          for (const id of order) {
            if (tried.has(id)) continue;
            tried.add(id);
            if (scheduleBuffer(audio, `battle:${id}`, t, 1.15)) {
              played = true;
              break;
            }
          }
          if (!played) {
            if (!scheduleBuffer(audio, "battle:critical", t, 1.1)) scheduleHit(audio, t);
          }
          break;
        }
        case "tackle":
          scheduleTackle(audio, t);
          break;
        case "power":
          // Full weight — under-gaining made fire/frost sound like a soft whoosh
          // under the old bed track.
          if (!scheduleBuffer(audio, `power:${cue.powerId}`, t, 1, cue.pan)) {
            schedulePower(audio, t, cue.powerId);
          }
          break;
      }
    }
  };

  if (audio.state === "suspended") {
    void audio.resume().then(arm).catch(() => {});
  } else {
    arm();
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
