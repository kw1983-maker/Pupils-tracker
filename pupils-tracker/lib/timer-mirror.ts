import type { RemoteCommand } from "./remote-protocol";

/**
 * The phone's copy of the board's classroom timer, rebuilt from the timer
 * commands that pass through the remote channel (sent from the phone or the
 * board's own toolbar). Same rules as lib/useTimer.tsx and
 * applyClassOrTimerCommand: pause only while running, resume only while paused.
 */
export type TimerMirror =
  | { status: "idle" }
  | { status: "running"; endAt: number }
  | { status: "paused"; remainingMs: number };

export const IDLE_TIMER: TimerMirror = { status: "idle" };

export function applyTimerCommand(
  state: TimerMirror,
  command: RemoteCommand,
  now: number
): TimerMirror {
  if (command.type !== "timer") return state;
  switch (command.action) {
    case "start": {
      const ms = command.minutes * 60_000;
      return Number.isFinite(ms) && ms > 0
        ? { status: "running", endAt: now + ms }
        : state;
    }
    case "pause":
      return state.status === "running"
        ? { status: "paused", remainingMs: Math.max(0, state.endAt - now) }
        : state;
    case "resume":
      return state.status === "paused"
        ? { status: "running", endAt: now + state.remainingMs }
        : state;
    case "reset":
      return IDLE_TIMER;
  }
}

/** "4:05" for 245 000 ms (rounded up, so it reads 0:01 until it is done). */
export function formatTimer(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
