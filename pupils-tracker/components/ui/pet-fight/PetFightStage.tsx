"use client";

/**
 * Parameterized storyboard fight stage — same 30s choreography as the handoff,
 * driven by clock T, with any two pet sprites and a real winner.
 *
 * Two things vary per duel on top of the cast: the winner powers up into a
 * golden form before the last-resort attack (see TransformFx), and the attack
 * itself is one of six finishers (see Finales). Every beat from the power-up
 * onward is named in storyboard.BEAT rather than written as a literal here.
 */

import { type CSSProperties, type ReactNode } from "react";
import {
  BEAT,
  CAT,
  CAT_AURA,
  DARK,
  DRA,
  DRA_AURA,
  FIGHT_DURATION,
  GOLD,
  H,
  IMPACTS,
  SHAKES,
  STAR_CAT,
  STAR_DRA,
  W,
} from "@/lib/pet-fight/storyboard";
import {
  anchorOf,
  poseFor,
  renderPoseFor,
  trailSpread,
  type FightCast,
  type FightSpeechLine,
  type FightWinner,
  type RenderPose,
} from "@/lib/pet-fight/poses";
import { GHOST_AGES } from "@/lib/pet-fight/melee";
import { ClashWind } from "@/components/ui/pet-fight/MeleeFx";
import { ImpactReactions } from "@/components/ui/pet-fight/ImpactFx";
import { frameAt } from "@/lib/pet-fight/camera";
import {
  clamp,
  easeInCubic,
  easeOutBack,
  lerpAt,
  pulse,
  shakeAt,
  track,
} from "@/lib/pet-fight/timing";
import {
  ComicText,
  HeartbeatPulse,
  ScreenDarken,
  ScreenVignette,
  StarBurst,
  WhiteFlash,
} from "@/components/ui/pet-fight/FightFx";
import {
  AuraFlames,
  DustSheets,
  FloatingRocks,
  GoldAuraFlare,
  GoldPillar,
  GoldSpriteTint,
  GroundCrackDecal,
  GroundCrackRing,
  LightningArcs,
  RisingDebris,
  ShockwaveRings,
  WindGusts,
  igniteAmount,
  poweredAmount,
} from "@/components/ui/pet-fight/TransformFx";
import { GodRays, StormSky } from "@/components/ui/pet-fight/StormFx";
import { FX_ART_READY } from "@/lib/pet-fight/fx-assets";
import { FinaleVisual, winnerOpacity } from "@/components/ui/pet-fight/Finales";
import { finaleSpec, type FinaleId } from "@/lib/pet-fight/finales";
import {
  powerUpSpec,
  powerUpVars,
  type PowerUpId,
  type PowerUpWeights,
} from "@/lib/pet-fight/powerups";

export type { FightCast, FightSpeechLine, FightWinner };

export type PetFightStageProps = {
  T: number;
  left: FightCast;
  right: FightCast;
  winner: FightWinner;
  sceneSrc: string;
  shakeMul?: number;
  speech?: FightSpeechLine[];
  /** Which finishing move this duel drew. */
  finale?: FinaleId;
  /** Set false to skip the power-up scene (the 5s beat still plays out). */
  transform?: boolean;
  /** Which transformation this duel drew (lib/pet-fight/powerups.ts). */
  powerUp?: PowerUpId;
};

/** Whether this side is the one that breaks through. A draw powers up both. */
function transformsSide(side: "left" | "right", winner: FightWinner): boolean {
  if (winner === "draw") return true;
  return winner === side;
}

