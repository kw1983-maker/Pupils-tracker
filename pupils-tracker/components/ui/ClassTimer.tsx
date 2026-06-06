"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlarmClock,
  Play,
  Pause,
  RotateCcw,
  X,
  BellRing,
} from "lucide-react";
import { Button } from "./Button";
import { fieldClassName } from "./Field";

type Status = "idle" | "running" | "paused" | "done";

const PRESETS = [1, 3, 5, 10, 15]; // minutes

// Defined at module scope so the react-hooks purity rule (which only guards
// against impure calls during render) doesn't flag these legitimate uses.
const nowMs = () => Date.now();

function format(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ClassTimer() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [remainingMs, setRemainingMs] = useState(0);
  const [customMin, setCustomMin] = useState("");

  // Absolute end time while running; lets the countdown stay accurate even if the
  // tab is throttled in the background (we recompute from the clock, not decrement).
  const endAtRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const alarmRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- sound ---
  const beep = useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    const now = ctx.currentTime;
    // Quick attack/decay envelope so the tone doesn't click.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.4, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.26);
  }, []);

  const stopAlarm = useCallback(() => {
    if (alarmRef.current) {
      clearInterval(alarmRef.current);
      alarmRef.current = null;
    }
  }, []);

  // --- countdown tick ---
  useEffect(() => {
    if (status !== "running") return;
    const tick = () => {
      const end = endAtRef.current;
      if (end == null) return;
      const left = Math.max(0, end - nowMs());
      setRemainingMs(left);
      if (left <= 0) {
        setStatus("done");
        setOpen(true);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [status]);

  // --- alarm on done (repeat until dismissed) ---
  useEffect(() => {
    if (status !== "done") return;
    endAtRef.current = null;
    beep();
    alarmRef.current = setInterval(beep, 1200);
    return stopAlarm;
  }, [status, beep, stopAlarm]);

  useEffect(() => stopAlarm, [stopAlarm]);

  const ensureAudio = () => {
    if (!audioRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioRef.current = new Ctx();
    }
    // Resume in case the browser created it suspended (autoplay policy).
    void audioRef.current.resume();
  };

  const startMinutes = (min: number) => {
    if (!min || min <= 0) return;
    ensureAudio();
    const ms = Math.round(min * 60_000);
    endAtRef.current = nowMs() + ms;
    setRemainingMs(ms);
    setStatus("running");
  };

  const startCustom = () => {
    const min = parseFloat(customMin);
    if (Number.isFinite(min) && min > 0) startMinutes(min);
  };

  const pause = () => {
    endAtRef.current = null;
    setStatus("paused");
  };

  const resume = () => {
    ensureAudio();
    endAtRef.current = nowMs() + remainingMs;
    setStatus("running");
  };

  const reset = () => {
    stopAlarm();
    endAtRef.current = null;
    setRemainingMs(0);
    setStatus("idle");
  };

  const isDone = status === "done";
  const isActive = status === "running" || status === "paused";

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div
          className={`card w-64 rounded-card p-4 shadow-float ${
            isDone ? "bg-danger-bg motion-reduce:animate-none animate-pulse" : ""
          }`}
          role="group"
          aria-label="Classroom timer"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-paper-400">
              <AlarmClock className="h-3.5 w-3.5" /> Timer
            </h2>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close timer panel"
              className="rounded-md p-1 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-600 focus-visible:shadow-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Countdown / status display */}
          {isDone ? (
            <div className="mb-3 text-center" role="alert">
              <BellRing className="mx-auto h-7 w-7 text-danger" />
              <p className="mt-1 font-display text-2xl font-bold text-danger">
                Time&apos;s up!
              </p>
            </div>
          ) : isActive ? (
            <p
              className="mb-3 text-center font-display text-5xl font-bold tabular-nums text-paper-800"
              aria-live="off"
            >
              {format(remainingMs)}
            </p>
          ) : null}

          {/* Controls */}
          {isDone ? (
            <Button variant="danger" size="sm" className="w-full" onClick={reset}>
              Dismiss
            </Button>
          ) : isActive ? (
            <div className="flex gap-2">
              {status === "running" ? (
                <Button variant="secondary" size="sm" className="flex-1" onClick={pause}>
                  <Pause className="h-4 w-4" /> Pause
                </Button>
              ) : (
                <Button size="sm" className="flex-1" onClick={resume}>
                  <Play className="h-4 w-4" /> Resume
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={reset} aria-label="Reset timer">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((m) => (
                  <Button
                    key={m}
                    variant="secondary"
                    size="sm"
                    onClick={() => startMinutes(m)}
                  >
                    {m} min
                  </Button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  startCustom();
                }}
                className="flex gap-2"
              >
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={customMin}
                  onChange={(e) => setCustomMin(e.target.value)}
                  placeholder="Minutes"
                  aria-label="Custom minutes"
                  className={`w-full ${fieldClassName}`}
                />
                <Button type="submit" size="sm">
                  <Play className="h-4 w-4" /> Start
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Hide timer" : "Show timer"}
        className={`flex h-12 items-center gap-2 rounded-full px-4 font-display font-bold tabular-nums shadow-float outline-none transition-colors focus-visible:shadow-ring ${
          isDone
            ? "bg-danger text-surface motion-reduce:animate-none animate-pulse"
            : "bg-brand-500 text-surface hover:bg-brand-600"
        }`}
      >
        <AlarmClock className="h-5 w-5" />
        {isActive || isDone ? (
          <span className="text-base">
            {isDone ? "0:00" : format(remainingMs)}
          </span>
        ) : null}
      </button>
    </div>
  );
}
