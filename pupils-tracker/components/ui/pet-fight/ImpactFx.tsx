"use client";

/**
 * What the arena does to the pet that just took a hit.
 *
 * The power-up scene tears the ground up around the pet powering up; this does
 * the same thing at a tenth of the size around the pet being punched, reusing
 * the same seven assets through FxTint. No new artwork: the shapes are shared,
 * only the scale, the timing and the colour differ.
 *
 * Two rules hold the beat in place:
 *
 * 1. **Small and short.** The power-up has to stay the biggest thing in the
 *    fight, so nothing here runs past half a second or much beyond 500px. A
 *    combo hit that reads as a miniature transformation is a bug.
 * 2. **Fast in, quick out** — the shape is at full size in the first third and
 *    fades from there, the opposite of the power-up's slow build.
 *
 * Pure functions of clock T, inline styles, no CSS keyframes: the stage stays
 * scrubbable and renderable as a still at any T.
 */

import { IMPACTS, impactLife, type Impact } from "@/lib/pet-fight/storyboard";
import { clamp, easeOutCubic } from "@/lib/pet-fight/timing";
import { fxSrc } from "@/lib/pet-fight/fx-assets";
import { FxTint } from "@/components/ui/pet-fight/TransformFx";
import {
  bodyBoxOf,
  baseFor,
  otherSide,
  poseFor,
  type FightCast,
  type FightWinner,
} from "@/lib/pet-fight/poses";

/**
 * Dust and stone are lit by the arena, not by whoever threw the punch — an
 * orange dragon does not make the floor glow orange.
 */
const EARTH =
  "linear-gradient(180deg,rgba(146,126,104,0.95),rgba(96,82,68,0.9) 50%,rgba(58,48,40,0.55))";

/** Ground splits under the defender and a ring runs out along the floor. */
function Crack({
  footX,
  footY,
  open,
  fade,
  power,
  gradient,
}: {
  footX: number;
  footY: number;
  open: number;
  fade: number;
  power: number;
  gradient: string;
}) {
  const w = (230 + power * 330) * (0.45 + open * 0.55);
  const ring = 110 + open * (300 + power * 340);
  const box = {
    position: "absolute" as const,
    left: footX,
    top: footY,
    transform: "scaleY(0.32)",
  };
  return (
    <>
      <FxTint
        asset="crack-ground"
        opacity={fade * 0.6}
        gradient="linear-gradient(180deg,rgba(38,24,14,0.95),rgba(18,11,7,0.95))"
        style={{
          ...box,
          width: w * 1.07,
          height: w * 1.07,
          marginLeft: (-w * 1.07) / 2,
          marginTop: (-w * 1.07) / 2,
        }}
      />
      <FxTint
        asset="crack-ground"
        opacity={fade * (0.75 + power * 0.25)}
        gradient={gradient}
        style={{
          ...box,
          width: w,
          height: w,
          marginLeft: -w / 2,
          marginTop: -w / 2,
        }}
      />
      <FxTint
        asset="shockwave-ring"
        opacity={(1 - open) * fade * 0.8}
        gradient={gradient}
        style={{
          position: "absolute",
          left: footX,
          top: footY,
          width: ring,
          height: ring,
          marginLeft: -ring / 2,
          marginTop: -ring / 2,
          transform: "scaleY(0.3)",
        }}
      />
    </>
  );
}

/** Air torn past the defender in the direction they were shoved. */
function GustStreaks({
  footX,
  bodyY,
  dir,
  open,
  fade,
  power,
  gradient,
}: {
  footX: number;
  bodyY: number;
  /** +1 when the blow came from the left, so the wind blows right. */
  dir: number;
  open: number;
  fade: number;
  power: number;
  gradient: string;
}) {
  return (
    <>
      {Array.from({ length: 4 }, (_, i) => {
        const len = 210 + (i % 3) * 90 + power * 120;
        const lag = clamp(open * 1.3 - i * 0.12, 0, 1);
        return (
          <FxTint
            key={i}
            asset="wind-streak"
            opacity={fade * (0.95 - i * 0.12)}
            gradient={gradient}
            style={{
              position: "absolute",
              left: footX + dir * (50 + lag * (180 + i * 70)),
              top: bodyY - 46 + ((i * 53) % 130),
              width: len,
              height: len * 0.24,
              marginLeft: -len / 2,
              marginTop: -len * 0.12,
              // scaleX flips the taper so the thick end faces the pet.
              transform: `rotate(${(i % 2 ? 1 : -1) * (5 + i * 3)}deg) scaleX(${dir})`,
            }}
          />
        );
      })}
    </>
  );
}

