"use client";

import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
import { useAnyRemoteCommand } from "@/lib/remote";
import {
  IDLE_TIMER,
  applyTimerCommand,
  formatTimer,
  type TimerMirror,
} from "@/lib/timer-mirror";
import { buzzLong, cancelTimerAlert, scheduleTimerAlert } from "@/lib/native";

// How long "Time's up" stays in the header after the timer ends.
const DONE_SHOW_MS = 60_000;

/**
 * Follows the board's class timer (started from the phone or the board) and
 * buzzes the phone when it runs out: a notification that rings even with the
 * phone locked, plus a long vibration if the app is open. Shows the time left
 * as a small chip in the phone header; renders nothing when no timer runs.
 */
export function PhoneTimer() {
  const [timer, setTimer] = useState<TimerMirror>(IDLE_TIMER);
  const [doneAt, setDoneAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const timerRef = useRef(timer);
  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  // Only a command schedules or cancels the notification — never the timer
  // finishing by itself, or cancel would also remove the "Time's up" alert
  // Android has just shown.
  useAnyRemoteCommand((c) => {
    if (c.type !== "timer") return;
    setDoneAt(null); // any timer action clears an old "Time's up"
    const next = applyTimerCommand(timerRef.current, c, Date.now());
    if (next === timerRef.current) return;
    timerRef.current = next;
    if (next.status === "running") void scheduleTimerAlert(new Date(next.endAt));
    else void cancelTimerAlert();
    setTimer(next);
  });

  // In-app finish: switch the chip to "Time's up" and buzz if open.
  useEffect(() => {
    if (timer.status !== "running") return;
    const { endAt } = timer;
    const id = window.setTimeout(() => {
      // A background tab's timers can fire late; don't buzz on reopening.
      const onTime = Date.now() - endAt < 3000;
      if (onTime && document.visibilityState === "visible") void buzzLong();
      setTimer(IDLE_TIMER);
      setDoneAt(Date.now());
    }, Math.max(0, endAt - Date.now()));
    return () => window.clearTimeout(id);
  }, [timer]);

  // Tick once a second while there is something to show.
  const showing = timer.status !== "idle" || doneAt !== null;
  useEffect(() => {
    if (!showing) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [showing]);

  // Clear "Time's up" after a while.
  useEffect(() => {
    if (doneAt === null) return;
    const id = window.setTimeout(() => setDoneAt(null), DONE_SHOW_MS);
    return () => window.clearTimeout(id);
  }, [doneAt]);

  if (!showing) return null;
  const label =
    timer.status === "running"
      ? formatTimer(timer.endAt - now)
      : timer.status === "paused"
        ? `${formatTimer(timer.remainingMs)} paused`
        : "Time's up";
  const tone =
    timer.status === "idle"
      ? "bg-danger-bg text-danger-ink"
      : timer.status === "paused"
        ? "bg-paper-100 text-paper-600"
        : "bg-brand-50 text-brand-700";

  return (
    <span
      role="timer"
      aria-live="off"
      aria-label={`Class timer: ${label}`}
      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${tone}`}
    >
      <Timer className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
