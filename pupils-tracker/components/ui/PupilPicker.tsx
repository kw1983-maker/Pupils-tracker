"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, X, Wand2, RotateCw } from "lucide-react";
import { useTracker } from "@/lib/store";
import { Button } from "./Button";

type Phase = "idle" | "spinning" | "done";

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export function PupilPicker() {
  const { pupils, currentClassName } = useTracker();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [display, setDisplay] = useState<string>("");
  const [winner, setWinner] = useState<string>("");
  const [avoidRepeats, setAvoidRepeats] = useState(true);
  // IDs already drawn this round (for "avoid repeats").
  const [pickedIds, setPickedIds] = useState<string[]>([]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  useEffect(() => clearTimer, [clearTimer]);

  const spin = () => {
    if (pupils.length === 0) return;
    clearTimer();

    // Eligible pool: skip already-picked unless that would empty it.
    let pool = pupils;
    let picked = pickedIds;
    if (avoidRepeats) {
      const remaining = pupils.filter((p) => !pickedIds.includes(p.id));
      if (remaining.length === 0) {
        picked = []; // everyone has had a turn — start a fresh round
        pool = pupils;
      } else {
        pool = remaining;
      }
    }

    const chosen = pick(pool);
    setWinner(chosen.name);
    setPhase("spinning");

    const finish = () => {
      setDisplay(chosen.name);
      setPhase("done");
      setPickedIds(avoidRepeats ? [...picked, chosen.id] : []);
    };

    // The shuffle is a deliberate, teacher-triggered effect, so we run it even
    // under prefers-reduced-motion. A 1-pupil class has nothing to shuffle.
    if (pupils.length === 1) {
      finish();
      return;
    }

    // Decelerating shuffle: flash random names, slowing down, then land.
    let delay = 55;
    const tick = () => {
      setDisplay(pick(pupils).name);
      delay *= 1.13;
      if (delay < 340) {
        timer.current = setTimeout(tick, delay);
      } else {
        finish();
      }
    };
    tick();
  };

  const reset = () => {
    clearTimer();
    setPhase("idle");
    setDisplay("");
    setWinner("");
    setPickedIds([]);
  };

  const spinning = phase === "spinning";
  const done = phase === "done";
  const roundCount = pickedIds.length;

  return (
    <div className="flex flex-col items-end gap-2">
      {open && (
        <div
          className="card w-64 rounded-card p-4 shadow-float"
          role="group"
          aria-label="Random pupil picker"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-paper-400">
              <Sparkles className="h-3.5 w-3.5" /> Pick a pupil
            </h2>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close picker panel"
              className="rounded-md p-1 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-600 focus-visible:shadow-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {pupils.length === 0 ? (
            <p className="text-sm text-paper-500">
              Add pupils first in the Homework tab.
            </p>
          ) : (
            <>
              {/* Reveal stage */}
              <div
                className={`mb-3 flex min-h-24 items-center justify-center rounded-card border p-4 text-center transition-colors ${
                  done
                    ? "border-brand-200 bg-brand-50"
                    : "border-paper-100 bg-paper-50"
                }`}
                aria-live="polite"
              >
                {display ? (
                  <span
                    className={`font-display font-bold text-paper-800 ${
                      spinning
                        ? "text-xl text-paper-400 blur-[1px]"
                        : "text-2xl motion-reduce:animate-none animate-[pop_.3s_ease-out]"
                    }`}
                  >
                    {display}
                  </span>
                ) : (
                  <span className="text-sm text-paper-400">
                    Tap spin to pick someone from {currentClassName || "the class"}.
                  </span>
                )}
              </div>

              {done && (
                <p className="mb-3 text-center text-2xs font-bold uppercase tracking-wider text-brand-600">
                  🎉 You&apos;re up, {winner.split(" ")[0]}!
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  size="sm"
                  onClick={spin}
                  disabled={spinning}
                >
                  <Wand2 className="h-4 w-4" />
                  {done ? "Spin again" : "Spin"}
                </Button>
                {(done || roundCount > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={reset}
                    aria-label="Reset picker"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <label className="mt-3 flex items-center gap-2 text-xs text-paper-500">
                <input
                  type="checkbox"
                  checked={avoidRepeats}
                  onChange={(e) => {
                    setAvoidRepeats(e.target.checked);
                    setPickedIds([]);
                  }}
                  className="h-3.5 w-3.5 accent-brand-500"
                />
                Avoid repeats
                {avoidRepeats && roundCount > 0 && (
                  <span className="ml-auto tabular-nums text-paper-400">
                    {roundCount}/{pupils.length} picked
                  </span>
                )}
              </label>
            </>
          )}
        </div>
      )}

      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Hide pupil picker" : "Show pupil picker"}
        className="flex h-12 items-center gap-2 rounded-full border border-paper-200 bg-surface px-4 font-display font-bold text-paper-600 shadow-float outline-none transition-colors hover:border-brand-400 focus-visible:shadow-ring"
      >
        <Sparkles className="h-5 w-5 text-brand-500" />
      </button>
    </div>
  );
}
