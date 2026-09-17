// The duel soundtrack and speech bubbles, on the cinematic clock.
//
// Lifted out of PetBattle.tsx when the round-by-round modes arrived. Watch mode
// plays the whole 32s piece in one pass; vs PC and 2 Players play one SEGMENT
// per round, so the same beats have to be schedulable against a clip that starts
// partway in.
//
// The two timelines are NOT the same and mixing them up is the bug to watch for:
//   • speech lines are read by PetFightStage against the stage clock T, which
//     runs in ABSOLUTE storyboard seconds even for a segment — so they are never
//     offset;
//   • audio cues are scheduled on a wall clock that starts when the clip starts
//     — so every one is shifted back by the segment's start.

import { battleShout } from "@/lib/pet-battle-lines";
import { pickKoFinale } from "@/lib/pet-battle-sfx";
import type { GuardOutcome, PkFighter, PkRound } from "@/lib/pet-pk";
import type { PkAudioCue } from "@/lib/sound";
import { BEAT } from "./storyboard";
import { meleeAudioCues } from "./melee";
import { powerUpSpec, type PowerUpId } from "./powerups";
import type { FinaleId } from "./finales";
import type { FightSpeechLine } from "./poses";

/** Cinematic clock cues (seconds) — aligned with storyboard attack beats. */
export const LEFT_SHOUT_AT = 2.5;
export const LEFT_POWER_AT = 3.9;
export const LEFT_HIT_AT = 4.5;
export const RIGHT_SHOUT_AT = 6.5;
export const RIGHT_POWER_AT = 7.85;
export const RIGHT_HIT_AT = 8.85;
export const CHEER_AT = BEAT.wins;

/**
 * What the pet that guarded says about how it went.
 *
 * Short enough to read at a glance from the back of a classroom, and only shown
 * when the guard actually changed something — "taken" is a pet standing there,
 * which needs no bubble.
 */
const GUARD_BUBBLE: Record<GuardOutcome, string | null> = {
  taken: null,
  blocked: "🛡️ Blocked!",
  evaded: "💨 Missed me!",
  punished: "💥 Wide open!",
};

export interface DuelAudioOptions {
  /**
   * Play the power-up-and-finisher scene for the side that threw a super,
   * rather than an ordinary exchange. `side` is "draw" when both did.
   */
  superScene?: {
    finale: FinaleId;
    powerUp: PowerUpId;
    side: "a" | "b" | "draw";
    /**
     * This clip carries the knockdown too, because the super finished the other
     * pet — so the slam, the bell and the crowd belong here rather than to a
     * second ending that would fire a second finisher.
     */
    knockout?: boolean;
    winner?: "a" | "b" | "draw";
  };
  /**
   * Clock second the clip starts at (SEGMENT.round.from and friends). Audio cues
   * are shifted back by this; speech lines are not. Cues that fall before the
   * start are dropped rather than fired immediately.
   */
  offset?: number;
  /**
   * Clock second the clip stops at. Cues past it are dropped — the super scene
   * ends before the knockdown, and without this the K.O. slam and the crowd
   * still played over a fight that was carrying on.
   */
  until?: number;
  /** Include the melee, power-up, finisher and K.O. Omit for a plain exchange. */
  finish?: { finale: FinaleId; powerUp: PowerUpId; winner: "a" | "b" | "draw" };
  /** The bell that opens a duel — only wanted on the first clip. */
  announce?: boolean;
}

/**
 * Speech bubbles + SFX for one round's exchange, and optionally the finish.
 *
 * Uses the round's real moves so the power clip matches the projectile on
 * screen. There is no baked mix: the old one hardcoded bubble then fire whatever
 * pets were on stage, and drifted the moment the power-up scene was inserted.
 */
