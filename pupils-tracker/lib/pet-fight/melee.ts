/**
 * The close-quarters exchange — the three seconds the two pets spend inside each
 * other's reach, from the closing dash to the last combo hit.
 *
 * CAT_KF/DRA_KF drive both pets to dx ±250 at 11.3 and then HOLD them there
 * until 14.4, so for over three seconds the fastest part of the fight was two
 * pets standing still next to each other, twitching only when a punch landed.
 * This adds the movement: a rapid in/out shuffle plus a lunge on every hit,
 * which PetFightStage turns into afterimages and motion blur.
 *
 * It rides ON TOP of the authored tracks rather than in them, exactly as the
 * flinch does: poseFor() is what the camera framing, the impact reactions and
 * the K.O. tests are all tuned against, so it must keep returning its authored
 * numbers. Everything here is zero outside MELEE.
 *
 * World space, so it depends on `side` and not on who wins: the combo is
 * side-based choreography, and poseFor() already mirrors the tracks so the left
 * pet closes rightward whichever pet is the hero.
 */

import { IMPACTS } from "./storyboard";
import { clamp, pulse } from "./timing";
import type { PkAudioCue } from "@/lib/sound";

/**
 * The window the pose tracks hold the pets together for.
 *
 * `from` is CAT_KF/DRA_KF's dx ±250 keyframe; `to` clears the last combo hit
 * (14.3) and its recoil, and stays well short of XFORM_IN — the power-up owns
 * everything from 15.1 on and must not have a shuffle running under it.
 */
export const MELEE = { from: 11.3, to: 14.55 } as const;

/** The combo hits thrown inside the exchange — the beats a lunge lands on. */
export const MELEE_HITS = IMPACTS.filter(
  (imp) => imp.t >= MELEE.from && imp.t <= MELEE.to
);

/** How far a lunge carries the attacker in, at power 1. */
const LUNGE = 58;
/** Half-width of the in/out shuffle, and its speed in radians per second. */
const SHUFFLE = 32;
const SHUFFLE_W = 60;

/**
 * How deep into the close-quarters exchange we are, 0 outside it.
 *
 * Fades in and out so neither edge of the window snaps. Exported because the
 * afterimage fan in PetFightStage is gated on the same signal the shuffle is:
 * the extra ghosts belong to this exchange and to nothing else in the fight.
 */
export function meleeIntensity(T: number): number {
  if (T <= MELEE.from || T >= MELEE.to) return 0;
  return clamp(
    Math.min((T - MELEE.from) / 0.25, (MELEE.to - T) / 0.25),
    0,
    1
  );
}

/** +1 when this pet faces right (the left slot), -1 for the right slot. */
function facing(side: "left" | "right"): number {
  return side === "left" ? 1 : -1;
}

export type MeleeOffset = { dx: number; dy: number; rot: number };

/**
 * Extra motion for one pet during the exchange. All zero outside MELEE.
 *
 * Two layers:
 *  - a shuffle at ~9.5Hz, phase-flipped between the sides so one pet is driving
 *    in while the other gives ground — trading, not jittering in unison;
 *  - a lunge on every entry of IMPACTS inside the window, peaking exactly on the
 *    hit. The beats are read out of that table rather than retyped, so a retime
 *    of the combo carries the movement with it. Whoever is being hit already
 *    rocks backwards (the flinch in renderPoseFor), so only the attacker moves
 *    here.
 */
export function meleeFlurry(T: number, side: "left" | "right"): MeleeOffset {
  const env = meleeIntensity(T);
  if (env <= 0) return { dx: 0, dy: 0, rot: 0 };

  const dir = facing(side);
  const phase = side === "left" ? 0 : Math.PI;

  // How hard this pet is committed to a strike right now. pulse() peaks at the
  // midpoint of its window, so starting it half a lunge early lands the peak on
  // the hit itself. The beats come out of IMPACTS rather than being retyped, so
  // a retime of the combo carries the movement with it.
  let drive = 0;
  let power = 0;
  for (const imp of MELEE_HITS) {
    if (imp.by !== side) continue;
    const d = pulse(T, imp.t - 0.16, 0.32);
    if (d <= drive) continue;
    drive = d;
    power = imp.power;
  }

  // The shuffle gives way to the lunge: a pet driving a punch in commits to it
  // rather than vibrating through it.
  const shuffle = env * (1 - drive * 0.85);
  let dx = dir * Math.sin(T * SHUFFLE_W + phase) * SHUFFLE * shuffle;
  let dy = Math.sin(T * 41 + phase) * 7 * shuffle;
  let rot = dir * Math.sin(T * 47 + phase) * 3.2 * shuffle;

  if (drive > 0) {
    dx += dir * drive * LUNGE * power;
    dy -= drive * 14 * power;
    rot += dir * drive * 7 * power;
  }

  return { dx, dy, rot };
}