/** The dirt that gust drags along the floor. Ground layer, behind the pets. */
function GustDust({
  footX,
  footY,
  dir,
  open,
  fade,
  power,
}: {
  footX: number;
  footY: number;
  dir: number;
  open: number;
  fade: number;
  power: number;
}) {
  const sheet = 240 + open * (220 + power * 240);
  return (
    <FxTint
      asset="dust-sheet"
      opacity={fade * 0.6}
      gradient={EARTH}
      style={{
        position: "absolute",
        left: footX + dir * (70 + open * 170),
        top: footY - 18,
        width: sheet,
        height: sheet * 0.5,
        marginLeft: -sheet / 2,
        marginTop: -sheet * 0.42,
        transform: `scaleX(${dir})`,
      }}
    />
  );
}

/** Electricity crawling over the defender. */
function Zap({
  bodyX,
  bodyY,
  bodyW,
  age,
  open,
  fade,
  power,
  gradient,
}: {
  bodyX: number;
  bodyY: number;
  bodyW: number;
  age: number;
  open: number;
  fade: number;
  power: number;
  gradient: string;
}) {
  const ring = 100 + open * (240 + power * 200);
  return (
    <>
      {Array.from({ length: 3 }, (_, i) => {
        // Each arc stutters on its own phase. In unison they read as the whole
        // screen strobing rather than as electricity.
        if (Math.sin(age * 96 + i * 2.2) < -0.15) return null;
        const a = (i / 3) * Math.PI * 2 + 0.6;
        const h = bodyW * (0.5 + (i % 3) * 0.16) * (0.7 + power * 0.4);
        return (
          <FxTint
            key={i}
            asset="lightning-arc"
            opacity={fade * (0.85 + power * 0.15)}
            gradient={gradient}
            style={{
              position: "absolute",
              left: bodyX + Math.cos(a) * bodyW * 0.3,
              top: bodyY + Math.sin(a) * bodyW * 0.24,
              width: h * 0.55,
              height: h,
              marginLeft: -(h * 0.55) / 2,
              marginTop: -h / 2,
              transform: `rotate(${(a * 180) / Math.PI + 90}deg)`,
            }}
          />
        );
      })}
      <FxTint
        asset="shockwave-ring"
        opacity={(1 - open) * fade * 0.7}
        gradient={gradient}
        style={{
          position: "absolute",
          left: bodyX,
          top: bodyY,
          width: ring,
          height: ring,
          marginLeft: -ring / 2,
          marginTop: -ring / 2,
        }}
      />
    </>
  );
}

const ROCKS = ["rock-a", "rock-b", "rock-c"] as const;

/** Dirt thrown out either side of the defender's feet. */
function DustSheets({
  footX,
  footY,
  dir,
  open,
  fade,
  power,
}: {
  footX: number;
  footY: number;
  dir: number;
  open: number;
  fade: number;
  power: number;
}) {
  const sheet = 200 + open * (200 + power * 200);
  return (
    <>
      {[-1, 1].map((side, i) => (
        <FxTint
          key={i}
          asset="dust-sheet"
          opacity={fade * (side === dir ? 0.72 : 0.45)}
          gradient={EARTH}
          style={{
            position: "absolute",
            left: footX + side * (50 + open * 150),
            top: footY - 14,
            width: sheet,
            height: sheet * 0.5,
            marginLeft: -sheet / 2,
            marginTop: -sheet * 0.42,
            transform: `scaleX(${side})`,
          }}
        />
      ))}
    </>
  );
}