export function duelAudio(
  a: PkFighter,
  b: PkFighter,
  round: PkRound | undefined,
  { offset = 0, until, finish, announce = false, superScene }: DuelAudioOptions = {}
): { lines: FightSpeechLine[]; cues: PkAudioCue[] } {
  const lines: FightSpeechLine[] = [];
  const cues: PkAudioCue[] = [];
  if (!round) return { lines, cues };

  /** Absolute storyboard second -> milliseconds on the clip's own clock. */
  const at = (t: number) => (t - offset) * 1000;
  const endMs = until === undefined ? Infinity : (until - offset) * 1000;
  const push = (cue: PkAudioCue) => {
    if (cue.atMs >= 0 && cue.atMs <= endMs) cues.push(cue);
  };

  // A super plays the power-up scene and the finisher instead of an exchange —
  // there is no shout and no projectile, so none of the attack cues below apply.
  if (superScene) {
    const { finale, powerUp, side } = superScene;
    const pan = side === "a" ? -0.5 : side === "b" ? 0.5 : 0;
    push({ atMs: at(BEAT.quake), kind: "quake" });
    push({ atMs: at(BEAT.ignite), kind: "wind", pan });
    push({
      atMs: at(BEAT.flash - powerUpSpec(powerUp).burstAt),
      kind: "transform",
      power: powerUp,
      pan,
    });
    push({ atMs: at(BEAT.flash), kind: "levelup" });
    push({ atMs: at(BEAT.release - 1.05), kind: "charge" });
    push({ atMs: at(BEAT.release), kind: "finisher", finale, pan });
    const move = side === "a" ? round.a : round.b;
    if (move.power) {
      push({
        atMs: at(BEAT.release + 0.15),
        kind: "power",
        powerId: move.power.id,
        pan: pan * 0.9,
      });
    }
    push({ atMs: at(BEAT.impact), kind: "critical" });

    if (superScene.knockout) {
      const won = superScene.winner ?? side;
      push({ atMs: at(BEAT.ko), kind: "ko", koId: pickKoFinale() });
      push({ atMs: at(BEAT.koText), kind: "victory" });
      push({ atMs: at(BEAT.koText + 0.3), kind: "crowd" });
      const species = won === "a" ? a.species : won === "b" ? b.species : undefined;
      if (species) push({ atMs: at(CHEER_AT), kind: "cheer", species });
    }
    return { lines, cues };
  }

  // Clamped rather than dropped: on a segment starting at 2.4 the bell's 0.7
  // would fall outside the clip, and round one would open in silence.
  if (announce) push({ atMs: Math.max(0, at(0.7)), kind: "announce" });

  /**
   * ── The guard ──────────────────────────────────────────────────────────────
   *
   * In the turn-based modes the pet being hit chose how to take it, and that
   * choice is the loudest thing in the exchange — so it is the guard, not the
   * move, that decides what the impact sounds like. A blow that was slipped must
   * NOT thud: the choreography still fires a projectile at the same beat, and a
   * thud over it tells the class a hit landed while the life bar says nothing
   * came off.
   *
   * Nothing new is loaded for any of this. A block is the existing tackle thump
   * laid under the hit, a clean dodge is the whoosh already used for a lunge,
   * and walking into a punch is a gasp on top of the crack.
   *
   * Watch mode leaves `guard` unset — nobody defends there — so all of this is
   * skipped and the exchange sounds exactly as it always has.
   */
  const guardOn = (side: "a" | "b"): GuardOutcome | null =>
    round.guard !== undefined && round.winner === side
      ? (round.guardOutcome ?? "taken")
      : null;

  if (round.guard !== undefined && round.winner !== "draw") {
    const bubble = GUARD_BUBBLE[round.guardOutcome ?? "taken"];
    if (bubble) {
      // Over the pet that made the choice, at the moment it pays off or does not.
      const beat = round.winner === "a" ? LEFT_HIT_AT : RIGHT_HIT_AT;
      lines.push({
        side: round.winner === "a" ? "right" : "left",
        text: bubble,
        from: beat,
        to: beat + 1.6,
      });
    }
  }


  const leftShout = battleShout(a.species, round.a);
  if (leftShout && a.species) {
    lines.push({
      side: "left",
      text: leftShout.display,
      from: LEFT_SHOUT_AT,
      to: LEFT_POWER_AT,
    });
    push({
      atMs: at(LEFT_SHOUT_AT),
      kind: "shout",
      species: a.species,
      shoutId: leftShout.id,
    });
  }
  push({ atMs: at(LEFT_POWER_AT - 0.55), kind: "charge" });
  if (round.a.power) {
    push({ atMs: at(LEFT_POWER_AT), kind: "power", powerId: round.a.power.id, pan: -0.55 });
  } else {
    push({ atMs: at(LEFT_POWER_AT), kind: "tackle" });
  }
  const guardA = guardOn("a");
  if (guardA === "evaded") {
    push({ atMs: at(LEFT_HIT_AT), kind: "whoosh", pan: 0.55 });
  } else {
    push({ atMs: at(LEFT_HIT_AT), kind: round.a.critical ? "critical" : "hit" });
    if (guardA === "blocked") push({ atMs: at(LEFT_HIT_AT + 0.05), kind: "tackle" });
    if (guardA === "punished") push({ atMs: at(LEFT_HIT_AT + 0.12), kind: "gasp" });
  }

  const rightShout = battleShout(b.species, round.b);
  if (rightShout && b.species) {
    lines.push({
      side: "right",
      text: rightShout.display,
      from: RIGHT_SHOUT_AT,
      to: RIGHT_POWER_AT,
    });
    push({
      atMs: at(RIGHT_SHOUT_AT),
      kind: "shout",
      species: b.species,
      shoutId: rightShout.id,
    });
  }
  push({ atMs: at(RIGHT_POWER_AT - 0.55), kind: "charge" });
  if (round.b.power) {
    push({ atMs: at(RIGHT_POWER_AT), kind: "power", powerId: round.b.power.id, pan: 0.55 });
  } else {
    push({ atMs: at(RIGHT_POWER_AT), kind: "tackle" });
  }
  const guardB = guardOn("b");
  if (guardB === "evaded") {
    push({ atMs: at(RIGHT_HIT_AT), kind: "whoosh", pan: -0.55 });
  } else {
    push({ atMs: at(RIGHT_HIT_AT), kind: round.b.critical ? "critical" : "hit2" });
    if (guardB === "blocked") push({ atMs: at(RIGHT_HIT_AT + 0.05), kind: "tackle" });
    if (guardB === "punished") push({ atMs: at(RIGHT_HIT_AT + 0.12), kind: "gasp" });
  }

  if (!finish) return { lines, cues };
  const { finale, powerUp, winner } = finish;

  // Combo exchange — alternate hits so it isn't one thud repeated, over the wind
  // of the pets trading blows inside each other's reach.
  ([11.6, 12.2, 12.9, 13.6, 14.3] as const).forEach((t, i) => {
    push({ atMs: at(t), kind: i % 2 === 0 ? "hit" : "hit2" });
  });
  for (const cue of meleeAudioCues()) {
    push({ ...cue, atMs: cue.atMs - offset * 1000 });
  }

  // Power-up scene: the winner flares gold and levels up before the finisher.
  // Panned to their corner so the class can hear which side is powering up.
  const winnerPan = winner === "a" ? -0.5 : winner === "b" ? 0.5 : 0;
  // Seven seconds is more than one clip can carry, so the beds run underneath
  // and the sting is placed by its loudest moment rather than by the start of
  // the scene — see PowerUpSpec.burstAt.
  push({ atMs: at(BEAT.quake), kind: "quake" });
  push({ atMs: at(BEAT.ignite), kind: "wind", pan: winnerPan });
  push({
    atMs: at(BEAT.flash - powerUpSpec(powerUp).burstAt),
    kind: "transform",
    power: powerUp,
    pan: winnerPan,
  });
  push({ atMs: at(BEAT.flash), kind: "levelup" });
  push({ atMs: at(BEAT.release - 1.05), kind: "charge" });
  if (winner !== "draw") {
    push({ atMs: at(BEAT.release), kind: "finisher", finale, pan: winnerPan });
    // Layer the winner's own power voice under the finisher if they have one.
    const winMove = winner === "a" ? round.a : round.b;
    if (winMove.power) {
      push({
        atMs: at(BEAT.release + 0.15),
        kind: "power",
        powerId: winMove.power.id,
        pan: winner === "a" ? -0.45 : 0.45,
      });
    }
  }
  push({ atMs: at(BEAT.impact), kind: "critical" });
  if (winner !== "draw") {
    // Drastic K.O. slam as the loser falls — one of five at random. A draw has
    // nobody hitting the ground, so it gets the bell and the crowd only.
    push({ atMs: at(BEAT.ko), kind: "ko", koId: pickKoFinale() });
  }
  push({ atMs: at(BEAT.koText), kind: "victory" });
  if (winner !== "draw") push({ atMs: at(BEAT.koText + 0.3), kind: "crowd" });

  const winnerSpecies = winner === "a" ? a.species : winner === "b" ? b.species : undefined;
  if (winnerSpecies) {
    push({ atMs: at(CHEER_AT), kind: "cheer", species: winnerSpecies });
  }

  return { lines, cues };
}
