/**
 * The life bars over the fight cinematic.
 *
 * Kept out of the player component so it can be tested: getting this wrong is
 * not a cosmetic slip, it tells the class the wrong pet is being hurt.
 */

import { PK_ROUNDS } from "@/lib/pet-pk";
import { BEAT } from "./storyboard";
import type { FightWinner } from "./poses";

export type FightHud = {
  leftName: string;
  rightName: string;
  /** Round winners in order — "a" is the left pet, "b" the right. */
  roundWinners: Array<"a" | "b" | "draw">;
  maxHp?: number;
  /** Overall duel winner — loser's bar empties at the K.O. beat. */
  duelWinner?: FightWinner;
  /**
   * Pips each side had already lost before this clip started.
   *
   * The round-by-round modes play one round per clip, so `roundWinners` holds
   * just that round and the bars have to open where the previous round left
   * them — otherwise every round starts from full and the score resets in front
   * of the class. Watch mode plays the whole duel in one pass and leaves this
   * undefined.
   */
  priorLosses?: { a: number; b: number };
  /**
   * Land this clip's losses at this clock second instead of on DAMAGE_BEATS.
   *
   * The super scene runs from the power-up onward, long past the 4.5 / 8.85
   * attack beats — so without this the pip came off the instant the clip opened,
   * before the pet had even transformed, and the finisher landed on a bar that
   * had already dropped.
   */
  damageAt?: number;
  /**
   * HP this clip's round takes off each side, for the interactive modes.
   *
   * Watch mode counts pips — one per round lost, out of PK_ROUNDS — because its
   * cinematic is cut to exactly three rounds. The interactive modes run a real
   * 0–100 bar where a punch is worth 10, a power 20 and a super 60, so the bar
   * has to drain by an AMOUNT rather than by a notch. Set it together with
   * maxHp: MAX_HP and priorLosses counted in the same units.
   */
  roundDamage?: { a: number; b: number };
};

/**
 * The beats where a pet is visibly hit, in time order, with the side taking the
 * blow. The choreography's direction is fixed and does not follow the round
 * data: the left pet's projectile always lands at 4.5, the right pet's at 8.85,
 * and the five-hit combo always ends on a left hit at 14.3.
 */
export const DAMAGE_BEATS: Array<{ hits: "a" | "b"; t: number }> = [
  { hits: "b", t: 4.5 },
  { hits: "a", t: 8.85 },
  { hits: "b", t: 14.3 },
];

export function isDuelLoser(hud: FightHud, side: "a" | "b"): boolean {
  if (!hud.duelWinner || hud.duelWinner === "draw") return false;
  return hud.duelWinner === (side === "a" ? "right" : "left");
}

/**
 * When each side's pips come off.
 *
 * Rounds used to be revealed in order — round 1 at 4.5, round 2 at 8.85 — but
 * because the animation ignores the round data, round 1 going to the right-hand
 * pet drained the LEFT bar at 4.5: the exact moment the left pet's own attack
 * connected, so a pet appeared to hurt itself by firing. Losses are now dealt
 * onto beats that show that pet being hit, and anything that will not fit falls
 * to the finisher and the K.O., which both land on the duel loser.
 *
 * Only the multiset of round winners matters for the totals, so reordering the
 * reveals cannot change who the bars say won.
 */
export function damageTimes(hud: FightHud, side: "a" | "b"): number[] {
  const other = side === "a" ? "b" : "a";
  let owed = hud.roundWinners.filter((w) => w === other).length;
  if (hud.damageAt !== undefined) {
    return Array.from({ length: owed }, () => hud.damageAt!);
  }
  const times: number[] = [];
  for (const beat of DAMAGE_BEATS) {
    if (owed <= 0) break;
    if (beat.hits !== side) continue;
    times.push(beat.t);
    owed -= 1;
  }
  if (owed > 0 && isDuelLoser(hud, side)) {
    for (const t of [BEAT.impact, BEAT.ko]) {
      if (owed <= 0) break;
      times.push(t);
      owed -= 1;
    }
  }
  return times;
}

/** Pips remaining for one side at clock T. */
export function livesAt(T: number, side: "a" | "b", hud: FightHud): number {
  const max = hud.maxHp ?? PK_ROUNDS;
  // At K.O. the loser is out — the bar must read empty even if the beats above
  // did not account for every round they dropped.
  if (T >= BEAT.ko && isDuelLoser(hud, side)) return 0;
  const before = hud.priorLosses?.[side] ?? 0;
  const landed = damageTimes(hud, side).filter((t) => T >= t).length;
  // An amount per blow where the modes track real HP, one notch where they
  // count rounds.
  const lost = before + (hud.roundDamage ? (landed > 0 ? hud.roundDamage[side] : 0) : landed);
  return Math.max(0, max - lost);
}
