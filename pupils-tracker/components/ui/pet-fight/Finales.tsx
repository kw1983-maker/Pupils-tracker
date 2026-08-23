"use client";

/**
 * The five finishing moves. One is picked per duel (lib/pet-fight/finales.ts).
 *
 * They share the surrounding choreography — both pets charge from
 * BEAT.chargeStart, the move fires at BEAT.release, connects at BEAT.impact,
 * and the loser is knocked down at BEAT.push/BEAT.ko — so only the window
 * between release and the seconds after impact differs. Everything is drawn
 * from the clock, aimed with anchorOf() so a finisher tracks a pet that is
 * still moving.
 */

import { GOLD_CORE, GOLD_DEEP, GOLD_MID, BEAT } from "@/lib/pet-fight/storyboard";
import {
  anchorOf,
  otherSide,
  type FightCast,
  type FightWinner,
} from "@/lib/pet-fight/poses";
import {
  clamp,
  easeInCubic,
  easeInQuad,
  easeOutCubic,
  lerpAt,
} from "@/lib/pet-fight/timing";
import { StarBurst } from "@/components/ui/pet-fight/FightFx";
import { GoldSpriteTint } from "@/components/ui/pet-fight/TransformFx";
import type { FinaleId } from "@/lib/pet-fight/finales";
import type { ComponentType } from "react";

type VisualProps = {
  T: number;
  /** Never "draw" — the dispatcher bails before rendering. */
  winner: "left" | "right";
  cast: FightCast;
};

/**
 * How visible the winner's own sprite should be. Two finishers take the pet off
 * the board for a moment (meteor leaves the frame, rush is a blur of
 * afterimages); the stage asks before drawing them.
 */
export function winnerOpacity(finale: FinaleId, T: number): number {
  if (finale === "meteor") {
    if (T < 23.55 || T > 24.35) return 1;
    // Off the board from the leap until they bounce back to their corner; the
    // pet the class can see between those beats is the one riding the comet.
    return clamp((23.62 - T) / 0.07, 0, 1) + clamp((T - 24.28) / 0.07, 0, 1);
  }
  if (finale === "rush") {
    if (T < 23.6 || T > 24.62) return 1;
    return clamp((23.66 - T) / 0.06, 0, 1) + clamp((T - 24.55) / 0.07, 0, 1);
  }
  return 1;
}

// ---------------------------------------------------------------------------
// beam — the original Dragon Ball last resort: a continuous stream poured in.
// ---------------------------------------------------------------------------

function BeamFinale({ T, winner, cast }: VisualProps) {
  if (T < BEAT.release || T > 27.65) return null;

  const toSide = otherSide(winner);
  const fromBase = anchorOf(T, winner, winner);
  const toBase = anchorOf(T, toSide, winner);

  const x1 = fromBase.x;
  const y1 = fromBase.y - fromBase.w * 0.03;
  const x2 = toBase.x;
  const y2 = toBase.y + toBase.w * 0.03;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 8) return null;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  const fadeIn = clamp((T - BEAT.release) / 0.22, 0, 1);
  const fadeOut = clamp((27.65 - T) / 0.3, 0, 1);
  const hit = clamp((T - BEAT.impact) / 0.2, 0, 1);
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

// ---------------------------------------------------------------------------
// meteor — the winner leaves the frame and comes back down as a comet.
// ---------------------------------------------------------------------------

