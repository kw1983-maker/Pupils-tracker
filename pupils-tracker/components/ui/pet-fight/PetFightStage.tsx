"use client";

/**
 * Parameterized storyboard fight stage — same 25s choreography as the handoff,
 * driven by clock T, with any two pet sprites and a real winner.
 */

import { type CSSProperties, type ReactNode } from "react";
import {
  CAT,
  CAT_AURA,
  CAT_KF,
  CAM,
  COMBO_HITS,
  DARK,
  DRA,
  DRA_AURA,
  DRA_KF,
  H,
  SHAKES,
  STAR_CAT,
  STAR_DRA,
  STAR_KO,
  W,
} from "@/lib/pet-fight/storyboard";
import {
  clamp,
  easeInCubic,
  easeOutBack,
  lerpAt,
  pulse,
  shakeAt,
  track,
  type Keyframe,
} from "@/lib/pet-fight/timing";
import {
  ComicText,
  HeartbeatPulse,
  ScreenDarken,
  ScreenVignette,
  StarBurst,
  WhiteFlash,
} from "@/components/ui/pet-fight/FightFx";

export type FightWinner = "left" | "right" | "draw";

export type FightCast = {
  name: string;
  spriteSrc: string;
  /** Aura / charge colour */
  aura: string;
  starColor: string;
  /** Projectile art; when missing, a tinted energy orb is used */
  projectileSrc?: string;
  tint: string;
};

/** On-screen speech bubble timed to clock T (seconds). */
export type FightSpeechLine = {
  side: "left" | "right";
  text: string;
  from: number;
  to: number;
};

export type PetFightStageProps = {
  T: number;
  left: FightCast;
  right: FightCast;
  winner: FightWinner;
  sceneSrc: string;
  shakeMul?: number;
  speech?: FightSpeechLine[];
};

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
 * Storyboard: left=hero (CAT_KF), right=foe (DRA_KF).
 * When right wins, swap those tracks and mirror X so each stays on their side.
 * Draw: freeze both before the KO fall (hold pose at T=22).
 */
function poseFor(
  T: number,
  side: "left" | "right",
  winner: FightWinner
): { dx: number; dy: number; rot: number; sc: number; isHero: boolean } {
  const tPose = winner === "draw" && T > 22 ? 22 : T;
  const leftIsHero = winner !== "right";
  const isHero = side === "left" ? leftIsHero : !leftIsHero;
  const kf: Keyframe[] = isHero ? CAT_KF : DRA_KF;
  const m = track(tPose, kf, ["dx", "dy", "rot", "sc"]);
  // Hero track assumes left (+dx toward foe). Foe track assumes right (+dx away).
  // When roles are swapped (right wins), mirror both onto their corners.
  if (winner === "right") {
    return {
      dx: -(m.dx ?? 0),
      dy: m.dy ?? 0,
      rot: -(m.rot ?? 0),
      sc: m.sc ?? 1,
      isHero,
    };
  }
  return {
    dx: m.dx ?? 0,
    dy: m.dy ?? 0,
    rot: m.rot ?? 0,
    sc: m.sc ?? 1,
    isHero,
  };
}

