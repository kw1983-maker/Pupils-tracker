"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import { playApplause, playChime, playWomp } from "@/lib/sound";

type Intensity = "normal" | "big";
type Kind = "pos" | "neg";

interface ConfettiPiece {
  id: string;
  left: number;
  size: number;
  dur: number;
  delay: number;
  color: string;
  radius: string;
}

interface Burst {
  id: number;
  kind: Kind;
  intensity: Intensity;
  confetti: ConfettiPiece[];
}

type Celebrate = (opts?: { intensity?: Intensity; kind?: Kind }) => void;

const CelebrationContext = createContext<Celebrate | null>(null);

// Soft Stationery brand + marker accents (matches design handoff).
const CONFETTI_COLORS = [
  "#4c9e8f",
  "#d99a14",
  "#e5484d",
  "#2f7bd6",
  "#fbd0dd",
  "#ddd6fe",
  "#c4eccd",
  "#57ab98",
];

// Party energy by default — Lively=30, Gentle=0, Party=55 (+20 for badges).
const BASE_CONFETTI = 55;
const CENTER_MS = 1250;
const CONFETTI_MS = 3600;

function confettiCount(kind: Kind, intensity: Intensity, reduce: boolean): number {
  if (reduce || kind === "neg") return 0;
  return intensity === "big" ? BASE_CONFETTI + 20 : BASE_CONFETTI;
}

function makeConfetti(n: number, burstId: number): ConfettiPiece[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `cf${burstId}_${i}`,
    left: Math.random() * 100,
    size: 6 + Math.random() * 8,
    dur: 1600 + Math.random() * 1600,
    delay: Math.random() * 500,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    radius: Math.random() < 0.4 ? "9999px" : "2px",
  }));
}

/** Wraps the app so any descendant can fire the reward celebration. */
export function CelebrationProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const [bursts, setBursts] = useState<Burst[]>([]);
  // Portal target: document.body normally, but the fullscreen element when one
  // is active — content portaled to body is invisible during fullscreen
  // (e.g. the spelling board's Present mode).
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const nextId = useRef(0);

  useEffect(() => {
    const update = () =>
      setPortalTarget(
        (document.fullscreenElement as HTMLElement | null) ?? document.body
      );
    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const celebrate = useCallback<Celebrate>(
    (opts) => {
      const intensity = opts?.intensity ?? "normal";
      const kind = opts?.kind ?? "pos";
      if (kind === "neg") playWomp();
      else {
        playChime(intensity === "big" ? "fanfare" : "ding");
        if (intensity === "big") playApplause();
      }

      const id = nextId.current++;
      const pieces = makeConfetti(confettiCount(kind, intensity, !!reduce), id);
      setBursts((b) => [...b, { id, kind, intensity, confetti: pieces }]);

      window.setTimeout(
        () => setBursts((b) => b.filter((x) => x.id !== id)),
        Math.max(CENTER_MS, pieces.length ? CONFETTI_MS : CENTER_MS)
      );
    },
    [reduce]
  );

  return (
    <CelebrationContext.Provider value={celebrate}>
      {children}
      {portalTarget &&
        createPortal(
          <>
            {/* Falling confetti — lives above the page, ignores clicks. */}
            <div
              className="pointer-events-none fixed inset-0 z-[55] overflow-hidden"
              aria-hidden="true"
            >
              {bursts.flatMap((burst) =>
                burst.confetti.map((c) => (
                  <span
                    key={c.id}
                    className="celebration-confetti absolute top-0"
                    style={{
                      left: `${c.left}%`,
                      width: c.size,
                      height: c.size * 1.4,
                      background: c.color,
                      borderRadius: c.radius,
                      animationDuration: `${c.dur}ms`,
                      animationDelay: `${c.delay}ms`,
                    }}
                  />
                ))
              )}
            </div>

            {/* Centre emoji + expanding ring. */}
            <div
              className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
              aria-hidden="true"
            >
              {bursts.map((burst) => {
                const big = burst.intensity === "big";
                const ring =
                  burst.kind === "neg"
                    ? "border-danger"
                    : big
                      ? "border-warning"
                      : "border-success";
                const emoji =
                  burst.kind === "neg" ? "😟" : big ? "🏅" : "⭐";
                return (
                  <div
                    key={burst.id}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <span
                      className={`celebration-ring absolute h-[180px] w-[180px] rounded-full border-[6px] ${ring}`}
                    />
                    <span
                      className="celebration-center drop-shadow-[0_6px_16px_rgba(31,61,56,0.25)]"
                      style={{ fontSize: big ? 128 : 104 }}
                    >
                      {emoji}
                    </span>
                  </div>
                );
              })}
            </div>
          </>,
          portalTarget
        )}
    </CelebrationContext.Provider>
  );
}

/** Returns a `celebrate()` trigger. Safe no-op if no provider is mounted. */
export function useCelebrate(): Celebrate {
  return useContext(CelebrationContext) ?? (() => {});
}
