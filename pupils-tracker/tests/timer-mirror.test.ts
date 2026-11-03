import { describe, expect, it } from "vitest";
import {
  IDLE_TIMER,
  applyTimerCommand,
  formatTimer,
  type TimerMirror,
} from "@/lib/timer-mirror";

const start = (minutes: number) => ({ type: "timer", action: "start", minutes }) as const;
const act = (action: "pause" | "resume" | "reset") => ({ type: "timer", action }) as const;

describe("applyTimerCommand", () => {
  it("start runs for the given minutes", () => {
    expect(applyTimerCommand(IDLE_TIMER, start(5), 1000)).toEqual({
      status: "running",
      endAt: 1000 + 5 * 60_000,
    });
  });

  it("pause keeps what is left, resume carries on from there", () => {
    const running = applyTimerCommand(IDLE_TIMER, start(2), 0);
    const paused = applyTimerCommand(running, act("pause"), 30_000);
    expect(paused).toEqual({ status: "paused", remainingMs: 90_000 });
    expect(applyTimerCommand(paused, act("resume"), 100_000)).toEqual({
      status: "running",
      endAt: 190_000,
    });
  });

  it("ignores pause when not running and resume when not paused", () => {
    expect(applyTimerCommand(IDLE_TIMER, act("pause"), 5)).toBe(IDLE_TIMER);
    expect(applyTimerCommand(IDLE_TIMER, act("resume"), 5)).toBe(IDLE_TIMER);
    const running: TimerMirror = { status: "running", endAt: 50 };
    expect(applyTimerCommand(running, act("resume"), 5)).toBe(running);
  });

  it("reset stops it; other commands and bad minutes change nothing", () => {
    const running: TimerMirror = { status: "running", endAt: 50 };
    expect(applyTimerCommand(running, act("reset"), 5)).toEqual(IDLE_TIMER);
    expect(applyTimerCommand(running, { type: "pick" }, 5)).toBe(running);
    expect(applyTimerCommand(IDLE_TIMER, start(0), 5)).toBe(IDLE_TIMER);
    expect(applyTimerCommand(IDLE_TIMER, start(Number.NaN), 5)).toBe(IDLE_TIMER);
  });
});

describe("formatTimer", () => {
  it("shows minutes and seconds, rounding up", () => {
    expect(formatTimer(245_000)).toBe("4:05");
    expect(formatTimer(500)).toBe("0:01");
    expect(formatTimer(0)).toBe("0:00");
    expect(formatTimer(-10)).toBe("0:00");
  });
});
