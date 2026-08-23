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
import { clamp, easeOutCubic, easeOutQuad } from "@/lib/pet-fight/timing";
import { fxSrc, type FxAsset } from "@/lib/pet-fight/fx-assets";
import type { CSSProperties } from "react";

/**
 * Draws one piece of the energy artwork, tinted gold.
 *
 * scripts/prep-fx-art.mjs keys the art's black background out into real alpha,
 * so this is the same masked-gradient trick GoldSpriteTint uses on the pets:
 * the art supplies the shape, the gradient supplies the colour. No blend modes
 * — the world layer has a transform and so forms its own blend group, and
 * anything relying on mix-blend-mode there composites against nothing.
 */
export function FxTint({
  asset,
  style,
  opacity = 1,
  gradient,
}: {
  asset: FxAsset;
  /** Box geometry — position, size, transform. */
  style: CSSProperties;
  opacity?: number;
  /** Defaults to the standard gold ramp. */
  gradient?: string;
}) {
  if (opacity <= 0) return null;
  const url = `url(${fxSrc(asset)})`;
  return (
    <div
      style={{
        ...style,
        opacity,
        background:
          gradient ??
          `linear-gradient(180deg,${GOLD_CORE},${GOLD_MID} 45%,${GOLD_DEEP})`,
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    />
  );
}

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

const BEAM_MASK =
  "linear-gradient(90deg,transparent,rgba(0,0,0,0.55) 18%,#000 46%,#000 54%,rgba(0,0,0,0.55) 82%,transparent)";

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
          // Fades out at the foot line too — squared off, the column ends on a
          // visible horizontal edge across the ground.
          background: `linear-gradient(180deg,rgba(255,246,192,0.2),${GOLD_CORE} 35%,#fff 86%,rgba(255,255,255,0) 100%)`,
          // Feathered sides. A hard-edged column over a dark arena reads as a
          // pale slab laid on top of the pet rather than as light.
          WebkitMaskImage: BEAM_MASK,
          maskImage: BEAM_MASK,
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
  gradient,
}: {
  spriteSrc: string;
  amount: number;
  T: number;
  /**
   * Defaults to the gold ramp. ImpactFx reuses this same masking to flash a
   * struck pet white for a frame or two, which is the classic fighting-game
   * read and needs no artwork of its own.
   */
  gradient?: string;
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
        background:
          gradient ??
          `linear-gradient(180deg,${GOLD_CORE},${GOLD_MID} 45%,${GOLD_DEEP})`,
        mixBlendMode: "screen",
        opacity: amount * shimmer,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// The art-driven scene. These replace the div-only versions above once the
// artwork exists (see FX_ART_READY); PetFightStage picks between them.
// ---------------------------------------------------------------------------

/** The ground splitting open around the pet's feet. */
export function GroundCrackDecal({
  x,
  y,
  T,
  weight = 1,
}: {
  x: number;
  y: number;
  T: number;
  /**
   * How strongly this asset features in the transformation that was drawn
   * (lib/pet-fight/powerups.ts). 1 is the balanced gold scene.
   */
  weight?: number;
}) {
  if (T < BEAT.quake || T > XFORM_OUT) return null;
  const open = clamp((T - BEAT.quake) / (BEAT.pillar - BEAT.quake), 0, 1);
  const burst = clamp((T - BEAT.flash) / 0.25, 0, 1);
  const fade =
    clamp((T - BEAT.quake) / 0.35, 0, 1) * clamp((XFORM_OUT - T) / 1.4, 0, 1);
  const w = (300 + easeOutCubic(open) * 620 + burst * 280) * (0.55 + weight * 0.45);
  // The fissures pulse with the aura rather than sitting there lit.
  const glow = 0.62 + 0.3 * Math.sin(T * 7);
  return (
    <FxTint
      asset="crack-ground"
      opacity={fade * glow}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: w,
        marginLeft: -w / 2,
        marginTop: -w / 2,
        // The art is drawn straight down; flatten it onto the ground plane.
        transform: "scaleY(0.34)",
      }}
    />
  );
}

/** Dust rings punched outward on the three loudest beats. */
export function ShockwaveRings({
  x,
  y,
  T,
  weight = 1,
}: {
  x: number;
  y: number;
  T: number;
  /**
   * How strongly this asset features in the transformation that was drawn
   * (lib/pet-fight/powerups.ts). 1 is the balanced gold scene.
   */
  weight?: number;
}) {
  return (
    <>
      {[BEAT.quake, BEAT.pillar, BEAT.flash].map((t0, i) => {
        const p = (T - t0) / 1.0;
        if (p < 0 || p > 1) return null;
        const w = (240 + easeOutCubic(p) * (1100 + i * 320)) * (0.6 + weight * 0.4);
        return (
          <FxTint
            key={i}
            asset="shockwave-ring"
            opacity={(1 - p) * (0.5 + i * 0.18)}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: w,
              height: w,
              marginLeft: -w / 2,
              marginTop: -w / 2,
              transform: "scaleY(0.3)",
            }}
          />
        );
      })}
    </>
  );
}

