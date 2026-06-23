"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type TimerStatus = "idle" | "running" | "paused" | "done";

interface TimerContextValue {
  status: TimerStatus;
  remainingMs: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  startMinutes: (min: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

const nowMs = () => Date.now();

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [remainingMs, setRemainingMs] = useState(0);
  const [open, setOpen] = useState(false);

  const endAtRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const alarmRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const ensureAudio = () => {
    if (!audioRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioRef.current = new Ctx();
    }
    void audioRef.current.resume();
  };

  // Countdown tick
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
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status]);

  // Alarm on done
  useEffect(() => {
    if (status !== "done") return;
    endAtRef.current = null;
    beep();
    alarmRef.current = setInterval(beep, 1200);
    return stopAlarm;
  }, [status, beep, stopAlarm]);

  useEffect(() => stopAlarm, [stopAlarm]);

  const startMinutes = (min: number) => {
    if (!min || min <= 0) return;
    ensureAudio();
    const ms = Math.round(min * 60_000);
    endAtRef.current = nowMs() + ms;
    setRemainingMs(ms);
    setStatus("running");
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

  return (
    <TimerContext.Provider
      value={{ status, remainingMs, open, setOpen, startMinutes, pause, resume, reset }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimerContext(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimerContext must be used inside TimerProvider");
  return ctx;
}
