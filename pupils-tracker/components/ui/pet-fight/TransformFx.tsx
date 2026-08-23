"use client";

/**
 * The power-up scene — the pet flares gold and levels up before the finisher.
 *
 * Everything here is a pure function of the cinematic clock T, drawn with
 * absolutely positioned divs and inline styles, exactly like FinaleBeam. No
 * CSS keyframes: the stage can be scrubbed, paused and rendered as a still at
 * any T, which an animation-driven effect would break.
 *
 * There is no gold artwork. GoldSpriteTint gets the Super-Saiyan look out of
 * the existing PNG by masking a gold gradient with the sprite itself, so every
 * one of the sixteen species transforms without a new asset.
 */

import { BEAT, GOLD_CORE, GOLD_DEEP, GOLD_MID, XFORM_OUT } from "@/lib/pet-fight/storyboard";
import { clamp } from "@/lib/pet-fight/timing";

/** 0 → 1 as the aura catches, held for the rest of the fight. */
export function igniteAmount(T: number): number {
  return clamp((T - BEAT.ignite) / 0.9, 0, 1);
}

/** 0 → 1 across the white-out; this is "the pet is now golden". */
export function poweredAmount(T: number): number {
  return clamp((T - BEAT.flash) / 0.18, 0, 1);
}

/** Cracked ground under a pet whose aura is tearing the arena up. */
export function GroundCrackRing({
  x,
  y,
  T,
}: {
  x: number;
  y: number;
  T: number;
}) {
  if (T < BEAT.ignite || T > XFORM_OUT) return null;
  const p = clamp((T - BEAT.ignite) / 2.4, 0, 1);
  const fade = clamp((XFORM_OUT - T) / 0.9, 0, 1);
  const w = 200 + p * 520;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: w,
          height: w * 0.26,
          marginLeft: -w / 2,
          marginTop: -w * 0.13,
          borderRadius: "50%",
          border: `${3 + p * 5}px solid ${GOLD_MID}`,
          opacity: fade * (1 - p) * 0.85,
          boxShadow: `0 0 ${40 + p * 60}px ${GOLD_DEEP}`,
        }}
      />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        const len = 70 + p * 150 + (i % 3) * 24;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: len,
              height: 5 + (i % 2) * 3,
              marginTop: -3,
              transformOrigin: "0 50%",
              // Flattened to 0.3 vertically so the cracks read as lying on the
              // ground rather than standing up in the air.
              transform: `rotate(${(a * 180) / Math.PI}deg) scaleY(0.3)`,
              background: `linear-gradient(90deg,${GOLD_CORE},${GOLD_DEEP} 60%,transparent)`,
              opacity: fade * (0.5 + 0.4 * Math.sin(T * 9 + i)),
              boxShadow: `0 0 20px ${GOLD_MID}`,
            }}
          />
        );
      })}
    </>
  );
}

/** Pebbles and sparks torn off the ground and pulled upward by the aura. */
export function RisingDebris({
  x,
  y,
  T,
}: {
  x: number;
  y: number;
  T: number;
}) {
  if (T < BEAT.ignite || T > XFORM_OUT) return null;
  const fade =
    clamp((T - BEAT.ignite) / 0.5, 0, 1) * clamp((XFORM_OUT - T) / 1.0, 0, 1);
  return (
    <>
      {Array.from({ length: 14 }, (_, i) => {
        // Each mote runs its own 0→1 loop at a slightly different rate, so the
        // stream never pulses in lockstep.
        const cycle = (T * (0.55 + (i % 4) * 0.12) + i * 0.137) % 1;
        const spread = 90 + (i % 5) * 46;
        const px = x + Math.cos(i * 2.4) * spread * (1 - cycle * 0.35);
        const py = y - cycle * (360 + (i % 3) * 90);
        const sz = 7 + (i % 4) * 6;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px,
              top: py,
              width: sz,
              height: sz * (i % 3 === 0 ? 2.4 : 1),
              marginLeft: -sz / 2,
              borderRadius: i % 3 === 0 ? sz : "50%",
              background: i % 3 === 0 ? GOLD_CORE : GOLD_MID,
              opacity: fade * (1 - cycle) * 0.9,
              boxShadow: `0 0 ${sz * 2}px ${GOLD_DEEP}`,
            }}
          />
        );
      })}
    </>
  );
}