/** Stone chips kicked up off the floor. Air layer — they fly past the pet. */
function DustChips({
  footX,
  footY,
  dir,
  age,
  fade,
  power,
}: {
  footX: number;
  footY: number;
  dir: number;
  age: number;
  fade: number;
  power: number;
}) {
  return (
    <>
      {Array.from({ length: 3 }, (_, i) => {
        const side = i === 1 ? dir : i % 2 ? 1 : -1;
        const sz = 16 + (i % 3) * 9 + power * 10;
        // A chip thrown up off the floor: out fast, and gravity takes it back.
        const t = age * 3.4;
        const x = footX + side * (30 + t * (90 + i * 34));
        const y = footY - t * (150 + i * 40) + t * t * 130;
        if (y > footY + 10) return null;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`r${i}`}
            src={fxSrc(ROCKS[i % ROCKS.length]!)}
            alt=""
            draggable={false}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: sz,
              height: "auto",
              marginLeft: -sz / 2,
              transform: `rotate(${side * age * 640}deg)`,
              opacity: fade,
              filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.45))",
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
}

/** One hit's reaction, anchored on the pet that took it. */
/**
 * Which side of the pets a piece is drawn on.
 *
 * Cracked floor and blown dirt belong under the sprites; electricity crawling
 * over a body and chips flying past it belong in front. One pass cannot do
 * both, so the stage mounts this twice around the fighters.
 */
export type ImpactLayer = "ground" | "air";

function Reaction({
  imp,
  T,
  winner,
  attacker,
  layer,
}: {
  imp: Impact;
  T: number;
  winner: FightWinner;
  attacker: FightCast;
  layer: ImpactLayer;
}) {
  const age = T - imp.t;
  const life = impactLife(imp.power);
  if (age < 0 || age > life) return null;
  const p = age / life;
  // Full size in the first third, then a linear fade — fast in, quick out.
  const open = easeOutCubic(clamp(p / 0.34, 0, 1));
  const fade = (1 - p) * (0.8 + imp.power * 0.2);

  // The reaction goes on the DEFENDER. The star burst in PetFightStage is the
  // spark between the fighters, which at these beats is ~230px away — anchoring
  // both to one point would put the cracked ground in mid-air.
  const side = otherSide(imp.by);
  const base = baseFor(side);
  const pose = poseFor(T, side, winner);
  const footX = base.x + pose.dx;
  const footY = base.y + pose.dy;
  // bodyBoxOf, not anchorOf: a struck pet may be mid-tumble (the cat at 8.85s
  // is 700deg through a spin), and an anchor blind to rotation leaves the
  // effect hanging in the air above it.
  const box = bodyBoxOf(T, side, winner);
  const body = {
    x: (box.x0 + box.x1) / 2,
    y: (box.y0 + box.y1) / 2,
    w: Math.max(box.x1 - box.x0, 60),
  };
  // Which way the blow shoves them: away from whoever threw it.
  const dir = imp.by === "left" ? 1 : -1;
  const gradient = `linear-gradient(180deg,#ffffff,${attacker.starColor} 28%,${attacker.tint})`;
  const ground = layer === "ground";

  switch (imp.kind) {
    case "crack":
      return ground ? (
        <Crack
          footX={footX}
          footY={footY}
          open={open}
          fade={fade}
          power={imp.power}
          gradient={gradient}
        />
      ) : null;
    case "gust":
      return ground ? (
        <GustDust
          footX={footX}
          footY={footY}
          dir={dir}
          open={open}
          fade={fade}
          power={imp.power}
        />
      ) : (
        <GustStreaks
          footX={footX}
          bodyY={body.y}
          dir={dir}
          open={open}
          fade={fade}
          power={imp.power}
          gradient={gradient}
        />
      );
    case "zap":
      return ground ? null : (
        <Zap
          bodyX={body.x}
          bodyY={body.y}
          bodyW={body.w}
          age={age}
          open={open}
          fade={fade}
          power={imp.power}
          gradient={gradient}
        />
      );
    case "dust":
      return ground ? (
        <DustSheets
          footX={footX}
          footY={footY}
          dir={dir}
          open={open}
          fade={fade}
          power={imp.power}
        />
      ) : (
        <DustChips
          footX={footX}
          footY={footY}
          dir={dir}
          age={age}
          fade={fade}
          power={imp.power}
        />
      );
  }
}

/** Every mid-fight hit's reaction, for one side of the sprites. */
export function ImpactReactions({
  T,
  winner,
  left,
  right,
  layer,
}: {
  T: number;
  winner: FightWinner;
  left: FightCast;
  right: FightCast;
  layer: ImpactLayer;
}) {
  return (
    <>
      {IMPACTS.map((imp) => (
        <Reaction
          key={imp.t}
          imp={imp}
          T={T}
          winner={winner}
          layer={layer}
          attacker={imp.by === "left" ? left : right}
        />
      ))}
    </>
  );
}
