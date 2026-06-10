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
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { playChime } from "@/lib/sound";

type Intensity = "normal" | "big";

interface Particle {
  id: number;
  emoji: string;
  dx: number;
  dy: number;
  scale: number;
}

interface Burst {
  id: number;
  intensity: Intensity;
  particles: Particle[];
}

type Celebrate = (opts?: { intensity?: Intensity }) => void;

const CelebrationContext = createContext<Celebrate | null>(null);

// Soft "paper" easing, matching components/ui/motion.tsx.
const EASE = [0.16, 1, 0.3, 1] as const;
const STARS = ["⭐", "✨", "🌟"];
const BURST_MS = 1200;

function makeParticles(intensity: Intensity): Particle[] {
  const count = intensity === "big" ? 22 : 13;
  const spread = intensity === "big" ? 200 : 140;
  return Array.from({ length: count }, (_, i) => {
    // Even radial spokes with a little jitter so it reads organic, not clocklike.
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
    const distance = spread + Math.random() * 90;
    return {
      id: i,
      emoji: STARS[i % STARS.length],
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      scale: 0.8 + Math.random() * 0.9,
    };
  });
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
      playChime(intensity === "big" ? "fanfare" : "ding");
      const id = nextId.current++;
      setBursts((b) => [
        ...b,
        { id, intensity, particles: reduce ? [] : makeParticles(intensity) },
      ]);
      window.setTimeout(
        () => setBursts((b) => b.filter((x) => x.id !== id)),
        BURST_MS
      );
    },
    [reduce]
  );

  return (
    <CelebrationContext.Provider value={celebrate}>
      {children}
      {portalTarget &&
        createPortal(
          <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
            <AnimatePresence>
              {bursts.map((burst) => (
                <div
                  key={burst.id}
                  className="absolute left-1/2 top-1/2"
                  aria-hidden="true"
                >
                  {/* Centre pop — a medal for badge awards, a star otherwise. */}
                  <motion.span
                    className="absolute -ml-[0.5em] -mt-[0.5em] select-none text-6xl drop-shadow-[0_6px_16px_rgba(31,61,56,0.25)]"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={
                      reduce
                        ? { scale: 1, opacity: [0, 1, 1, 0] }
                        : { scale: [0, 1.25, 1, 1, 0.9], opacity: [0, 1, 1, 1, 0] }
                    }
                    transition={{ duration: reduce ? 0.7 : 1, ease: EASE }}
                  >
                    {burst.intensity === "big" ? "🏅" : "⭐"}
                  </motion.span>

                  {/* Sparkle particles flying outward (skipped under reduced motion). */}
                  {burst.particles.map((p) => (
                    <motion.span
                      key={p.id}
                      className="absolute -ml-[0.5em] -mt-[0.5em] select-none text-2xl"
                      initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                      animate={{
                        x: p.dx,
                        y: p.dy,
                        scale: p.scale,
                        opacity: [0, 1, 1, 0],
                      }}
                      transition={{ duration: 1, ease: EASE }}
                    >
                      {p.emoji}
                    </motion.span>
                  ))}
                </div>
              ))}
            </AnimatePresence>
          </div>,
          portalTarget
        )}
    </CelebrationContext.Provider>
  );
}

/** Returns a `celebrate()` trigger. Safe no-op if no provider is mounted. */
export function useCelebrate(): Celebrate {
  return useContext(CelebrationContext) ?? (() => {});
}
