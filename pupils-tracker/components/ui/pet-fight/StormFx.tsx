"use client";

/**
 * The sky's reaction to a pet powering up: cloud rolls over the arena and
 * light stabs down through it, clearing again once the burst has landed.
 *
 * Both pieces are screen-space. The five scene backdrops are single photos with
 * their own skies, so nothing here can be painted into the art — it has to sit
 * over whichever backdrop the pupil chose. Pure functions of T, like the rest
 * of the cinematic.
 */

import { BEAT, GOLD_CORE, XFORM_OUT } from "@/lib/pet-fight/storyboard";
import { clamp } from "@/lib/pet-fight/timing";
import { fxSrc } from "@/lib/pet-fight/fx-assets";

/** 0 → 1 as the storm gathers, back to 0 as it clears after the flash. */
function stormAmount(T: number): number {
  const from = BEAT.storm - 0.6;
  if (T < from || T > XFORM_OUT) return 0;
  const roll = clamp((T - from) / 1.5, 0, 1);
  const clear = clamp((XFORM_OUT - T) / 1.8, 0, 1);
  return roll * clear;
}

/**
 * Cloud rolling in over the arena.
 *
 * prep-fx-art keys the art's white background out, so this is flat storm slate
 * whose alpha carries the cloud's shading — it darkens the pupil's sky without
 * needing a blend mode, and works the same over all five backdrops. Two copies
 * drift at different speeds; one layer alone reads as a photo sliding sideways,
 * and their soft edges hide each other's seams.
 */
export function StormSky({
  T,
  fx,
  fy,
}: {
  T: number;
  /** Camera focus, so the sky takes the same parallax as SceneBackdrop. */
  fx: number;
  fy: number;
}) {
  const amount = stormAmount(T);
  if (amount <= 0) return null;
  const panX = (fx - 960) * 0.2;
  const panY = (fy - 540) * 0.12;
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {[0, 1].map((i) => {
        const drift = ((T - BEAT.storm) * (i ? 26 : 14) + i * 240) % 1200;
        const scale = i ? 1.35 : 1.15;
        // The far layer sinks lower and is heavier; the near one skims the top.
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={fxSrc("storm-clouds")}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: 0,
              top: i ? "-14%" : "-24%",
              width: "100%",
              height: i ? "62%" : "54%",
              objectFit: "cover",
              opacity: amount * (i ? 0.9 : 0.62),
              transform: `translate(${-panX - drift}px,${-panY}px) scale(${scale})`,
              transformOrigin: "center top",
            }}
          />
        );
      })}
    </div>
  );
}

/** Feathers a shaft's sides so it reads as light, not as a rotated box. */
const SHAFT_MASK =
  "linear-gradient(90deg,transparent,rgba(0,0,0,0.85) 42%,rgba(0,0,0,0.85) 58%,transparent)";

/** Shafts of light stabbing down through the cloud. */
export function GodRays({ T }: { T: number }) {
  const amount = stormAmount(T);
  if (amount <= 0) return null;
  // Brightest right as the pillar goes up, then swallowed by the white-out.
  const peak = clamp((T - BEAT.pillar + 1.2) / 1.4, 0, 1);
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {Array.from({ length: 5 }, (_, i) => {
        const lean = -18 + i * 9;
        const w = 190 + (i % 3) * 120;
        const breathe = 0.72 + 0.28 * Math.sin(T * 1.7 + i * 1.3);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${12 + i * 19}%`,
              top: "-30%",
              width: w,
              height: "130%",
              marginLeft: -w / 2,
              transformOrigin: "50% 0",
              transform: `rotate(${lean}deg)`,
              background: `linear-gradient(180deg,${GOLD_CORE},rgba(255,246,192,0.18) 45%,transparent 85%)`,
              // Without a sideways falloff a shaft is a rotated rectangle, and
              // a blur alone leaves its edges reading as a hard-sided wedge.
              WebkitMaskImage: SHAFT_MASK,
              maskImage: SHAFT_MASK,
              opacity: amount * peak * breathe * 0.26,
              filter: "blur(18px)",
            }}
          />
        );
      })}
    </div>
  );
}