function Fighter({
  T,
  side,
  cast,
  winner,
}: {
  T: number;
  side: "left" | "right";
  cast: FightCast;
  winner: FightWinner;
}) {
  const base = side === "left" ? CAT : DRA;
  const pose = poseFor(T, side, winner);
  const isLeft = side === "left";

  let idleRot = 0;
  let idleDy = 0;
  let idleSc = 0;
  if (T < 3) {
    idleRot = Math.sin(T * 3) * (isLeft ? 2.6 : 1.2);
    idleSc = Math.sin(T * 2.4) * 0.02;
  }
  const celebrating =
    winner !== "draw" &&
    ((winner === "left" && isLeft) || (winner === "right" && !isLeft));
  if (celebrating && T > 24) {
    idleDy = -Math.abs(Math.sin((T - 24) * 5.5)) * 34;
  }

  const dx = pose.dx;
  const dy = pose.dy + idleDy;
  const rot = pose.rot + idleRot;
  const sc = pose.sc + idleSc;

  const lost =
    winner !== "draw" &&
    ((winner === "left" && !isLeft) || (winner === "right" && isLeft));
  const auraOn = clamp((T - 0.5) / 0.6, 0, 1) * (T > 22.9 && lost ? 0 : 1);
  const orbs = aura(
    T,
    cast.aura,
    isLeft ? 7 : 6,
    isLeft ? 150 : 165,
    isLeft ? 0 : 2.1,
    auraOn
  );

  let glow = 0;
  if (isLeft) {
    glow = Math.max(
      pulse(T, 0.4, 2.6) * 0.7,
      clamp((T - 15.4) / 0.8, 0, 1) * clamp((18.6 - T) / 0.3, 0, 1)
    );
  } else {
    glow = Math.max(
      clamp((T - 7.0) / 0.5, 0, 1) * clamp((7.9 - T) / 0.3, 0, 1),
      clamp((T - 15.4) / 0.8, 0, 1) * clamp((18.6 - T) / 0.3, 0, 1)
    );
  }
  // Winner keeps glowing while pouring the last-resort stream.
  if (
    celebrating &&
    T >= 18.55 &&
    T <= 22.6
  ) {
    glow = Math.max(glow, 0.55 + Math.sin(T * 18) * 0.2);
  }

  return (
    <div
      style={{
        position: "absolute",
        left: base.x,
        top: base.y,
        width: base.w,
        height: base.w,
        transform: `translate(-50%,-100%) translate(${dx}px,${dy}px) rotate(${rot}deg) scale(${sc})`,
        transformOrigin: "50% 100%",
      }}
    >
      {orbs}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: isLeft ? "78%" : "58%",
          width: 130,
          height: 130,
          marginLeft: isLeft ? -65 : -120,
          marginTop: -65,
          borderRadius: "50%",
          background: `radial-gradient(circle,${cast.tint},transparent 70%)`,
          opacity: glow,
          filter: "blur(2px)",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cast.spriteSrc}
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          transform: isLeft ? "scaleX(-1)" : "none",
          filter: "drop-shadow(0 12px 10px rgba(0,0,0,0.4))",
        }}
      />
    </div>
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
}: {
  T: number;
  side: "left" | "right";
  cast: FightCast;
  winner: FightWinner;
}) {
  // Dual charge winds up; at 18.55 the winner fires a continuous stream instead
  // of both orbs meeting in the middle (Dragon Ball last-resort beat).
  if (T < 15.4 || T > 18.58) return null;
  if (winner !== "draw" && side !== winner && T > 18.45) return null;
  const isLeft = side === "left";
  const grow = clamp((T - 15.4) / 3.0, 0, 1);
  const homeX = isLeft ? 560 : 1180;
  const homeY = isLeft ? 320 : 540;
  const sz = 40 + grow * 230;
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
        background: `radial-gradient(circle at 36% 30%,#fff,${cast.tint} 45%,transparent 100%)`,
        boxShadow: `0 0 ${sz * 0.6}px ${sz * 0.28}px ${cast.tint}`,
      }}
    />
  );
}

/**
 * Dragon Ball–style last resort: winner pours a continuous stream of their
 * power into the foe from the charge release (~18.55) through the push-back
 * (~22.5), then yields to the K.O. star.
 */