const ROCK_ART = ["rock-a", "rock-b", "rock-c"] as const;

/** Chunks of the arena torn loose and hanging in the aura. */
export function FloatingRocks({
  x,
  y,
  T,
  weight = 1,
}: {
  x: number;
  y: number;
  T: number;
  /**
   * How strongly this asset features in the transformation that was drawn
   * (lib/pet-fight/powerups.ts). 1 is the balanced gold scene.
   */
  weight?: number;
}) {
  if (T < BEAT.quake || T > XFORM_OUT) return null;
  // Count, not size: a gravity transformation tearing up twice as much arena
  // reads as more rock, whereas twice-as-big rock just reads as closer rock.
  const count = Math.max(3, Math.round(12 * weight));
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        // Staggered so the ground comes apart piece by piece rather than all at
        // once — the first few tear loose on the quake, the rest as it builds.
        const born = BEAT.quake + 0.1 + (i % 6) * 0.34;
        const age = T - born;
        if (age < 0) return null;
        const side = i % 2 ? 1 : -1;
        const blown = clamp((T - BEAT.flash) / 0.9, 0, 1);
        const rise = Math.min(age, 4.2) * (52 + (i % 4) * 20);
        const sz = 34 + (i % 4) * 20;
        const bx =
          x +
          side * (70 + (i % 5) * 58) +
          Math.sin(T * 1.3 + i) * 14 +
          easeOutQuad(blown) * side * (420 + (i % 3) * 160);
        const by = y - 24 - rise - easeOutQuad(blown) * 150;
        const fade =
          clamp(age / 0.4, 0, 1) *
          clamp((XFORM_OUT - T) / 1.4, 0, 1) *
          (1 - blown);
        if (fade <= 0) return null;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={fxSrc(ROCK_ART[i % ROCK_ART.length]!)}
            alt=""
            draggable={false}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: bx,
              top: by,
              width: sz,
              height: "auto",
              marginLeft: -sz / 2,
              transform: `rotate(${(i % 2 ? 1 : -1) * (age * 34 + i * 27)}deg)`,
              opacity: fade,
              // Lit from below by the aura, like everything else in the scene.
              filter: `drop-shadow(0 0 ${14 + (i % 3) * 6}px ${GOLD_DEEP}) drop-shadow(0 6px 8px rgba(0,0,0,0.45))`,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
}

/** Gusts tearing outward from the pet, both directions. */
export function WindGusts({
  x,
  y,
  T,
  weight = 1,
}: {
  x: number;
  y: number;
  T: number;
  /**
   * How strongly this asset features in the transformation that was drawn
   * (lib/pet-fight/powerups.ts). 1 is the balanced gold scene.
   */
  weight?: number;
}) {
  const end = BEAT.flash + 0.7;
  if (T < BEAT.ignite || T > end) return null;
  const power =
    clamp((T - BEAT.ignite) / 1.2, 0, 1) * clamp((end - T) / 0.5, 0, 1);
  const blast = clamp((T - BEAT.flash) / 0.14, 0, 1);
  return (
    <>
      {Array.from({ length: Math.max(3, Math.round(10 * weight)) }, (_, i) => {
        const side = i % 2 ? 1 : -1;
        const cycle = (T * (1.05 + (i % 4) * 0.28) + i * 0.17) % 1;
        const dist = 120 + cycle * (500 + (i % 3) * 200) * (1 + blast * 0.8);
        const len = 240 + (i % 4) * 140;
        // Clustered near horizontal: this is wind coming off the pet, not a
        // starburst. Each one rides at its own height.
        const tilt = (side > 0 ? 1 : -1) * (((i * 37) % 26) - 13) * 0.6;
        return (
          <FxTint
            key={i}
            asset="wind-streak"
            opacity={power * (1 - cycle) * 0.75}
            style={{
              position: "absolute",
              left: x + side * dist,
              // Kept inside the pet's own height — up in the sky it reads as
              // cloud streaks rather than as wind coming off the animal.
              top: y - 40 - ((i * 97) % 300) * 0.82 - cycle * 40,
              width: len,
              height: len * 0.3,
              marginLeft: -len / 2,
              marginTop: -len * 0.15,
              // scaleX flips the taper so the thick end always faces the pet.
              transform: `rotate(${tilt}deg) scaleX(${side})`,
            }}
          />
        );
      })}
    </>
  );
}