/** Spiky gold corona around a transformed pet — the flame-aura silhouette. */
export function GoldAuraFlare({
  x,
  y,
  w,
  T,
  amount,
}: {
  x: number;
  y: number;
  w: number;
  T: number;
  amount: number;
}) {
  if (amount <= 0) return null;
  const flicker = 0.85 + Math.sin(T * 22) * 0.15;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: w * 1.5,
          height: w * 1.8,
          marginLeft: -(w * 1.5) / 2,
          marginTop: -(w * 1.8) / 2,
          borderRadius: "50%",
          background: `radial-gradient(circle,${GOLD_MID} 0%,rgba(255,157,28,0.35) 45%,transparent 72%)`,
          opacity: amount * 0.55 * flicker,
          filter: "blur(16px)",
        }}
      />
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * 360 + T * 26;
        const len = w * (0.55 + 0.35 * Math.abs(Math.sin(T * 7 + i * 1.7)));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: len,
              height: w * 0.14,
              marginTop: -(w * 0.14) / 2,
              transformOrigin: "0 50%",
              transform: `rotate(${a}deg)`,
              borderRadius: w,
              background: `linear-gradient(90deg,${GOLD_CORE},${GOLD_DEEP} 55%,transparent)`,
              opacity: amount * 0.5 * flicker,
              filter: "blur(3px)",
            }}
          />
        );
      })}
    </>
  );
}

/** Column of light punching out of the pet and off the top of the frame. */
export function GoldPillar({
  x,
  y,
  T,
}: {
  x: number;
  y: number;
  T: number;
}) {
  if (T < BEAT.pillar || T > BEAT.flash + 0.45) return null;
  const grow = clamp((T - BEAT.pillar) / 0.35, 0, 1);
  const fade = clamp((BEAT.flash + 0.45 - T) / 0.3, 0, 1);
  const w = (150 + grow * 200) * (1 + Math.sin(T * 30) * 0.12);
  // Reaches well above the stage so a camera punch-in never finds its top edge.
  const h = y + 700;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y - h,
          width: w * 2,
          height: h,
          marginLeft: -w,
          borderRadius: w,
          background: `linear-gradient(180deg,transparent,${GOLD_DEEP} 30%,${GOLD_MID})`,
          opacity: fade * grow * 0.45,
          filter: "blur(24px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x,
          top: y - h,
          width: w,
          height: h,
          marginLeft: -w / 2,
          borderRadius: w,
          background: `linear-gradient(180deg,rgba(255,246,192,0.15),${GOLD_CORE} 40%,#fff)`,
          opacity: fade * grow,
          boxShadow: `0 0 ${w}px ${w * 0.4}px ${GOLD_MID}`,
        }}
      />
    </>
  );
}

/**
 * Turns the pet's own PNG gold by masking a gradient with the sprite. Render it
 * as the last child of the wrapper that holds the <img>, so it inherits that
 * wrapper's mirroring and sits on exactly the same box — otherwise the gold
 * silhouette slides off the animal.
 */
export function GoldSpriteTint({
  spriteSrc,
  amount,
  T,
}: {
  spriteSrc: string;
  amount: number;
  T: number;
}) {
  if (amount <= 0) return null;
  const shimmer = 0.78 + Math.sin(T * 16) * 0.12;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        // The sprite is auto-height at 100% width; matching that here keeps the
        // mask registered with the image at every stage size.
        height: "100%",
        WebkitMaskImage: `url(${spriteSrc})`,
        maskImage: `url(${spriteSrc})`,
        WebkitMaskSize: "100% auto",
        maskSize: "100% auto",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "top left",
        maskPosition: "top left",
        background: `linear-gradient(180deg,${GOLD_CORE},${GOLD_MID} 45%,${GOLD_DEEP})`,
        mixBlendMode: "screen",
        opacity: amount * shimmer,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    />
  );
}