/**
 * How far back the afterimage trail samples, in seconds.
 *
 * Four rungs inside 0.08s: close enough that the ghosts read as one smear at
 * 60fps, and — the part that matters — shorter than the shuffle's own period
 * (2π/60 ≈ 0.105s). Sample a full period back and the ghost lands where the pet
 * already is, which reads as a double image rather than a trail.
 */
export const GHOST_AGES = [0.02, 0.04, 0.06, 0.078] as const;

/**
 * The extra afterimages thrown only during the close-quarters exchange.
 *
 * These are placed, not sampled. The trail above (GHOST_AGES) asks "where was
 * the pet a few frames ago", and during the exchange the honest answer is
 * "about thirty pixels that way" — the shuffle is only ±32px wide, so those
 * copies land on top of the pet and the whole effect reads as a shaky dark halo
 * instead of a fighter moving too fast to follow.
 *
 * So the position here is authored: `back` throws the copy away from the
 * opponent, `rise` throws it up or down, and both are in units of
 * MELEE_SPREAD_PX / MELEE_RISE_PX. That puts copies out at arm's length all
 * around the pet, which is what the reference actually shows. A couple carry a
 * negative `back` so the crowd wraps in front of the pet too rather than
 * trailing behind it in a neat line.
 *
 * `age` still picks which past pose each copy wears — that is what keeps them
 * from being identical clones, and it still has to sit inside one shuffle
 * period (see GHOST_AGES) or the pose it wears is the pose the pet is already
 * in.
 *
 * Authored numbers rather than per-frame randomness: the pose is a pure
 * function of the clock everywhere else in this fight, and a crowd that
 * reshuffled itself every frame would boil when the player is paused.
 */
export const MELEE_GHOSTS = [
  { age: 0.012, back: 0.3, rise: -0.5, sc: 1.05, rot: -8 },
  { age: 0.022, back: -0.35, rise: -0.95, sc: 0.98, rot: 11 },
  { age: 0.033, back: 0.75, rise: 0.25, sc: 1.02, rot: -6 },
  { age: 0.044, back: 1.15, rise: -1.25, sc: 0.94, rot: 14 },
  { age: 0.055, back: -0.6, rise: 0.15, sc: 0.9, rot: -13 },
  { age: 0.066, back: 1.55, rise: 0.55, sc: 0.88, rot: 9 },
  { age: 0.077, back: 0.95, rise: -1.75, sc: 0.85, rot: -17 },
  { age: 0.088, back: 1.95, rise: -0.7, sc: 0.82, rot: 16 },
  { age: 0.099, back: 2.3, rise: 0.35, sc: 0.78, rot: -11 },
] as const;

/** How far a `back` of 1 throws a copy away from the opponent, in px. */
export const MELEE_SPREAD_PX = 88;

/**
 * How far a `rise` of 1 lifts a copy, in px.
 *
 * Smaller than the horizontal spread, and the table leans negative, because the
 * pets stand on the grass line: a copy pushed down is half-buried in the ground
 * and contributes nothing, while one pushed up reads against the sky.
 */
export const MELEE_RISE_PX = 62;

/**
 * The wind under the exchange: a bed for the whole clash and a whoosh on every
 * lunge.
 *
 * Lives here rather than in the two cue builders (PetBattle's
 * cinematicAudioForDuel and the showcase's demoCues) because both need exactly
 * these beats, and the combo already drifted apart between them once.
 */
export function meleeAudioCues(): PkAudioCue[] {
  const cues: PkAudioCue[] = [
    {
      atMs: MELEE.from * 1000,
      kind: "wind",
      // Well under the hits: this is the room the punches land in, not a beat.
      volume: 0.22,
      // wind.mp3 runs ~8.3s — long enough to still be blowing when the power-up
      // starts its own wind at BEAT.ignite. Cut it at the end of the exchange.
      stopAfterMs: (MELEE.to - MELEE.from) * 1000,
    },
  ];

  // One swipe per lunge, panned to the pet throwing it, plus a swipe on the
  // half-beat between hits so the gaps are not silent while the pets are still
  // trading. Each is pitched a little differently — five plays of one clip at
  // one rate reads as a stuck sound.
  const beats: Array<{ t: number; side: "left" | "right" }> = [];
  for (const imp of MELEE_HITS) {
    beats.push({ t: imp.t - 0.14, side: imp.by });
    beats.push({ t: imp.t + 0.28, side: imp.by === "left" ? "right" : "left" });
  }

  for (const [i, beat] of beats.entries()) {
    if (beat.t < MELEE.from || beat.t > MELEE.to) continue;
    cues.push({
      atMs: beat.t * 1000,
      kind: "whoosh",
      pan: beat.side === "left" ? -0.5 : 0.5,
      rate: 0.92 + (i % 5) * 0.11,
    });
  }

  return cues;
}