/** Dust driven out along the ground on either side. */
export function DustSheets({
  x,
  y,
  T,
  weight = 1,
}: {
  x: number;
  y: number;
  T: number;
  /**
   * How strongly this asset features in the transformation that was drawn
   * (lib/pet-fight/powerups.ts). 1 is the balanced gold scene.
   */
  weight?: number;
}) {
  const end = BEAT.flash + 1.0;
  if (T < BEAT.ignite || T > end) return null;
  const power =
    clamp((T - BEAT.ignite) / 1.0, 0, 1) * clamp((end - T) / 0.7, 0, 1);
  const blast = clamp((T - BEAT.flash) / 0.2, 0, 1);
  return (
    <>
      {Array.from({ length: 4 }, (_, i) => {
        const side = i % 2 ? 1 : -1;
        const cycle = (T * (0.5 + (i % 2) * 0.16) + i * 0.31) % 1;
        const w = (520 + cycle * 620 + blast * 300) * (0.6 + weight * 0.4);
        return (
          <FxTint
            key={i}
            asset="dust-sheet"
            opacity={power * (1 - cycle) * 0.5}
            style={{
              position: "absolute",
              left: x + side * (160 + cycle * (520 + blast * 260)),
              top: y - 30,
              width: w,
              height: w * 0.5,
              marginLeft: -w / 2,
              marginTop: -w * 0.42,
              transform: `scaleX(${side})`,
            }}
          />
        );
      })}
    </>
  );
}

/** Electricity snapping around the pet as the aura peaks. */
export function LightningArcs({
  x,
  y,
  w,
  T,
  weight = 1,
}: {
  x: number;
  y: number;
  w: number;
  T: number;
  /**
   * How strongly this asset features in the transformation that was drawn
   * (lib/pet-fight/powerups.ts). 1 is the balanced gold scene.
   */
  weight?: number;
}) {
  const end = BEAT.flash + 0.35;
  if (T < BEAT.storm || T > end) return null;
  const power =
    clamp((T - BEAT.storm) / 1.4, 0, 1) * clamp((end - T) / 0.3, 0, 1);
  return (
    <>
      {Array.from({ length: Math.max(2, Math.round(6 * weight)) }, (_, i) => {
        // Each arc stutters on its own cycle. Without the per-arc phase they
        // strobe in unison, which reads as the whole screen flickering.
        const phase = (T * (5.2 + i * 0.83) + i * 0.41) % 1;
        const on = (0.13 + power * 0.09) * (0.7 + weight * 0.3);
        if (phase > on) return null;
        const a = (i / 6) * Math.PI * 2 + 0.5;
        const r = w * (0.34 + (i % 3) * 0.09);
        // Short: a bolt longer than the pet stops reading as something
        // crawling over it and starts reading as weather.
        const h = w * (0.42 + (i % 4) * 0.1);
        return (
          <FxTint
            key={i}
            asset="lightning-arc"
            opacity={power * (0.55 + 0.45 * (1 - phase / on))}
            gradient={`linear-gradient(180deg,#ffffff,${GOLD_CORE} 55%,${GOLD_MID})`}
            style={{
              position: "absolute",
              left: x + Math.cos(a) * r,
              top: y - w * 0.5 + Math.sin(a) * r * 0.7,
              width: h * 0.55,
              height: h,
              marginLeft: -(h * 0.55) / 2,
              marginTop: -h / 2,
              transform: `rotate(${(a * 180) / Math.PI + 90 + (i % 2 ? 14 : -14)}deg)`,
            }}
          />
        );
      })}
    </>
  );
}

/** The flame aura licking up off a transformed pet. */
export function AuraFlames({
  x,
  y,
  w,
  T,
  amount,
  weight = 1,
}: {
  x: number;
  /** The pet's FOOT line — the flame base sits on it. */
  y: number;
  w: number;
  T: number;
  amount: number;
  /**
   * How strongly this asset features in the transformation that was drawn
   * (lib/pet-fight/powerups.ts). 1 is the balanced gold scene.
   */
  weight?: number;
}) {
  if (amount <= 0) return null;
  const flick = 0.82 + Math.sin(T * 19) * 0.18;
  const fw = w * 1.75 * (0.7 + weight * 0.3);
  const h =
    w *
    (1.95 + Math.sin(T * 13) * 0.14) *
    (0.62 + amount * 0.38) *
    (0.55 + weight * 0.45);
  return (
    <FxTint
      asset="aura-flame"
      opacity={amount * 0.8 * flick}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: fw,
        height: h,
        marginLeft: -fw / 2,
        marginTop: -h,
      }}
    />
  );
}