function MeteorFinale({ T, winner, cast }: VisualProps) {
  if (T < BEAT.release || T > 26.4) return null;
  const toSide = otherSide(winner);
  const target = anchorOf(T, toSide, winner);
  const from = anchorOf(BEAT.release, winner, winner);
  const mirrored = winner === "left";

  // 1. Launch streak: the winner rips upward out of frame. Held until the
  // comet is on screen, or there is a beat where the winner has simply gone.
  const launch = T >= BEAT.release && T <= 23.98;
  // 2. Descent: they come back down inside a fireball, onto the loser. Given a
  // full 0.3s — at 0.2s the dive was over before a class could see who it was.
  const fall = T >= 23.75 && T <= BEAT.impact;
  // 3. Crater + dust.
  const land = clamp((T - BEAT.impact) / 0.22, 0, 1);
  const landFade = clamp((26.4 - T) / 1.1, 0, 1);

  const fallP = clamp((T - 23.75) / (BEAT.impact - 23.75), 0, 1);
  // Comes in at a slant so the dive reads as an arc, not a lift shaft.
  // easeInQuad rather than cubic: a cubic drop left the comet above the frame
  // for four fifths of the window and it appeared out of nowhere at the end.
  const cx = lerpAt(T, 23.75, BEAT.impact, target.x + 300, target.x, easeInQuad);
  const cy = lerpAt(T, 23.75, BEAT.impact, -360, target.y, easeInQuad);
  const csz = 120 + fallP * 120;
  // Sized from the WINNER, not the target — a cat diving onto a dragon was
  // coming down bigger than the dragon it was landing on.
  const petSz = from.w * (0.8 + fallP * 0.25);

  return (
    <>
      {launch && (
        <div
          style={{
            position: "absolute",
            left: from.x,
            top: from.y,
            width: 110,
            height: 900,
            marginLeft: -55,
            marginTop: -880,
            borderRadius: 110,
            background: `linear-gradient(180deg,transparent,${GOLD_MID} 55%,#fff)`,
            opacity: clamp((23.98 - T) / 0.32, 0, 1) * 0.85,
            filter: "blur(14px)",
          }}
        />
      )}

      {fall && (
        <>
          {/* Trail: a long blurred capsule leaning with the dive, so it reads
              as a wake rather than the hard-edged slab a plain box gives. */}
          <div
            style={{
              position: "absolute",
              left: cx,
              top: cy,
              width: csz * 0.8,
              height: 1000,
              marginLeft: -(csz * 0.8) / 2,
              marginTop: -980,
              borderRadius: csz,
              transform: "rotate(16deg)",
              transformOrigin: "50% 100%",
              background: `linear-gradient(180deg,transparent,rgba(255,157,28,0.5) 55%,${GOLD_CORE})`,
              opacity: 0.7,
              filter: "blur(20px)",
            }}
          />
          {/* Fireball, then the pet itself inside it — the class has to see
              WHO is coming down, or the winner has simply vanished. */}
          <div
            style={{
              position: "absolute",
              left: cx,
              top: cy,
              width: csz * 2.1,
              height: csz * 2.1,
              marginLeft: -(csz * 2.1) / 2,
              marginTop: -(csz * 2.1) / 2,
              borderRadius: "50%",
              background: `radial-gradient(circle,${GOLD_CORE} 0%,rgba(255,157,28,0.7) 45%,transparent 72%)`,
              filter: "blur(10px)",
              boxShadow: `0 0 ${csz}px ${csz * 0.5}px ${GOLD_DEEP}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: cx,
              top: cy,
              width: petSz,
              marginLeft: -petSz / 2,
              marginTop: -petSz / 2,
              transform: `${mirrored ? "scaleX(-1) " : ""}rotate(${mirrored ? -22 : 22}deg)`,
              filter: `drop-shadow(0 0 40px ${GOLD_MID}) brightness(1.2) saturate(1.3)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cast.spriteSrc}
              alt=""
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        </>
      )}

      {land > 0 && (
        <>
          {/* Crater rings flung outward along the ground. */}
          {[0, 0.14, 0.3].map((delay, i) => {
            const p = clamp((T - BEAT.impact - delay) / 0.7, 0, 1);
            if (p <= 0) return null;
            const rw = 260 + p * 900;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: target.x,
                  top: target.y + target.w * 0.42,
                  width: rw,
                  height: rw * 0.24,
                  marginLeft: -rw / 2,
                  marginTop: -(rw * 0.24) / 2,
                  borderRadius: "50%",
                  border: `${16 - i * 4}px solid ${GOLD_MID}`,
                  opacity: (1 - p) * 0.85 * landFade,
                  boxShadow: `0 0 60px ${GOLD_DEEP}`,
                }}
              />
            );
          })}
          {/* Fire bloom sitting in the crater. */}
          <div
            style={{
              position: "absolute",
              left: target.x,
              top: target.y + target.w * 0.2,
              width: 300 + land * 320,
              height: 300 + land * 320,
              marginLeft: -(300 + land * 320) / 2,
              marginTop: -(300 + land * 320) / 2,
              borderRadius: "50%",
              background: `radial-gradient(circle,#fff 0%,${GOLD_CORE} 25%,rgba(255,120,20,0.6) 55%,transparent 74%)`,
              opacity: landFade * 0.85,
            }}
          />
          {/* Dust plume. */}
          {Array.from({ length: 9 }, (_, i) => {
            const p = clamp((T - BEAT.impact - i * 0.05) / 1.5, 0, 1);
            const px = target.x + Math.cos(i * 1.9) * (90 + p * 320);
            const py = target.y + target.w * 0.3 - p * 230 + Math.sin(i) * 40;
            const sz = 160 + p * 240;
            return (
              <div
                key={`d${i}`}
                style={{
                  position: "absolute",
                  left: px,
                  top: py,
                  width: sz,
                  height: sz,
                  marginLeft: -sz / 2,
                  marginTop: -sz / 2,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle,rgba(180,160,130,0.75),rgba(120,105,85,0) 70%)",
                  opacity: (1 - p) * 0.8 * landFade,
                  filter: "blur(5px)",
                }}
              />
            );
          })}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// rush — the winner blinks around the loser, leaving afterimages, then uppercuts.
// ---------------------------------------------------------------------------

/** Where the winner strikes from on each blink, as offsets from the loser. */
const RUSH_STEPS: Array<{ t: number; dx: number; dy: number }> = [
  { t: 23.7, dx: -300, dy: -40 },
  { t: 23.86, dx: 280, dy: -120 },
  { t: 24.02, dx: -220, dy: -240 },
  { t: 24.18, dx: 300, dy: 60 },
  { t: 24.34, dx: -260, dy: 120 },
  { t: 24.55, dx: -60, dy: 200 },
];

function RushFinale({ T, winner, cast }: VisualProps) {
  if (T < BEAT.release || T > 25.6) return null;
  const toSide = otherSide(winner);
  const target = anchorOf(T, toSide, winner);
  const mirrored = winner === "left";
  const size = anchorOf(T, winner, winner).w;

  return (
    <>
      {RUSH_STEPS.map((step, i) => {
        // Each afterimage appears on its beat and decays over ~0.34s, so at any
        // frame three or four ghosts are visible at once around the loser.
        const age = T - step.t;
        if (age < -0.04 || age > 0.34) return null;
        const fade = clamp(1 - age / 0.34, 0, 1);
        const last = i === RUSH_STEPS.length - 1;
        const gx = target.x + step.dx * (mirrored ? 1 : -1);
        const gy = target.y + step.dy;
        const gs = size * (last ? 1.25 : 1) * (1 + (1 - fade) * 0.12);
        return (
          <div key={i}>
            {/* The pet is golden by now, so its afterimages have to be too —
                untinted copies at low opacity just read as grey smudges. */}
            <div
              style={{
                position: "absolute",
                left: gx,
                top: gy,
                width: gs,
                marginLeft: -gs / 2,
                marginTop: -gs / 2,
                opacity: fade * (last ? 1 : 0.7),
                transform: `${mirrored ? "scaleX(-1)" : ""} rotate(${
                  (i % 2 ? 8 : -8) * (1 - fade)
                }deg)`,
                filter: `drop-shadow(0 0 30px ${GOLD_MID}) brightness(1.1) saturate(1.2)`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cast.spriteSrc}
                alt=""
                style={{ width: "100%", height: "auto", display: "block" }}
              />
              <GoldSpriteTint spriteSrc={cast.spriteSrc} amount={1} T={T} />
            </div>
            {/* Motion streak trailing the ghost back toward the loser. */}
            <div
              style={{
                position: "absolute",
                left: gx,
                top: gy,
                width: Math.hypot(step.dx, step.dy),
                height: 26,
                marginTop: -13,
                transformOrigin: "0 50%",
                transform: `rotate(${
                  (Math.atan2(target.y - gy, target.x - gx) * 180) / Math.PI
                }deg)`,
                borderRadius: 26,
                background: `linear-gradient(90deg,${GOLD_CORE},transparent)`,
                opacity: fade * 0.6,
                filter: "blur(5px)",
              }}
            />
          </div>
        );
      })}

      {RUSH_STEPS.map((step, i) => {
        const age = T - step.t;
        if (age < 0 || age > 0.26) return null;
        const s = 1 - age / 0.26;
        const last = i === RUSH_STEPS.length - 1;
        return (
          <StarBurst
            key={`s${i}`}
            x={target.x + (last ? 0 : step.dx * (mirrored ? 0.35 : -0.35))}
            y={target.y + (last ? -60 : step.dy * 0.35)}
            size={last ? 420 : 200}
            scale={0.5 + s * 0.7}
            label={last ? "K.O" : "HIT"}
            color={last ? GOLD_MID : cast.starColor}
          />
        );
      })}

      {/* The uppercut arc on the last blink. */}
      {T >= 24.55 && T <= 25.2 && (
        <div
          style={{
            position: "absolute",
            left: target.x,
            top: target.y,
            width: 620,
            height: 620,
            marginLeft: -310,
            marginTop: -310,
            borderRadius: "50%",
            border: `14px solid ${GOLD_MID}`,
            borderBottomColor: "transparent",
            borderRightColor: "transparent",
            borderLeftColor: GOLD_CORE,
            opacity: clamp((25.2 - T) / 0.5, 0, 1) * 0.9,
            transform: `rotate(${-40 + (T - 24.55) * 260}deg)`,
            filter: "blur(3px)",
            boxShadow: `0 0 70px ${GOLD_DEEP}`,
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// orb — a spirit bomb raised overhead and thrown.
// ---------------------------------------------------------------------------

function OrbFinale({ T, winner, cast }: VisualProps) {
  if (T < BEAT.release || T > 26.2) return null;
  const toSide = otherSide(winner);
  const from = anchorOf(T, winner, winner);
  const target = anchorOf(T, toSide, winner);
  const tint = cast.tint;

  const charge = clamp((T - BEAT.release) / 0.4, 0, 1);
  const thrown = T >= 23.95;
  const flyP = clamp((T - 23.95) / (BEAT.impact - 23.95), 0, 1);
  const burst = clamp((T - BEAT.impact) / 0.25, 0, 1);
  const burstFade = clamp((26.2 - T) / 1.2, 0, 1);
  // The detonation itself has to die back quickly. Held at full it washed the
  // whole arena pale for over a second and the pets vanished into it.
  const bloomFade = clamp((BEAT.impact + 0.85 - T) / 0.6, 0, 1);

  const hoverX = from.x;
  const hoverY = from.y - 420;
  const ox = thrown ? hoverX + (target.x - hoverX) * easeInCubic(flyP) : hoverX;
  const oy = thrown ? hoverY + (target.y - hoverY) * easeInCubic(flyP) : hoverY;
  const osz = (240 + charge * 460) * (thrown ? 1 - flyP * 0.25 : 1);

  return (
    <>
      {burst < 1 && (
        <>
          {/* Motes streaming up into the sphere while it is being raised. */}
          {!thrown &&
            Array.from({ length: 12 }, (_, i) => {
              const cycle = (T * 1.5 + i * 0.083) % 1;
              const a = i * 2.1;
              const r = (1 - cycle) * 620;
              const px = ox + Math.cos(a) * r;
              const py = oy + Math.sin(a) * r * 0.6 + (1 - cycle) * 240;
              const sz = 18 + (i % 3) * 10;
              return (
                <div
                  key={`m${i}`}
                  style={{
                    position: "absolute",
                    left: px,
                    top: py,
                    width: sz,
                    height: sz,
                    marginLeft: -sz / 2,
                    marginTop: -sz / 2,
                    borderRadius: "50%",
                    background: `radial-gradient(circle,#fff,${tint} 60%,transparent)`,
                    opacity: cycle * 0.9,
                    boxShadow: `0 0 ${sz * 2}px ${tint}`,
                  }}
                />
              );
            })}
          <div
            style={{
              position: "absolute",
              left: ox,
              top: oy,
              width: osz,
              height: osz,
              marginLeft: -osz / 2,
              marginTop: -osz / 2,
              borderRadius: "50%",
              background: `radial-gradient(circle at 38% 32%,#fff,${GOLD_CORE} 22%,${tint} 60%,transparent 100%)`,
              boxShadow: `0 0 ${osz * 0.7}px ${osz * 0.3}px ${tint}`,
              transform: `scale(${1 + Math.sin(T * 26) * 0.04})`,
            }}
          />
        </>
      )}

      {burst > 0 && (
        <>
          <div
            style={{
              position: "absolute",
              left: target.x,
              top: target.y,
              width: 400 + burst * 900,
              height: 400 + burst * 900,
              marginLeft: -(400 + burst * 900) / 2,
              marginTop: -(400 + burst * 900) / 2,
              borderRadius: "50%",
              background: `radial-gradient(circle,#fff 0%,${GOLD_CORE} 25%,${tint} 55%,transparent 76%)`,
              opacity: burstFade * bloomFade * 0.8,
              boxShadow: `0 0 140px 60px ${tint}`,
            }}
          />
          {[0, 0.18, 0.36].map((delay, i) => {
            const p = clamp((T - BEAT.impact - delay) / 1.0, 0, 1);
            if (p <= 0) return null;
            const rs = 300 + p * 1500;
            return (
              <div
                key={`r${i}`}
                style={{
                  position: "absolute",
                  left: target.x,
                  top: target.y,
                  width: rs,
                  height: rs,
                  marginLeft: -rs / 2,
                  marginTop: -rs / 2,
                  borderRadius: "50%",
                  border: `${14 - i * 3}px solid ${GOLD_MID}`,
                  opacity: (1 - p) * 0.6 * burstFade,
                }}
              />
            );
          })}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// skyfall — called down instead of thrown: a pillar of power falls on the foe.
// ---------------------------------------------------------------------------

const SKY = "#e0c2ff";
const SKY_DEEP = "#7b2ff7";
/** Where the column starts, well above the 1080 stage so no top edge shows. */
const SKY_TOP = -520;

function SkyfallFinale({ T, winner, cast }: VisualProps) {
  if (T < BEAT.release || T > 25.9) return null;
  const toSide = otherSide(winner);
  const target = anchorOf(T, toSide, winner);
  const tint = cast.tint;

  // Charge gathers overhead, then the column drops.
  const gather = clamp((T - BEAT.release) / 0.34, 0, 1);
  const dropP = clamp((T - 23.85) / (BEAT.impact - 23.85), 0, 1);
  const hit = clamp((T - BEAT.impact) / 0.18, 0, 1);
  const fade = clamp((25.9 - T) / 0.8, 0, 1);

  // Head of the column travels down; once it lands it stands on the ground at
  // the pet's feet, not in the air above them — a column that stops short reads
  // as a floating capsule rather than something striking the arena.
  const groundY = target.y + target.w * 0.42;
  const headY = SKY_TOP + (groundY - SKY_TOP) * dropP;
  const colW = (70 + gather * 120 + hit * 210) * (1 + Math.sin(T * 34) * 0.08);
  const colH = headY - SKY_TOP;
  // Round while it is still falling (that is the leading head); flat once it
  // has planted itself on the ground.
  const colRadius = `${colW}px ${colW}px ${hit > 0 ? 0 : colW}px ${hit > 0 ? 0 : colW}px`;

  return (
    <>
      {/* Charge gathering in the sky, before anything falls. */}
      {dropP < 1 &&
        Array.from({ length: 10 }, (_, i) => {
          const cycle = (T * 2.2 + i * 0.1) % 1;
          const a = i * 2.3 + T * 2;
          const r = (1 - cycle) * 520;
          const px = target.x + Math.cos(a) * r;
          const py = 150 + Math.sin(a) * r * 0.4;
          const sz = 16 + (i % 3) * 12;
          return (
            <div
              key={`g${i}`}
              style={{
                position: "absolute",
                left: px,
                top: py,
                width: sz,
                height: sz,
                marginLeft: -sz / 2,
                marginTop: -sz / 2,
                borderRadius: "50%",
                background: `radial-gradient(circle,#fff,${SKY} 55%,transparent)`,
                opacity: gather * cycle * 0.9,
                boxShadow: `0 0 ${sz * 2.5}px ${SKY_DEEP}`,
              }}
            />
          );
        })}
      {/* The seal the column falls through. */}
      <div
        style={{
          position: "absolute",
          left: target.x,
          // Kept inside the 1080 stage so the class sees where it comes from.
          top: 150,
          width: 420 + gather * 360,
          height: (420 + gather * 360) * 0.3,
          marginLeft: -(420 + gather * 360) / 2,
          marginTop: -((420 + gather * 360) * 0.3) / 2,
          borderRadius: "50%",
          border: `12px solid ${SKY}`,
          opacity: gather * fade * (dropP < 1 ? 0.8 : 0.45),
          transform: `rotate(${T * 40}deg)`,
          boxShadow: `0 0 70px 20px ${SKY_DEEP}`,
        }}
      />

      {colH > 0 && (
        <>
          {/* Outer haze, core, and hot line — the column itself. */}
          <div
            style={{
              position: "absolute",
              left: target.x,
              top: SKY_TOP,
              width: colW * 2.3,
              height: colH,
              marginLeft: -(colW * 2.3) / 2,
              borderRadius: colRadius,
              background: `linear-gradient(180deg,${SKY_DEEP},${tint} 60%,${SKY_DEEP})`,
              opacity: fade * 0.5,
              filter: "blur(22px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: target.x,
              top: SKY_TOP,
              width: colW,
              height: colH,
              marginLeft: -colW / 2,
              borderRadius: colRadius,
              // Kept violet rather than mostly white — a white column washed
              // out against the flash and read as a blank shape.
              background: `linear-gradient(180deg,${SKY_DEEP} 0%,${SKY} 22%,#fff 46%,${SKY} 74%,${SKY_DEEP} 100%)`,
              opacity: fade,
              boxShadow: `0 0 ${colW}px ${colW * 0.4}px ${SKY_DEEP}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: target.x,
              top: SKY_TOP,
              width: colW * 0.26,
              height: colH,
              marginLeft: -(colW * 0.26) / 2,
              borderRadius: colRadius,
              background: "#fff",
              opacity: fade * 0.95,
            }}
          />
          {/* Sparks racing down the inside of the column. */}
          {Array.from({ length: 10 }, (_, i) => {
            const cycle = (T * 3.4 + i * 0.1) % 1;
            const py = SKY_TOP + colH * cycle;
            const sz = 18 + (i % 3) * 12;
            return (
              <div
                key={`s${i}`}
                style={{
                  position: "absolute",
                  left: target.x + Math.sin(i * 2.1 + T * 5) * colW * 0.35,
                  top: py,
                  width: sz,
                  height: sz * 2.2,
                  marginLeft: -sz / 2,
                  marginTop: -sz,
                  borderRadius: sz,
                  background: `linear-gradient(180deg,transparent,#fff)`,
                  opacity: fade * 0.8,
                  boxShadow: `0 0 ${sz * 2}px ${SKY}`,
                }}
              />
            );
          })}
        </>
      )}

      {hit > 0 && (
        <>
          <div
            style={{
              position: "absolute",
              left: target.x,
              top: target.y,
              width: 220 + hit * 240,
              height: 220 + hit * 240,
              marginLeft: -(220 + hit * 240) / 2,
              marginTop: -(220 + hit * 240) / 2,
              borderRadius: "50%",
              background: `radial-gradient(circle,#fff 0%,${SKY} 30%,transparent 68%)`,
              opacity: fade * (0.5 + Math.sin(T * 36) * 0.2),
              boxShadow: `0 0 90px 34px ${SKY_DEEP}`,
            }}
          />
          {/* Ground rings thrown out from the foot of the column. */}
          {[0, 0.2, 0.42].map((delay, i) => {
            const p = clamp((T - BEAT.impact - delay) / 1.0, 0, 1);
            if (p <= 0) return null;
            const rw = 280 + p * 1200;
            return (
              <div
                key={`r${i}`}
                style={{
                  position: "absolute",
                  left: target.x,
                  top: target.y + target.w * 0.42,
                  width: rw,
                  height: rw * 0.22,
                  marginLeft: -rw / 2,
                  marginTop: -(rw * 0.22) / 2,
                  borderRadius: "50%",
                  border: `${12 - i * 3}px solid ${SKY}`,
                  opacity: (1 - p) * 0.65 * fade,
                }}
              />
            );
          })}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// freeze — the loser is encased, then the crystal shatters.
// ---------------------------------------------------------------------------

const ICE = "#bfe9ff";
const ICE_DEEP = "#4aa8e0";

function FreezeFinale({ T, winner }: VisualProps) {
  if (T < BEAT.release || T > 26.0) return null;
  const toSide = otherSide(winner);
  const target = anchorOf(T, toSide, winner);

  const form = clamp((T - BEAT.release) / 0.45, 0, 1);
  const shattered = T >= BEAT.impact;
  const shard = clamp((T - BEAT.impact) / 1.3, 0, 1);
  const w = target.w * 1.5;
  const h = target.w * 1.9;

  return (
    <>
      {!shattered && (
        <>
          {/* Rime creeping up from the ground before the prism closes. */}
          <div
            style={{
              position: "absolute",
              left: target.x,
              top: target.y,
              width: w,
              height: h,
              marginLeft: -w / 2,
              marginTop: -h / 2,
              // A six-sided crystal, slowly turning so it catches the light.
              clipPath:
                "polygon(50% 0%, 96% 26%, 96% 74%, 50% 100%, 4% 74%, 4% 26%)",
              background: `linear-gradient(140deg,rgba(255,255,255,0.75),${ICE} 40%,rgba(74,168,224,0.55) 100%)`,
              opacity: form * 0.72,
              transform: `scaleY(${0.3 + form * 0.7}) rotate(${Math.sin(T * 2) * 4}deg)`,
              boxShadow: `0 0 90px 30px ${ICE}`,
              filter: "blur(1px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: target.x,
              top: target.y,
              width: w,
              height: h,
              marginLeft: -w / 2,
              marginTop: -h / 2,
              clipPath:
                "polygon(50% 0%, 96% 26%, 96% 74%, 50% 100%, 4% 74%, 4% 26%)",
              border: `6px solid ${ICE}`,
              opacity: form * 0.9,
              transform: `scaleY(${0.3 + form * 0.7})`,
            }}
          />
          {/* Frost crystals spiking off the shell. */}
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * 360 + 18;
            const len = w * (0.3 + 0.25 * Math.abs(Math.sin(i * 2.3)));
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: target.x,
                  top: target.y,
                  width: len,
                  height: 12,
                  marginTop: -6,
                  transformOrigin: "0 50%",
                  transform: `rotate(${a}deg)`,
                  background: `linear-gradient(90deg,${ICE},transparent)`,
                  opacity: form * 0.7,
                  filter: "blur(2px)",
                }}
              />
            );
          })}
        </>
      )}

      {shattered &&
        Array.from({ length: 18 }, (_, i) => {
          const a = (i / 18) * Math.PI * 2 + 0.4;
          const speed = 420 + (i % 5) * 190;
          const px = target.x + Math.cos(a) * speed * shard;
          const py =
            target.y + Math.sin(a) * speed * shard * 0.75 + shard * shard * 420;
          const sz = 34 + (i % 4) * 22;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: px,
                top: py,
                width: sz,
                height: sz * 1.7,
                marginLeft: -sz / 2,
                marginTop: -(sz * 1.7) / 2,
                clipPath: "polygon(50% 0%, 100% 62%, 62% 100%, 0% 46%)",
                background: `linear-gradient(150deg,#fff,${ICE} 45%,${ICE_DEEP})`,
                opacity: (1 - shard) * 0.95,
                transform: `rotate(${a * 90 + shard * 420}deg)`,
                boxShadow: `0 0 26px ${ICE}`,
              }}
            />
          );
        })}

      {shattered && (
        <div
          style={{
            position: "absolute",
            left: target.x,
            top: target.y,
            width: 300 + shard * 700,
            height: 300 + shard * 700,
            marginLeft: -(300 + shard * 700) / 2,
            marginTop: -(300 + shard * 700) / 2,
            borderRadius: "50%",
            background: `radial-gradient(circle,#fff 0%,${ICE} 35%,transparent 70%)`,
            opacity: (1 - easeOutCubic(shard)) * 0.8,
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

const VISUALS: Record<FinaleId, ComponentType<VisualProps>> = {
  beam: BeamFinale,
  meteor: MeteorFinale,
  rush: RushFinale,
  orb: OrbFinale,
  skyfall: SkyfallFinale,
  freeze: FreezeFinale,
};

/** Draws whichever finisher this duel drew. A draw ends with no finisher. */
export function FinaleVisual({
  finale,
  T,
  winner,
  cast,
}: {
  finale: FinaleId;
  T: number;
  winner: FightWinner;
  cast: FightCast;
}) {
  if (winner === "draw") return null;
  const Visual = VISUALS[finale] ?? VISUALS.beam;
  return <Visual T={T} winner={winner} cast={cast} />;
}
