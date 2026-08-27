"use client";

/**
 * The air around the close-quarters exchange.
 *
 * The pets trade blows for three seconds inside each other's reach
 * (lib/pet-fight/melee.ts); this is what that does to the arena — speed lines
 * tearing through the gap between them and dirt kicked off the floor by the
 * shuffle. The afterimages are on the sprites themselves, in PetFightStage.
 *
 * Held deliberately light. A combo hit already has its own reaction and the
 * power-up has to stay the biggest thing in the fight, so nothing here is as
 * bright or as large as either.
 */

import { CAT, DRA } from "@/lib/pet-fight/storyboard";
import { MELEE } from "@/lib/pet-fight/melee";
import { clamp } from "@/lib/pet-fight/timing";
import { FX_ART_READY } from "@/lib/pet-fight/fx-assets";
import { FxTint } from "@/components/ui/pet-fight/TransformFx";
import { poseFor, type FightWinner } from "@/lib/pet-fight/poses";

/** Lit by the arena, not by either pet — moving air has no team colour. */
const AIR =
  "linear-gradient(180deg,rgba(255,255,255,0.95),rgba(226,238,255,0.7) 45%,rgba(196,214,240,0.35))";
const EARTH =
  "linear-gradient(180deg,rgba(146,126,104,0.9),rgba(96,82,68,0.8) 50%,rgba(58,48,40,0.4))";

/** Fades the whole layer in and out with the exchange. */
function clashAmount(T: number): number {
  if (T <= MELEE.from || T >= MELEE.to) return 0;
  return clamp(Math.min((T - MELEE.from) / 0.3, (MELEE.to - T) / 0.3), 0, 1);
}

/** Where the two pets are actually meeting, so the wind runs through the gap. */
function clashCentre(T: number, winner: FightWinner): number {
  const l = CAT.x + poseFor(T, "left", winner).dx;
  const r = DRA.x + poseFor(T, "right", winner).dx;
  return (l + r) / 2;
}

const STREAKS = 7;

export function ClashWind({ T, winner }: { T: number; winner: FightWinner }) {
  const amount = clashAmount(T);
  if (amount <= 0) return null;
  const cx = clashCentre(T, winner);

  return (
    <>
      {Array.from({ length: STREAKS }, (_, i) => {
        // Each streak runs its own 0.34s sweep, staggered so at any frame three
        // or four are somewhere across the gap and the rest are between passes.
        const p = ((T * 2.9 + i * 0.37) % 1);
        const dir = i % 2 ? 1 : -1;
        const len = 260 + (i % 3) * 150;
        const x = cx + dir * (-1 + p * 2) * 420;
        const y = CAT.y - 300 + ((i * 71) % 250);
        const fade = Math.sin(p * Math.PI) * amount * 0.5;
        if (fade <= 0.02) return null;
        const box = {
          position: "absolute" as const,
          left: x,
          top: y,
          width: len,
          height: len * 0.16,
          marginLeft: -len / 2,
          marginTop: -len * 0.08,
          transform: `rotate(${(i % 2 ? 1 : -1) * (2 + (i % 3))}deg) scaleX(${dir})`,
        };
        return FX_ART_READY ? (
          <FxTint
            key={i}
            asset="wind-streak"
            opacity={fade}
            gradient={AIR}
            style={box}
          />
        ) : (
          <div
            key={i}
            aria-hidden="true"
            style={{
              ...box,
              opacity: fade,
              borderRadius: len,
              background: `linear-gradient(90deg,transparent,rgba(255,255,255,0.9))`,
              filter: "blur(3px)",
              pointerEvents: "none",
            }}
          />
        );
      })}

      {/* Dirt scuffed off the floor under each pet as it drives in and out. */}
      {(["left", "right"] as const).map((side) => {
        const base = side === "left" ? CAT : DRA;
        const footX = base.x + poseFor(T, side, winner).dx;
        const phase = side === "left" ? 0 : Math.PI;
        const kick = Math.max(0, Math.sin(T * 60 + phase));
        const fade = kick * amount * 0.42;
        if (fade <= 0.02) return null;
        const w = 190 + kick * 110;
        const box = {
          position: "absolute" as const,
          left: footX + (side === "left" ? -1 : 1) * (40 + kick * 70),
          top: base.y - 14,
          width: w,
          height: w * 0.42,
          marginLeft: -w / 2,
          marginTop: -w * 0.34,
          transform: `scaleX(${side === "left" ? -1 : 1})`,
        };
        return FX_ART_READY ? (
          <FxTint
            key={side}
            asset="dust-sheet"
            opacity={fade}
            gradient={EARTH}
            style={box}
          />
        ) : (
          <div
            key={side}
            aria-hidden="true"
            style={{
              ...box,
              opacity: fade,
              borderRadius: "50%",
              background:
                "radial-gradient(circle,rgba(120,104,86,0.6),transparent 70%)",
              filter: "blur(5px)",
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
}
