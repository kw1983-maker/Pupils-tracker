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
}: {
  T: number;
  side: "left" | "right";
  cast: FightCast;
}) {
  if (T < 15.4 || T > 19.02) return null;
  const isLeft = side === "left";
  const grow = clamp((T - 15.4) / 3.0, 0, 1);
  const launch = clamp((T - 18.55) / 0.45, 0, 1);
  const homeX = isLeft ? 560 : 1180;
  const homeY = isLeft ? 320 : 540;
  const x = homeX + (960 - homeX) * easeInCubic(launch);
  const y = homeY + (540 - homeY) * easeInCubic(launch);
  const sz = (40 + grow * 230) * (1 + launch * 0.15);
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
        transform: `rotate(${T * (isLeft ? 300 : -340)}deg)`,
        background: `radial-gradient(circle at 36% 30%,#fff,${cast.tint} 45%,transparent 100%)`,
        boxShadow: `0 0 ${sz * 0.6}px ${sz * 0.28}px ${cast.tint}`,
      }}
    />
  );
}

function Explosion({ T }: { T: number }) {
  if (T < 19.0 || T > 20.5) return null;
  const g = clamp((T - 19.0) / 0.4, 0, 1);
  const hold = T < 19.8 ? 1 : clamp((20.5 - T) / 0.7, 0, 1);
  const sz = 260 + g * 620;
  return (
    <>
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
          transform: `rotate(${T * 120}deg)`,
          opacity: hold,
          background:
            "radial-gradient(circle,#ffffff 0%,#fff2c0 22%,#ff9a3c 48%,rgba(214,120,255,0.85) 72%,rgba(120,40,200,0) 100%)",
          boxShadow: "0 0 120px 60px rgba(255,180,80,0.8)",
        }}
      />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 + T * 0.6;
        const L = sz * 0.62;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 960,
              top: 540,
              width: L,
              height: 26,
              marginTop: -13,
              transformOrigin: "0 50%",
              opacity: hold * 0.9,
              transform: `rotate(${a}rad)`,
              background:
                "linear-gradient(90deg,rgba(255,240,180,0.95),rgba(255,150,50,0) 100%)",
            }}
          />
        );
      })}
    </>
  );
}

function Smoke({ T }: { T: number }) {
  if (T < 19.5 || T > 22.2) return null;
  return (
    <>
      {Array.from({ length: 7 }, (_, i) => {
        const p = clamp((T - (19.5 + i * 0.08)) / 2.4, 0, 1);
        const x = 960 + Math.cos(i * 1.7) * (120 + p * 240);
        const y = 560 - p * 200 + Math.sin(i) * 40;
        const sz = 160 + p * 220;
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
                "radial-gradient(circle,rgba(120,120,130,0.6),rgba(90,90,100,0) 70%)",
              opacity: (1 - p) * 0.8,
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

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#05060c]">
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
          style={{
            position: "absolute",
            left: -60,
            top: -40,
            width: W + 120,
            height: H + 80,
            objectFit: "cover",
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
        <ChargeOrb T={T} side="left" cast={left} />
        <ChargeOrb T={T} side="right" cast={right} />
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