function aura(
  T: number,
  color: string,
  count: number,
  radius: number,
  seed: number,
  on: number
): ReactNode[] {
  const orbs: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + T * (0.6 + (i % 3) * 0.18) + seed;
    const r = radius * (0.7 + 0.3 * Math.sin(T * 1.4 + i));
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * 0.72 - 20 - (((T * 34 + i * 40) % 90) * 0.35);
    const sz = 16 + (i % 4) * 9 + Math.sin(T * 3 + i) * 4;
    orbs.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: "50%",
          top: "42%",
          width: sz,
          height: sz,
          marginLeft: x - sz / 2,
          marginTop: y - sz / 2,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 ${sz * 0.9}px ${sz * 0.5}px ${color}`,
          opacity: on * (0.55 + 0.4 * Math.sin(T * 4 + i)),
        }}
      />
    );
  }
  return orbs;
}

/**
 * Distant arena backdrop. One photo, always covering the 1920×1080 stage —
 * never a second copy under the camera (that tiled a seam on zoom).
 * Punch-ins only ease the landscape a little, like a far parallax plane.
 */
function SceneBackdrop({
  src,
  scale,
  fx,
  fy,
  shx,
  shy,
}: {
  src: string;
  scale: number;
  fx: number;
  fy: number;
  shx: number;
  shy: number;
}) {
  const breath = 1.2 + (scale - 1) * 0.1;
  const panX = (fx - 960) * 0.2 + shx * 0.25;
  const panY = (fy - 540) * 0.12 + shy * 0.25;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      draggable={false}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "center",
        transform: `translate(${-panX}px,${-panY}px) scale(${breath})`,
        transformOrigin: "center center",
        willChange: "transform",
        pointerEvents: "none",
        userSelect: "none",
      }}
    />
  );
}

function groundShadowStyle(
  m: Record<string, number>,
  base: { x: number; y: number; w: number }
): CSSProperties {
  const air = clamp(-(m.dy ?? 0) / 150, 0, 1);
  const w = base.w * (0.8 + (m.sc ?? 1) * 0.1) * (1 - air * 0.4);
  return {
    position: "absolute",
    left: base.x + (m.dx ?? 0),
    top: base.y - 6,
    width: w,
    height: w * 0.16,
    marginLeft: -w / 2,
    marginTop: -w * 0.08,
    borderRadius: "50%",
    background: "rgba(0,0,0,0.4)",
    filter: "blur(6px)",
    opacity: 0.5 * (1 - air * 0.5),
  };
}

/**
 * The box one pet is drawn in — shared by the sprite and every afterimage of it,
 * so a ghost is simply this same box built from an older pose.
 */
function fighterBoxStyle(
  pose: { dx: number; dy: number; rot: number; sc: number },
  base: { x: number; y: number; w: number }
): CSSProperties {
  return {
    position: "absolute",
    left: base.x,
    top: base.y,
    width: base.w,
    height: base.w,
    transform: `translate(-50%,-100%) translate(${pose.dx}px,${pose.dy}px) rotate(${pose.rot}deg) scale(${pose.sc})`,
    transformOrigin: "50% 100%",
  };
}

/**
 * The speed trail: copies of the pet a few frames back, as dark silhouettes.
 *
 * The pose is a pure function of the clock, so "where was it two frames ago" is
 * just renderPoseFor(T - age) — no history to keep, and the trail is still
 * correct when the player is paused or scrubbed. Each ghost fades in on how far
 * it sits from where the pet is now, so a pet standing still has none of them
 * and every dash, the close-quarters flurry and the K.O. lunge all get one
 * without being listed anywhere.
 */
function SpeedGhosts({
  T,
  side,
  cast,
  winner,
  now,
  opacity,
}: {
  T: number;
  side: "left" | "right";
  cast: FightCast;
  winner: FightWinner;
  /** The pose the live sprite is drawn at, to measure each ghost against. */
  now: { dx: number; dy: number };
  opacity: number;
}) {
  if (opacity <= 0) return null;
  const base = side === "left" ? CAT : DRA;
  return (
    <>
      {GHOST_AGES.map((age, i) => {
        const past = renderPoseFor(Math.max(0, T - age), side, winner);
        // A ghost only shows once the pet has actually left it behind — an
        // afterimage sitting under the sprite is just a dark halo.
        const gone = Math.hypot(now.dx - past.dx, now.dy - past.dy);
        const fade =
          clamp((gone - 6) / 60, 0, 1) *
          (1 - i / GHOST_AGES.length) *
          0.5 *
          opacity;
        if (fade <= 0.02) return null;
        return (
          <div key={age} style={fighterBoxStyle(past, base)} aria-hidden="true">
            <div
              style={{
                position: "relative",
                width: "100%",
                transform: side === "left" ? "scaleX(-1)" : "none",
                // A dark silhouette rather than a faded copy: at these opacities
                // an untinted ghost just reads as a smudge of the pet's colour.
                filter: `brightness(0.25) saturate(0.4) blur(${1 + i * 0.6}px)`,
                opacity: fade,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cast.spriteSrc}
                alt=""
                draggable={false}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}

function Fighter({
  T,
  side,
  cast,
  winner,
  powered,
  opacity,
}: {
  T: number;
  side: "left" | "right";
  cast: FightCast;
  winner: FightWinner;
  /** 0 → 1 once this pet has come out of the white-out golden. */
  powered: number;
  /** Finishers that take the pet off the board dim it here. */
  opacity: number;
}) {
  const base = side === "left" ? CAT : DRA;
  const isLeft = side === "left";
  // Everything riding on top of the authored track — the idle sway, the flinch
  // off a landed hit, the victory bounce and the close-quarters flurry — lives
  // in renderPoseFor, so the afterimages can be built from the same function a
  // few frames back.
  const pose: RenderPose = renderPoseFor(T, side, winner);
  const { dx, dy, rot, sc, hitFlash } = pose;
  const spread = trailSpread(T, side, winner);

  const lost =
    winner !== "draw" &&
    ((winner === "left" && !isLeft) || (winner === "right" && isLeft));
  const celebrating =
    winner !== "draw" &&
    ((winner === "left" && isLeft) || (winner === "right" && !isLeft));

  const auraOn = clamp((T - 0.5) / 0.6, 0, 1) * (T > BEAT.ko && lost ? 0 : 1);
  const orbs = aura(
    T,
    powered > 0 ? GOLD : cast.aura,
    7,
    158,
    isLeft ? 0 : 2.1,
    auraOn
  );

  let glow = 0;
  if (isLeft) {
    glow = Math.max(
      pulse(T, 0.4, 2.6) * 0.7,
      clamp((T - BEAT.chargeStart) / 0.8, 0, 1) *
        clamp((BEAT.release + 0.05 - T) / 0.3, 0, 1)
    );
  } else {
    glow = Math.max(
      clamp((T - 7.0) / 0.5, 0, 1) * clamp((7.9 - T) / 0.3, 0, 1),
      clamp((T - BEAT.chargeStart) / 0.8, 0, 1) *
        clamp((BEAT.release + 0.05 - T) / 0.3, 0, 1)
    );
  }
  // Winner keeps glowing while their finisher is landing.
  if (celebrating && T >= BEAT.release && T <= BEAT.ko - 0.3) {
    glow = Math.max(glow, 0.55 + Math.sin(T * 18) * 0.2);
  }

  // Motion blur on the pet itself, off the same signal as the trail.
  const smear = spread > 0.04 ? ` blur(${(spread * 2.6).toFixed(2)}px)` : "";
  const spriteFilter =
    (powered > 0
      ? `drop-shadow(0 0 ${30 + powered * 26}px ${GOLD}) drop-shadow(0 12px 10px rgba(0,0,0,0.4)) brightness(${1 + powered * 0.08}) saturate(${1 + powered * 0.2})`
      : "drop-shadow(0 12px 10px rgba(0,0,0,0.4))") + smear;

  return (
    <>
      <SpeedGhosts
        T={T}
        side={side}
        cast={cast}
        winner={winner}
        now={pose}
        opacity={opacity}
      />
      <div style={{ ...fighterBoxStyle({ dx, dy, rot, sc }, base), opacity }}>
        {orbs}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "66%",
            width: 130,
            height: 130,
            marginLeft: isLeft ? -10 : -120,
            marginTop: -65,
            borderRadius: "50%",
            background: `radial-gradient(circle,${powered > 0 ? GOLD : cast.tint},transparent 70%)`,
            opacity: glow,
            filter: "blur(2px)",
          }}
        />
        {/* Mirroring and the glow filter sit on the wrapper so the gold tint,
            which is masked by this exact sprite, stays registered with it. */}
        <div
          style={{
            position: "relative",
            width: "100%",
            transform: isLeft ? "scaleX(-1)" : "none",
            filter: spriteFilter,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cast.spriteSrc}
            alt=""
            draggable={false}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
          <GoldSpriteTint spriteSrc={cast.spriteSrc} amount={powered} T={T} />
          <GoldSpriteTint
            spriteSrc={cast.spriteSrc}
            amount={hitFlash}
            T={T}
            gradient="linear-gradient(180deg,#ffffff,#ffffff)"
          />
        </div>
      </div>
    </>
  );
}

function Projectile({
  T,
  fromLeft,
  cast,
}: {
  T: number;
  fromLeft: boolean;
  cast: FightCast;
}) {
  if (fromLeft) {
    if (T < 3.85 || T > 4.65) return null;
    const p = clamp((T - 3.9) / 0.6, 0, 1);
    const x = lerpAt(T, 3.9, 4.5, 700, 1250, easeInCubic);
    const y = 560 - Math.sin(p * Math.PI) * 70 + p * 40;
    const sz = 130 + p * 90;
    if (cast.projectileSrc) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cast.projectileSrc}
          alt=""
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: sz,
            height: sz,
            marginLeft: -sz / 2,
            marginTop: -sz / 2,
            transform: `rotate(${T * 720}deg)`,
            filter: `drop-shadow(0 0 40px ${cast.tint})`,
          }}
        />
      );
    }
    return (
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: sz,
          height: sz,
          marginLeft: -sz / 2,
          marginTop: -sz / 2,
          borderRadius: "50%",
          transform: `rotate(${T * 720}deg)`,
          background: `radial-gradient(circle at 35% 30%,#fff,${cast.tint} 55%,transparent 100%)`,
          boxShadow: `0 0 60px 24px ${cast.tint}`,
        }}
      />
    );
  }

  if (T < 7.85 || T > 8.9) return null;
  const p = clamp((T - 7.9) / 0.6, 0, 1);
  const x = lerpAt(T, 7.9, 8.5, 1240, 660, easeInCubic);
  const y = 570 - Math.sin(p * Math.PI) * 60 + p * 26;
  const sz = 120 + p * 80;
  if (cast.projectileSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cast.projectileSrc}
        alt=""
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: sz,
          height: sz,
          marginLeft: -sz / 2,
          marginTop: -sz / 2,
          transform: `rotate(${-T * 640}deg) scale(${1 + p * 0.1})`,
          filter: `blur(1px) drop-shadow(0 0 40px ${cast.tint})`,
        }}
      />
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: sz,
        height: sz,
        marginLeft: -sz / 2,
        marginTop: -sz / 2,
        borderRadius: "50%",
        transform: `rotate(${-T * 640}deg)`,
        background: `radial-gradient(circle at 40% 34%,#fff,${cast.tint} 55%,transparent 100%)`,
        boxShadow: `0 0 50px 20px ${cast.tint}`,
      }}
    />
  );
}

