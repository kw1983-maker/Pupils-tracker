"use client";

import { useEffect, useRef, useState } from "react";
import {
  Disc3,
  Wand2,
  Eye,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  ExternalLink,
} from "lucide-react";
import { useTracker } from "@/lib/store";
import { rulesForClass, gameLinkForClass } from "@/lib/class-rules";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button, buttonClasses } from "@/components/ui/Button";

// Slice fills cycle through the highlighter palette for a playful wheel.
const SLICE_FILLS = [
  "var(--color-mark-pink)",
  "var(--color-mark-amber)",
  "var(--color-mark-green)",
  "var(--color-mark-blue)",
  "var(--color-mark-purple)",
  "var(--color-mark-orange)",
];

const CENTER = 100;
const RADIUS = 95;

// Point on the wheel at `angle` degrees measured clockwise from the top.
function pointAt(angle: number, r: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return [CENTER + r * Math.cos(rad), CENTER + r * Math.sin(rad)];
}

export function SpinningRules() {
  const { currentClassName } = useTracker();
  const rules = rulesForClass(currentClassName);
  const N = rules.length;
  const seg = 360 / N;
  const gameUrl = gameLinkForClass(currentClassName);

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [landedIndex, setLandedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [pickedIndexes, setPickedIndexes] = useState<number[]>([]);
  const [showAll, setShowAll] = useState(true);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const clearTicks = () => {
    if (tickTimer.current) {
      clearTimeout(tickTimer.current);
      tickTimer.current = null;
    }
  };
  // Switching class remounts this panel (PanelSwap is keyed by class id), so a
  // fresh rule set always starts with clean state — we only clear timers here.
  useEffect(() => {
    return () => {
      clearTimer();
      clearTicks();
    };
  }, []);

  // --- sound (Web Audio API, no asset) ---
  const ensureAudio = () => {
    if (!audioRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioRef.current = new Ctx();
    }
    void audioRef.current.resume();
  };

  const tone = (freq: number, start: number, dur: number, peak = 0.3, type: OscillatorType = "sine") => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  };

  // A short click, like a wheel peg passing the pointer.
  const playTick = () => {
    const ctx = audioRef.current;
    if (ctx) tone(1500, ctx.currentTime, 0.03, 0.18, "square");
  };

  // A cheerful rising chime when the wheel lands.
  const playDing = () => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;
    [660, 880, 1320].forEach((f, i) => tone(f, t + i * 0.1, 0.25, 0.32));
  };

  // Ticks that slow down over the ~4s spin to match the deceleration.
  const startTicking = () => {
    clearTicks();
    let delay = 55;
    const elapsedUntil = Date.now() + 3900;
    const tick = () => {
      playTick();
      delay *= 1.085;
      if (Date.now() + delay < elapsedUntil) {
        tickTimer.current = setTimeout(tick, delay);
      } else {
        tickTimer.current = null;
      }
    };
    tick();
  };

  const spin = () => {
    if (spinning || N === 0) return;
    clearTimer();

    // Once every rule has come up, start a fresh round.
    const picked = pickedIndexes.length >= N ? [] : pickedIndexes;
    const eligible = Array.from({ length: N }, (_, i) => i).filter(
      (i) => !picked.includes(i)
    );
    const chosen = eligible[Math.floor(Math.random() * eligible.length)];

    const centerAngle = chosen * seg + seg / 2;
    const delta = ((360 - centerAngle) - (rotation % 360) + 360) % 360;
    const newRotation = rotation + 5 * 360 + delta;

    setRevealed(false);
    setLandedIndex(null);
    setSpinning(true);
    setRotation(newRotation);

    // Spin click is the user gesture that unlocks audio.
    ensureAudio();
    // The spin is a deliberate, teacher-triggered activity, so we always animate
    // it — even under prefers-reduced-motion (the .wheel-rotor CSS keeps the
    // transition alive there). Audio ticks accompany the ~4s deceleration.
    startTicking();

    timer.current = setTimeout(() => {
      clearTicks();
      playDing();
      setSpinning(false);
      setLandedIndex(chosen);
      setPickedIndexes([...picked, chosen]);
    }, 4100);
  };

  const reset = () => {
    clearTimer();
    clearTicks();
    setSpinning(false);
    setLandedIndex(null);
    setRevealed(false);
    setPickedIndexes([]);
  };

  return (
    <div className="space-y-4">
      {/* Teaching reference — all rules for this class */}
      <SectionCard
        title={`All rules — ${currentClassName || "Class"}`}
        action={
          <button
            onClick={() => setShowAll((s) => !s)}
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 outline-none hover:underline focus-visible:shadow-ring"
          >
            {showAll ? (
              <>
                Hide <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Show <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        }
      >
        {showAll ? (
          <ol className="grid gap-2 sm:grid-cols-2">
            {rules.map((r, i) => (
              <li
                key={i}
                className={`flex gap-2 rounded-md border p-2.5 text-sm ${
                  landedIndex === i
                    ? "border-brand-300 bg-brand-50"
                    : "border-paper-100"
                }`}
              >
                <span className="font-display font-bold tabular-nums text-brand-600">
                  {i + 1}.
                </span>
                <span className="text-paper-700">{r}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-paper-400">
            Tap “Show” to display all {N} rules for teaching.
          </p>
        )}
      </SectionCard>

      <SectionCard
        title={`Spinning Rules — ${currentClassName || "Class"} · ${N} rules`}
      >
        <div className="flex flex-col items-center gap-5 py-2">
        {/* Wheel + pointer */}
        <div className="relative h-72 w-72 max-w-full">
          {/* Pointer */}
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1">
            <div className="h-0 w-0 border-x-[12px] border-t-[18px] border-x-transparent border-t-danger drop-shadow" />
          </div>

          <div
            className={`wheel-rotor h-full w-full${spinning ? " is-spinning" : ""}`}
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <svg viewBox="0 0 200 200" className="h-full w-full">
              {rules.map((_, i) => {
                const a0 = i * seg;
                const a1 = (i + 1) * seg;
                const [x0, y0] = pointAt(a0, RADIUS);
                const [x1, y1] = pointAt(a1, RADIUS);
                const [lx, ly] = pointAt(a0 + seg / 2, RADIUS * 0.66);
                const isLanded = landedIndex === i && !spinning;
                return (
                  <g key={i}>
                    <path
                      d={`M ${CENTER} ${CENTER} L ${x0} ${y0} A ${RADIUS} ${RADIUS} 0 0 1 ${x1} ${y1} Z`}
                      fill={SLICE_FILLS[i % SLICE_FILLS.length]}
                      stroke="var(--color-surface)"
                      strokeWidth={isLanded ? 2.5 : 1}
                      opacity={landedIndex !== null && !spinning && !isLanded ? 0.45 : 1}
                    />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="font-display"
                      style={{
                        fontSize: N > 12 ? 9 : 12,
                        fontWeight: 700,
                        fill: "var(--color-paper-800)",
                      }}
                      transform={`rotate(${a0 + seg / 2} ${lx} ${ly})`}
                    >
                      {i + 1}
                    </text>
                  </g>
                );
              })}
              <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="var(--color-paper-200)" strokeWidth={2} />
              <circle cx={CENTER} cy={CENTER} r={14} fill="var(--color-surface)" stroke="var(--color-paper-200)" strokeWidth={2} />
            </svg>
          </div>
        </div>

        {/* Controls + result */}
        <div className="w-full max-w-sm space-y-3 text-center">
          {landedIndex === null ? (
            <p className="text-sm text-paper-500">
              Spin the wheel, then say the rule out loud before revealing it.
            </p>
          ) : (
            <>
              <p className="font-display text-3xl font-bold text-brand-600">
                Rule #{landedIndex + 1}
              </p>
              {!revealed ? (
                <p className="text-sm font-semibold text-paper-500">
                  Say the rule out loud! 🗣️
                </p>
              ) : (
                <div className="rounded-card border border-brand-200 bg-brand-50 p-4">
                  <p className="font-display text-lg font-semibold text-paper-800">
                    “{rules[landedIndex]}”
                  </p>
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-center gap-2">
            <Button onClick={spin} disabled={spinning}>
              <Wand2 className="h-4 w-4" />
              {spinning
                ? "Spinning…"
                : landedIndex === null
                ? "Spin the wheel"
                : "Spin again"}
            </Button>
            {landedIndex !== null && !revealed && !spinning && (
              <Button variant="secondary" onClick={() => setRevealed(true)}>
                <Eye className="h-4 w-4" /> Reveal answer
              </Button>
            )}
            {pickedIndexes.length > 0 && (
              <Button variant="ghost" onClick={reset} aria-label="Reset wheel">
                <RotateCw className="h-4 w-4" />
              </Button>
            )}
          </div>

          {pickedIndexes.length > 0 && (
            <p className="flex items-center justify-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-paper-400">
              <Disc3 className="h-3.5 w-3.5" />
              {pickedIndexes.length}/{N} rules done this round
            </p>
          )}
        </div>
        </div>
      </SectionCard>

      {/* Winner's reward game (opens in a new tab) */}
      <SectionCard title="Winner's reward game">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <Gamepad2 className="h-10 w-10 text-brand-500" />
          <p className="text-sm text-paper-600">
            🎉 The winner gets to play the {currentClassName || "class"} rules
            game!
          </p>
          <a
            href={gameUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("primary", "md")}
          >
            <Gamepad2 className="h-4 w-4" /> Open the game
            <ExternalLink className="h-4 w-4" />
          </a>
          <p className="break-all text-2xs text-paper-400">
            Opens in a new tab · {gameUrl}
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