function FinaleBeam({
  T,
  winner,
  cast,
}: {
  T: number;
  winner: FightWinner;
  cast: FightCast;
}) {
  if (winner === "draw") return null;
  if (T < 18.55 || T > 22.65) return null;

  const fromSide = winner;
  const toSide: "left" | "right" = winner === "left" ? "right" : "left";
  const fromPose = poseFor(T, fromSide, winner);
  const toPose = poseFor(T, toSide, winner);
  const fromBase = fromSide === "left" ? CAT : DRA;
  const toBase = toSide === "left" ? CAT : DRA;

  const x1 = fromBase.x + fromPose.dx;
  const y1 = fromBase.y + fromPose.dy - fromBase.w * 0.48;
  const x2 = toBase.x + toPose.dx;
  const y2 = toBase.y + toPose.dy - toBase.w * 0.42;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 8) return null;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  const fadeIn = clamp((T - 18.55) / 0.22, 0, 1);
  const fadeOut = clamp((22.65 - T) / 0.3, 0, 1);
  const hit = clamp((T - 19.0) / 0.2, 0, 1);
  const opacity = fadeIn * fadeOut;
  const pulseW = 1 + Math.sin(T * 32) * 0.14;
  const thickness = (55 + hit * 50) * pulseW;
  const tint = cast.tint;

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x1,
          top: y1,
          width: len,
          height: thickness * 2.4,
          marginTop: (-thickness * 2.4) / 2,
          transformOrigin: "0 50%",
          transform: `rotate(${angle}deg)`,
          opacity: opacity * 0.55,
          borderRadius: thickness,
          background: `linear-gradient(90deg,${tint},rgba(255,255,255,0.35) 40%,${tint})`,
          filter: "blur(10px)",
          boxShadow: `0 0 40px 16px ${tint}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x1,
          top: y1,
          width: len,
          height: thickness,
          marginTop: -thickness / 2,
          transformOrigin: "0 50%",
          transform: `rotate(${angle}deg)`,
          opacity,
          borderRadius: thickness,
          background: `linear-gradient(90deg,#ffffff 0%,${tint} 28%,#ffffff 55%,${tint} 100%)`,
          boxShadow: `0 0 ${thickness}px ${thickness * 0.35}px ${tint}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x1,
          top: y1,
          width: len,
          height: thickness * 0.28,
          marginTop: (-thickness * 0.28) / 2,
          transformOrigin: "0 50%",
          transform: `rotate(${angle}deg)`,
          opacity: opacity * 0.95,
          borderRadius: thickness,
          background:
            "linear-gradient(90deg,rgba(255,255,255,0.2),#fff 30%,#fff 70%,rgba(255,255,255,0.2))",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x1,
          top: y1,
          width: 90 + hit * 40,
          height: 90 + hit * 40,
          marginLeft: -(90 + hit * 40) / 2,
          marginTop: -(90 + hit * 40) / 2,
          borderRadius: "50%",
          opacity,
          background: `radial-gradient(circle,#fff,${tint} 45%,transparent 72%)`,
          boxShadow: `0 0 50px 24px ${tint}`,
        }}
      />
      {hit > 0 && (
        <div
          style={{
            position: "absolute",
            left: x2,
            top: y2,
            width: 160 + hit * 120,
            height: 160 + hit * 120,
            marginLeft: -(160 + hit * 120) / 2,
            marginTop: -(160 + hit * 120) / 2,
            borderRadius: "50%",
            opacity: opacity * hit * (0.7 + Math.sin(T * 40) * 0.2),
            background: `radial-gradient(circle,#fff 0%,${tint} 40%,transparent 70%)`,
            boxShadow: `0 0 80px 40px ${tint}`,
          }}
        />
      )}
      {Array.from({ length: 8 }, (_, i) => {
        const cycle = (T * 2.8 + i * 0.13) % 1;
        const px = x1 + dx * cycle;
        const py = y1 + dy * cycle;
        const psz = 28 + (i % 3) * 14 + Math.sin(T * 20 + i) * 6;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px,
              top: py,
              width: psz,
              height: psz,
              marginLeft: -psz / 2,
              marginTop: -psz / 2,
              borderRadius: "50%",
              opacity: opacity * (0.45 + 0.4 * Math.sin(T * 18 + i)),
              background: `radial-gradient(circle,#fff,${tint} 55%,transparent 100%)`,
              boxShadow: `0 0 ${psz}px ${psz * 0.4}px ${tint}`,
            }}
          />
        );
      })}
      {cast.projectileSrc &&
        [0.25, 0.5, 0.75].map((u, i) => {
          const cycle = (u + ((T * 1.6) % 1)) % 1;
          const px = x1 + dx * cycle;
          const py = y1 + dy * cycle;
          const psz = 70 + i * 10;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`beam-art-${i}`}
              src={cast.projectileSrc}
              alt=""
              style={{
                position: "absolute",
                left: px,
                top: py,
                width: psz,
                height: psz,
                marginLeft: -psz / 2,
                marginTop: -psz / 2,
                opacity: opacity * 0.85,
                transform: `rotate(${angle + T * 180}deg)`,
                filter: `drop-shadow(0 0 24px ${tint})`,
              }}
            />
          );
        })}
    </>
  );
}