function ChargeOrb({
  T,
  side,
  cast,
  winner,
  powered,
}: {
  T: number;
  side: "left" | "right";
  cast: FightCast;
  winner: FightWinner;
  powered: number;
}) {
  // Dual charge winds up; at BEAT.release the winner fires their finisher
  // instead of both orbs meeting in the middle.
  if (T < BEAT.chargeStart || T > BEAT.release + 0.03) return null;
  if (winner !== "draw" && side !== winner && T > BEAT.release - 0.1) return null;
  const isLeft = side === "left";
  const grow = clamp((T - BEAT.chargeStart) / 3.0, 0, 1);
  const homeX = isLeft ? 560 : 1180;
  const homeY = isLeft ? 320 : 540;
  const sz = 40 + grow * 230;
  const tint = powered > 0 ? GOLD : cast.tint;
  return (
    <div
      style={{
        position: "absolute",
        left: homeX,
        top: homeY,
        width: sz,
        height: sz,
        marginLeft: -sz / 2,
        marginTop: -sz / 2,
        borderRadius: "50%",
        transform: `rotate(${T * (isLeft ? 300 : -340)}deg)`,
        background: `radial-gradient(circle at 36% 30%,#fff,${tint} 45%,transparent 100%)`,
        boxShadow: `0 0 ${sz * 0.6}px ${sz * 0.28}px ${tint}`,
      }}
    />
  );
}