function Explosion({ T }: { T: number }) {
  // Soft tip-blast when the stream locks on — no longer a mutual center clash.
  if (T < 19.0 || T > 19.7) return null;
  const g = clamp((T - 19.0) / 0.25, 0, 1);
  const hold = clamp((19.7 - T) / 0.35, 0, 1);
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
  if (T < 19.5 || T > 21.4) return null;
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => {
        const p = clamp((T - (19.5 + i * 0.08)) / 1.6, 0, 1);
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
}: {
  T: number;
  shx: number;
  shy: number;
  winner: FightWinner;
  leftName: string;
  rightName: string;
}) {
  if (winner === "draw") {
    if (T < 23.2) return null;
    const s = clamp((T - 23.2) / 0.22, 0, 1);
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

  const ko =
    T >= 23.2 && T <= 25 ? (
      <div
        className="font-arcade pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{
          opacity: clamp((24.35 - T) / 0.35, 0, 1),
          transform: `translate(${shx * 0.6}px,${-190 + shy * 0.6}px) scale(${
            (3.0 - easeOutBack(clamp((T - 23.2) / 0.22, 0, 1)) * 2.0) *
            (1 +
              Math.sin(Math.max(0, T - 23.4) * 8) *
                0.02 *
                Math.max(0, 1 - (T - 23.4)))
          })`,
          fontSize: 280,
          color: "#ffe14d",
          textShadow: "0 14px 0 #b21e2a, 0 0 90px rgba(255,120,40,0.9)",
          WebkitTextStroke: "8px #6d0f18",
        }}
      >
        K.O.!
      </div>
    ) : null;

  const name = winner === "left" ? leftName : rightName;
  const wins =
    T >= 24.0 ? (
      <div
        className="font-arcade pointer-events-none absolute bottom-[90px] left-0 right-0 flex justify-center"
        style={{
          transform: `scale(${1.6 - easeOutBack(clamp((T - 24.0) / 0.3, 0, 1)) * 0.6})`,
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

export function PetFightStage({
  T,
  left,
  right,
  winner,
  sceneSrc,
  shakeMul = 1,
  speech = [],
}: PetFightStageProps) {
  const cam = track(T, CAM, ["s", "fx", "fy"]);
  let shx = 0;
  let shy = 0;
  for (const [t0, amp, dur] of SHAKES) {
    const [x, y] = shakeAt(T, t0, amp, dur);
    shx += x * shakeMul;
    shy += y * shakeMul;
  }
  // Sustained rumble while the last-resort beam is pouring.
  if (winner !== "draw" && T >= 18.7 && T <= 22.5) {
    const rumble = 6 + Math.sin(T * 40) * 4;
    shx += Math.sin(T * 55) * rumble * shakeMul;
    shy += Math.cos(T * 47) * rumble * 0.7 * shakeMul;
  }
  const worldTf = `translate(${960 - cam.fx! * cam.s! + shx}px,${540 - cam.fy! * cam.s! + shy}px) scale(${cam.s})`;
  const dark = track(T, DARK, ["v"]).v!;
  const heart = Math.max(pulse(T, 17.9, 0.4), pulse(T, 18.35, 0.4));
  const whiteFlash = Math.max(
    pulse(T, 19.05, 0.16) * 0.85,
    pulse(T, 19.8, 0.13) * 0.92,
    pulse(T, 23.05, 0.18) * 1.0
  );
  let impFlash = Math.max(pulse(T, 4.5, 0.14), pulse(T, 8.85, 0.14)) * 0.55;
  for (const h of COMBO_HITS) {
    impFlash = Math.max(impFlash, pulse(T, h.t, 0.12) * 0.4);
  }

  const leftPose = poseFor(T, "left", winner);
  const rightPose = poseFor(T, "right", winner);

  // Camera pans/zooms used to flash the stage's black fill at the edges —
  // oversize the scene well past the worst CAM keyframes (+ shake/rumble).
  const SCENE_BLEED_X = 520;
  const SCENE_BLEED_Y = 360;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        // Night-sky fill so any leftover edge matches the meadow scene, not black.
        background:
          "radial-gradient(ellipse at 50% 35%, #1a2a4a 0%, #0b1424 55%, #050814 100%)",
      }}
    >
      {/* Fixed underlay — same art, always covers the viewport if the camera
          pulls past the world scene's bleed. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sceneSrc}
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
        }}
      />
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sceneSrc}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            left: -SCENE_BLEED_X,
            top: -SCENE_BLEED_Y,
            width: W + SCENE_BLEED_X * 2,
            height: H + SCENE_BLEED_Y * 2,
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
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
        <Fighter T={T} side="left" cast={left} winner={winner} />
        <Fighter T={T} side="right" cast={right} winner={winner} />
        <Projectile T={T} fromLeft cast={left} />
        <Projectile T={T} fromLeft={false} cast={right} />
        <ChargeOrb T={T} side="left" cast={left} winner={winner} />
        <ChargeOrb T={T} side="right" cast={right} winner={winner} />
        <FinaleBeam
          T={T}
          winner={winner}
          cast={winner === "right" ? right : left}
        />
        <Explosion T={T} />
        <Smoke T={T} />
        {COMBO_HITS.map((h, i) => {
          const s = pulse(T, h.t, 0.32);
          if (s <= 0) return null;
          const color = h.side === "cat" ? left.starColor : right.starColor;
          return (
            <StarBurst
              key={i}
              x={h.x}
              y={h.y}
              size={230}
              scale={0.5 + s * 0.7}
              label={h.label}
              color={color}
            />
          );
        })}
        {pulse(T, 4.5, 0.34) > 0 && (
          <StarBurst
            x={1280}
            y={590}
            size={300}
            scale={0.5 + pulse(T, 4.5, 0.34) * 0.7}
            label="POW"
            color={left.starColor}
          />
        )}
        {pulse(T, 8.85, 0.34) > 0 && (
          <StarBurst
            x={620}
            y={580}
            size={300}
            scale={0.5 + pulse(T, 8.85, 0.34) * 0.7}
            label="KRAK"
            color={right.starColor}
          />
        )}
        {winner !== "draw" && pulse(T, 22.9, 0.5) > 0 && (
          <StarBurst
            x={winner === "left" ? 760 : 1160}
            y={540}
            size={360}
            scale={0.5 + pulse(T, 22.9, 0.5) * 0.7}
            label="K.O"
            color={STAR_KO}
          />
        )}
      </div>

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

      {winner !== "draw" && T >= 18.55 && T <= 19.6 && (
        <ComicText
          style={{
            fontSize: 110,
            color: "#7dffd4",
            opacity: clamp((19.55 - T) / 0.3, 0, 1),
            transform: `scale(${
              2.4 - easeOutBack(clamp((T - 18.55) / 0.28, 0, 1)) * 1.4
            })`,
            textShadow: "0 8px 0 #0a4a3a, 0 0 50px rgba(80,255,200,0.85)",
            WebkitTextStroke: "4px #063528",
          }}
        >
          SUPER!
        </ComicText>
      )}

      {[
        { t: 11.6, x: -140, txt: "HIT!" },
        { t: 12.2, x: 160, txt: "HIT!" },
        { t: 12.9, x: -40, txt: "COMBO!" },
        { t: 13.6, x: 180, txt: "HIT!" },
        { t: 14.3, x: 0, txt: "COMBO!" },
      ].map((l, i) => {
        const s = pulse(T, l.t, 0.42);
        if (s <= 0) return null;
        const sc = 0.6 + easeOutBack(clamp((T - l.t) / 0.18, 0, 1)) * 0.7;
        return (
          <div
            key={i}
            className="font-arcade pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translate(${l.x}px,-120px) scale(${sc})`,
              fontSize: l.txt === "COMBO!" ? 120 : 96,
              color: l.txt === "COMBO!" ? "#ff5ec7" : "#fff",
              opacity: Math.min(1, s * 2),
              textShadow:
                "0 6px 0 rgba(0,0,0,0.4), 0 0 40px rgba(255,180,80,0.7)",
              WebkitTextStroke: "3px #2a1030",
            }}
          >
            {l.txt}
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