/** Soft tip-blast when the power stream locks on. Only the beam needs it. */
function Explosion({ T }: { T: number }) {
  if (T < BEAT.impact - 0.05 || T > BEAT.impact + 0.65) return null;
  const g = clamp((T - (BEAT.impact - 0.05)) / 0.25, 0, 1);
  const hold = clamp((BEAT.impact + 0.65 - T) / 0.35, 0, 1);
  const sz = 180 + g * 280;
  return (
    <div
      style={{
        position: "absolute",
        left: 960,
        top: 540,
        width: sz,
        height: sz,
        marginLeft: -sz / 2,
        marginTop: -sz / 2,
        borderRadius: "50%",
        opacity: hold * 0.75,
        background:
          "radial-gradient(circle,#ffffff 0%,#fff2c0 28%,rgba(255,154,60,0.7) 55%,transparent 100%)",
        boxShadow: "0 0 80px 36px rgba(255,180,80,0.55)",
      }}
    />
  );
}

function Smoke({ T }: { T: number }) {
  const from = BEAT.impact + 0.45;
  if (T < from || T > from + 1.9) return null;
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => {
        const p = clamp((T - (from + i * 0.08)) / 1.6, 0, 1);
        const x = 960 + Math.cos(i * 1.7) * (100 + p * 180);
        const y = 560 - p * 160 + Math.sin(i) * 40;
        const sz = 120 + p * 160;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: sz,
              height: sz,
              marginLeft: -sz / 2,
              marginTop: -sz / 2,
              borderRadius: "50%",
              background:
                "radial-gradient(circle,rgba(120,120,130,0.55),rgba(90,90,100,0) 70%)",
              opacity: (1 - p) * 0.45,
              filter: "blur(4px)",
            }}
          />
        );
      })}
    </>
  );
}

function FinaleText({
  T,
  shx,
  shy,
  winner,
  leftName,
  rightName,
  finale,
}: {
  T: number;
  shx: number;
  shy: number;
  winner: FightWinner;
  leftName: string;
  rightName: string;
  finale: FinaleId;
}) {
  if (winner === "draw") {
    if (T < BEAT.koText) return null;
    const s = clamp((T - BEAT.koText) / 0.22, 0, 1);
    const sc = 3.0 - easeOutBack(s) * 2.0;
    return (
      <div
        className="font-arcade pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate(${shx * 0.6}px,${-80 + shy * 0.6}px) scale(${sc})`,
          fontSize: 200,
          color: "#ffe14d",
          textShadow: "0 14px 0 #b21e2a, 0 0 90px rgba(255,120,40,0.9)",
          WebkitTextStroke: "8px #6d0f18",
        }}
      >
        DRAW!
      </div>
    );
  }

  const spec = finaleSpec(finale);
  // Long words ("COMBO K.O.!") would run off a 1920 stage at the K.O. size, so
  // the banner shrinks with length rather than clipping.
  const koSize = spec.koWord.length > 7 ? 190 : 280;

  const ko =
    T >= BEAT.koText && T <= 30 ? (
      <div
        className="font-arcade pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{
          opacity: clamp((BEAT.koText + 1.15 - T) / 0.35, 0, 1),
          transform: `translate(${shx * 0.6}px,${-190 + shy * 0.6}px) scale(${
            (3.0 - easeOutBack(clamp((T - BEAT.koText) / 0.22, 0, 1)) * 2.0) *
            (1 +
              Math.sin(Math.max(0, T - (BEAT.koText + 0.2)) * 8) *
                0.02 *
                Math.max(0, 1 - (T - (BEAT.koText + 0.2))))
          })`,
          fontSize: koSize,
          color: spec.koColor,
          textShadow: `0 14px 0 ${spec.koShadow}, 0 0 90px rgba(255,120,40,0.9)`,
          WebkitTextStroke: `8px ${spec.koStroke}`,
          whiteSpace: "nowrap",
        }}
      >
        {spec.koWord}
      </div>
    ) : null;

  const name = winner === "left" ? leftName : rightName;
  const wins =
    T >= BEAT.wins ? (
      <div
        className="font-arcade pointer-events-none absolute bottom-[90px] left-0 right-0 flex justify-center"
        style={{
          transform: `scale(${1.6 - easeOutBack(clamp((T - BEAT.wins) / 0.3, 0, 1)) * 0.6})`,
          fontSize: 72,
          color: "#fff",
          textShadow: "0 6px 0 #8a3bd8, 0 0 50px rgba(214,120,255,0.9)",
          WebkitTextStroke: "4px #4a1080",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        {name.toUpperCase()} WINS!
      </div>
    ) : null;

  return (
    <>
      {ko}
      {wins}
    </>
  );
}

/** The gold FX around one pet while it powers up. World-space, behind sprites. */
function TransformScene({
  T,
  side,
  winner,
  weights,
  opacity = 1,
}: {
  T: number;
  side: "left" | "right";
  winner: FightWinner;
  /** How strongly each asset features in this transformation. */
  weights: PowerUpWeights;
  /** Goes with the pet when a finisher takes them off the board. */
  opacity?: number;
}) {
  if (T < BEAT.quake || T > FIGHT_DURATION) return null;
  const base = side === "left" ? CAT : DRA;
  const pose = poseFor(T, side, winner);
  const footX = base.x + pose.dx;
  const footY = base.y + pose.dy;
  const body = anchorOf(T, side, winner);
  const ignite = igniteAmount(T);
  const powered = poweredAmount(T);
  // Half-lit while it is only building; full once the burst has landed.
  const auraAmount = Math.max(ignite * 0.55, powered);
  if (opacity <= 0) return null;
  return (
    <div style={{ opacity }}>
      {FX_ART_READY ? (
        <>
          <GroundCrackDecal x={footX} y={footY} T={T} weight={weights.crack} />
          <ShockwaveRings x={footX} y={footY} T={T} weight={weights.crack} />
          <DustSheets x={footX} y={footY} T={T} weight={weights.wind} />
          <FloatingRocks x={footX} y={footY} T={T} weight={weights.rock} />
          <WindGusts x={footX} y={footY} T={T} weight={weights.wind} />
          <AuraFlames
            x={footX}
            y={footY}
            w={body.w}
            T={T}
            amount={auraAmount}
            weight={weights.flame}
          />
          <LightningArcs
            x={body.x}
            y={body.y}
            w={body.w}
            T={T}
            weight={weights.lightning}
          />
        </>
      ) : (
        // The div-only scene. Its gold blobs and spinning corona stand in for
        // the rock and the flame aura, so they are not drawn alongside them.
        <>
          <GroundCrackRing x={footX} y={footY} T={T} />
          <RisingDebris x={footX} y={footY} T={T} />
          <GoldAuraFlare
            x={body.x}
            y={body.y}
            w={body.w}
            T={T}
            amount={auraAmount}
          />
        </>
      )}
      <GoldPillar x={footX} y={footY} T={T} />
    </div>
  );
}

export function PetFightStage({
  T,
  left,
  right,
  winner,
  sceneSrc,
  shakeMul = 1,
  speech = [],
  finale = "beam",
  transform = true,
  powerUp,
}: PetFightStageProps) {
  const spec = finaleSpec(finale);
  const pu = powerUpSpec(powerUp);
  // Which corner the camera is on — mirrored for a right-hand winner and
  // pushed onto the transforming pet. See lib/pet-fight/camera.ts.
  const { s: camS, fx: camFx, fy: camFy } = frameAt(T, winner, transform);
  let shx = 0;
  let shy = 0;
  for (const [t0, amp, dur] of SHAKES) {
    const [x, y] = shakeAt(T, t0, amp, dur);
    shx += x * shakeMul;
    shy += y * shakeMul;
  }
  for (const [t0, amp, dur] of spec.shakes) {
    const [x, y] = shakeAt(T, t0, amp, dur);
    shx += x * shakeMul;
    shy += y * shakeMul;
  }
  // Sustained rumble: the ground going, then the finisher landing.
  const rumbleOn =
    (transform && T >= BEAT.quake && T <= BEAT.flash) ||
    (winner !== "draw" && T >= BEAT.release + 0.15 && T <= BEAT.ko - 0.4);
  if (rumbleOn) {
    const rumble = 6 + Math.sin(T * 40) * 4;
    shx += Math.sin(T * 55) * rumble * shakeMul;
    shy += Math.cos(T * 47) * rumble * 0.7 * shakeMul;
  }

  const leftPowers = transform && transformsSide("left", winner);
  const rightPowers = transform && transformsSide("right", winner);
  const powered = poweredAmount(T);
  const leftPowered = leftPowers ? powered : 0;
  const rightPowered = rightPowers ? powered : 0;

  const worldTf = `translate(${960 - camFx * camS + shx}px,${540 - camFy * camS + shy}px) scale(${camS})`;
  const dark = track(T, DARK, ["v"]).v!;
  // Two thumps while the charge peaks, just before the finisher fires.
  const heart = Math.max(
    pulse(T, BEAT.release - 0.65, 0.4),
    pulse(T, BEAT.release - 0.2, 0.4)
  );
  const whiteFlash = Math.max(
    // The power-up burst — the biggest white-out in the fight.
    transform ? pulse(T, BEAT.flash, 0.22) * 1.0 : 0,
    pulse(T, BEAT.impact, 0.16) * 0.85,
    pulse(T, BEAT.impact + 0.75, 0.13) * 0.92,
    pulse(T, BEAT.ko + 0.15, 0.18) * 1.0
  );
  let impFlash = 0;
  for (const imp of IMPACTS) {
    const frame = pulse(T, imp.t, 0.12 + imp.power * 0.025);
    impFlash = Math.max(impFlash, frame * (0.42 + imp.power * 0.34));
  }

  const leftPose = poseFor(T, "left", winner);
  const rightPose = poseFor(T, "right", winner);
  const winnerCast = winner === "right" ? right : left;
  const winnerFade = winner === "draw" ? 1 : winnerOpacity(finale, T);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={powerUpVars(pu) as CSSProperties}
    >
      <SceneBackdrop
        src={sceneSrc}
        scale={camS}
        fx={camFx}
        fy={camFy}
        shx={shx}
        shy={shy}
      />
      {transform && FX_ART_READY && (
        <StormSky T={T} fx={camFx} fy={camFy} />
      )}
      <div
        style={{
          position: "absolute",
          width: W,
          height: H,
          left: 0,
          top: 0,
          transformOrigin: "0 0",
          transform: worldTf,
          willChange: "transform",
        }}
      >
        <div
          style={groundShadowStyle(
            { dx: leftPose.dx, dy: leftPose.dy, sc: leftPose.sc },
            CAT
          )}
        />
        <div
          style={groundShadowStyle(
            { dx: rightPose.dx, dy: rightPose.dy, sc: rightPose.sc },
            DRA
          )}
        />
        {leftPowers && (
          <TransformScene
            T={T}
            side="left"
            winner={winner}
            weights={pu.weights}
            opacity={winner === "left" ? winnerFade : 1}
          />
        )}
        {rightPowers && (
          <TransformScene
            T={T}
            side="right"
            winner={winner}
            weights={pu.weights}
            opacity={winner === "right" ? winnerFade : 1}
          />
        )}
        <ImpactReactions
          T={T}
          winner={winner}
          left={left}
          right={right}
          layer="ground"
        />
        <ClashWind T={T} winner={winner} />
        <Fighter
          T={T}
          side="left"
          cast={left}
          winner={winner}
          powered={leftPowered}
          opacity={winner === "left" ? winnerFade : 1}
        />
        <Fighter
          T={T}
          side="right"
          cast={right}
          winner={winner}
          powered={rightPowered}
          opacity={winner === "right" ? winnerFade : 1}
        />
        <Projectile T={T} fromLeft cast={left} />
        <Projectile T={T} fromLeft={false} cast={right} />
        <ChargeOrb
          T={T}
          side="left"
          cast={left}
          winner={winner}
          powered={leftPowered}
        />
        <ChargeOrb
          T={T}
          side="right"
          cast={right}
          winner={winner}
          powered={rightPowered}
        />
        <FinaleVisual finale={finale} T={T} winner={winner} cast={winnerCast} />
        {/* Nothing detonates in a draw — neither pet lands their finisher, so
            the centre blast and the aftermath haze would have no cause. */}
        {winner !== "draw" && finale === "beam" && <Explosion T={T} />}
        {winner !== "draw" && <Smoke T={T} />}
        <ImpactReactions
          T={T}
          winner={winner}
          left={left}
          right={right}
          layer="air"
        />
        {IMPACTS.map((imp) => {
          const s = pulse(T, imp.t, 0.32 + imp.power * 0.025);
          if (s <= 0) return null;
          return (
            <StarBurst
              key={imp.t}
              x={imp.star.x}
              y={imp.star.y}
              size={imp.star.size}
              scale={0.5 + s * 0.7}
              label={imp.star.label}
              color={(imp.by === "left" ? left : right).starColor}
            />
          );
        })}
        {/* Gold star behind the pet at the moment it breaks through. */}
        {transform && pulse(T, BEAT.flash, 0.4) > 0 && (
          <StarBurst
            x={anchorOf(T, winner === "right" ? "right" : "left", winner).x}
            y={anchorOf(T, winner === "right" ? "right" : "left", winner).y}
            size={460}
            scale={0.4 + pulse(T, BEAT.flash, 0.4) * 0.8}
            color={pu.mid}
          />
        )}
        {winner !== "draw" && pulse(T, BEAT.ko, 0.5) > 0 && (
          <StarBurst
            x={winner === "left" ? 760 : 1160}
            y={540}
            size={360}
            scale={0.5 + pulse(T, BEAT.ko, 0.5) * 0.7}
            label={spec.starLabel}
            color={spec.starColor}
          />
        )}
      </div>

      {transform && FX_ART_READY && <GodRays T={T} />}
      <ScreenDarken opacity={dark} />
      <ScreenVignette />
      <HeartbeatPulse amount={heart} />

      {T >= 0.7 && T <= 2.8 && (
        <ComicText
          style={{
            fontSize: 150,
            color: "#ffe14d",
            opacity: clamp((2.75 - T) / 0.25, 0, 1),
            transform: `scale(${2.2 - easeOutBack(clamp((T - 0.7) / 0.32, 0, 1)) * 1.2})`,
            textShadow: "0 8px 0 #b23, 0 0 60px rgba(255,120,60,0.8)",
            WebkitTextStroke: "4px #7a1020",
          }}
        >
          FIGHT!
        </ComicText>
      )}

      {transform && T >= BEAT.banner && T <= BEAT.levelBanner + 0.15 && (
        <ComicText
          style={{
            fontSize: 130,
            color: pu.bannerColor,
            opacity: clamp((BEAT.levelBanner + 0.1 - T) / 0.25, 0, 1),
            transform: `translateY(-40px) scale(${
              2.4 - easeOutBack(clamp((T - BEAT.banner) / 0.26, 0, 1)) * 1.4
            })`,
            textShadow: `0 10px 0 ${pu.bannerShadow}, 0 0 70px ${pu.aura}`,
            WebkitTextStroke: `5px ${pu.bannerStroke}`,
          }}
        >
          {pu.banner}
        </ComicText>
      )}

      {transform && T >= BEAT.levelBanner && T <= 20.0 && (
        <ComicText
          style={{
            fontSize: 104,
            color: "#7dffd4",
            opacity: clamp((19.9 - T) / 0.3, 0, 1),
            transform: `translateY(70px) scale(${
              2.0 - easeOutBack(clamp((T - BEAT.levelBanner) / 0.26, 0, 1)) * 1.0
            })`,
            textShadow: "0 8px 0 #0a4a3a, 0 0 50px rgba(80,255,200,0.85)",
            WebkitTextStroke: "4px #063528",
          }}
        >
          LEVEL UP!
        </ComicText>
      )}

      {winner !== "draw" && T >= BEAT.release && T <= BEAT.release + 1.05 && (
        <ComicText
          style={{
            fontSize: 110,
            color: "#7dffd4",
            opacity: clamp((BEAT.release + 1.0 - T) / 0.3, 0, 1),
            transform: `scale(${
              2.4 - easeOutBack(clamp((T - BEAT.release) / 0.28, 0, 1)) * 1.4
            })`,
            textShadow: "0 8px 0 #0a4a3a, 0 0 50px rgba(80,255,200,0.85)",
            WebkitTextStroke: "4px #063528",
          }}
        >
          SUPER!
        </ComicText>
      )}

      {IMPACTS.map((imp) => {
        if (!imp.shout) return null;
        const s = pulse(T, imp.t, 0.42);
        if (s <= 0) return null;
        const combo = imp.shout.text === "COMBO!";
        const sc = 0.6 + easeOutBack(clamp((T - imp.t) / 0.18, 0, 1)) * 0.7;
        return (
          <div
            key={imp.t}
            className="font-arcade pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translate(${imp.shout.x}px,-120px) scale(${sc})`,
              fontSize: combo ? 120 : 96,
              color: combo ? "#ff5ec7" : "#fff",
              opacity: Math.min(1, s * 2),
              textShadow:
                "0 6px 0 rgba(0,0,0,0.4), 0 0 40px rgba(255,180,80,0.7)",
              WebkitTextStroke: "3px #2a1030",
            }}
          >
            {imp.shout.text}
          </div>
        );
      })}

      <FinaleText
        T={T}
        shx={shx}
        shy={shy}
        winner={winner}
        leftName={left.name}
        rightName={right.name}
        finale={finale}
      />
      <WhiteFlash opacity={Math.max(whiteFlash, impFlash)} />

      {/* Speech bubbles — screen-space so camera cuts don't fling them away */}
      {speech.map((line, i) => {
        if (T < line.from || T >= line.to) return null;
        const isLeft = line.side === "left";
        return (
          <div
            key={i}
            className="pointer-events-none absolute z-[15] max-w-[17rem] rounded-card bg-surface px-4 py-2 text-center font-display text-base font-extrabold leading-tight text-paper-900 shadow-float sm:max-w-[24rem] sm:text-lg lg:text-2xl"
            style={{
              left: isLeft ? "6%" : "auto",
              right: isLeft ? "auto" : "6%",
              bottom: "22%",
              opacity: Math.min(
                1,
                (T - line.from) * 6,
                (line.to - T) * 4
              ),
            }}
          >
            “{line.text}”
          </div>
        );
      })}
    </div>
  );
}

export function demoCasts(): { left: FightCast; right: FightCast } {
  return {
    left: {
      name: "Purr Pop",
      spriteSrc: "/pets/cat/adult.png",
      aura: CAT_AURA,
      starColor: STAR_CAT,
      tint: "rgba(214,140,255,0.9)",
    },
    right: {
      name: "Dragon Flame",
      spriteSrc: "/pets/dragon/adult.png",
      aura: DRA_AURA,
      starColor: STAR_DRA,
      projectileSrc: "/pets/effects/fire.png",
      tint: "rgba(255,150,60,0.95)",
    },
  };
}

export { CAT_AURA, DRA_AURA, STAR_CAT, STAR_DRA };
