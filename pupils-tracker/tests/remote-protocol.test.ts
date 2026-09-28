import { describe, expect, it, vi } from "vitest";
import {
  applyClassOrTimerCommand,
  freshRemoteListenState,
  nextRemoteDelivery,
  type ClassControlSink,
  type RemoteCommand,
  type TimerSink,
} from "@/lib/remote-protocol";

function sinks() {
  const classControl: ClassControlSink = {
    startHonk: vi.fn(),
    stopHonk: vi.fn(),
    startClap: vi.fn(),
    startChime: vi.fn(),
    stopChime: vi.fn(),
  };
  const timer: TimerSink = {
    status: "idle",
    startMinutes: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    reset: vi.fn(),
    setOpen: vi.fn(),
  };
  return { classControl, timer };
}

describe("applyClassOrTimerCommand", () => {
  it("starts and stops the keep-quiet alarm", () => {
    const { classControl, timer } = sinks();
    expect(
      applyClassOrTimerCommand(
        { type: "class", action: "quiet" },
        classControl,
        timer
      )
    ).toBe(true);
    expect(classControl.startHonk).toHaveBeenCalledOnce();
    applyClassOrTimerCommand(
      { type: "class", action: "quiet-stop" },
      classControl,
      timer
    );
    expect(classControl.stopHonk).toHaveBeenCalledOnce();
    expect(timer.startMinutes).not.toHaveBeenCalled();
  });

  it("plays applause and the attention bell", () => {
    const { classControl, timer } = sinks();
    applyClassOrTimerCommand(
      { type: "class", action: "applause" },
      classControl,
      timer
    );
    applyClassOrTimerCommand(
      { type: "class", action: "bell" },
      classControl,
      timer
    );
    applyClassOrTimerCommand(
      { type: "class", action: "bell-stop" },
      classControl,
      timer
    );
    expect(classControl.startClap).toHaveBeenCalledOnce();
    expect(classControl.startChime).toHaveBeenCalledOnce();
    expect(classControl.stopChime).toHaveBeenCalledOnce();
  });

  it("starts a timer and opens the panel", () => {
    const { classControl, timer } = sinks();
    applyClassOrTimerCommand(
      { type: "timer", action: "start", minutes: 5 },
      classControl,
      timer
    );
    expect(timer.startMinutes).toHaveBeenCalledWith(5);
    expect(timer.setOpen).toHaveBeenCalledWith(true);
  });

  it("pauses only a running timer and resumes only a paused one", () => {
    const { classControl, timer } = sinks();
    applyClassOrTimerCommand(
      { type: "timer", action: "pause" },
      classControl,
      timer
    );
    expect(timer.pause).not.toHaveBeenCalled();

    timer.status = "running";
    applyClassOrTimerCommand(
      { type: "timer", action: "pause" },
      classControl,
      timer
    );
    expect(timer.pause).toHaveBeenCalledOnce();

    applyClassOrTimerCommand(
      { type: "timer", action: "resume" },
      classControl,
      timer
    );
    expect(timer.resume).not.toHaveBeenCalled();

    timer.status = "paused";
    applyClassOrTimerCommand(
      { type: "timer", action: "resume" },
      classControl,
      timer
    );
    expect(timer.resume).toHaveBeenCalledOnce();
  });

  it("leaves pick and tab commands to other handlers", () => {
    const { classControl, timer } = sinks();
    const pick: RemoteCommand = { type: "pick" };
    const tab: RemoteCommand = { type: "tab", tab: "dashboard" };
    expect(applyClassOrTimerCommand(pick, classControl, timer)).toBe(false);
    expect(applyClassOrTimerCommand(tab, classControl, timer)).toBe(false);
  });
});

const phone = "phone-device";
const board = "board-device";
const quiet = { type: "class", action: "quiet" };

describe("nextRemoteDelivery", () => {
  it("does not replay the server baseline already on the board", () => {
    const state = freshRemoteListenState();
    expect(
      nextRemoteDelivery(
        state,
        { fromCache: false, cmdId: "old", sentBy: phone, command: quiet },
        board
      )
    ).toBeNull();
    expect(
      nextRemoteDelivery(
        state,
        { fromCache: false, cmdId: "old", sentBy: phone, command: quiet },
        board
      )
    ).toBeNull();
  });

  it("delivers a later command from the other device", () => {
    const state = freshRemoteListenState();
    nextRemoteDelivery(
      state,
      { fromCache: false, cmdId: "old", sentBy: phone, command: quiet },
      board
    );
    expect(
      nextRemoteDelivery(
        state,
        { fromCache: false, cmdId: "new", sentBy: phone, command: quiet },
        board
      )
    ).toEqual(quiet);
  });

  it("ignores this device's own sends", () => {
    const state = freshRemoteListenState();
    nextRemoteDelivery(
      state,
      { fromCache: false, cmdId: "0", sentBy: board, command: quiet },
      board
    );
    expect(
      nextRemoteDelivery(
        state,
        { fromCache: false, cmdId: "1", sentBy: board, command: quiet },
        board
      )
    ).toBeNull();
  });

  it("does not replay a cache snapshot, but still delivers a command that lands while waiting for the server", () => {
    const state = freshRemoteListenState();
    expect(
      nextRemoteDelivery(
        state,
        { fromCache: true, cmdId: "cached", sentBy: phone, command: quiet },
        board
      )
    ).toBeNull();
    // A new command arrived before the server confirmed the cached doc.
    // The old listener treated this as the baseline and dropped it.
    expect(
      nextRemoteDelivery(
        state,
        { fromCache: false, cmdId: "live", sentBy: phone, command: quiet },
        board
      )
    ).toEqual(quiet);
  });

  it("does not replay when the server confirms the same cached command", () => {
    const state = freshRemoteListenState();
    nextRemoteDelivery(
      state,
      { fromCache: true, cmdId: "cached", sentBy: phone, command: quiet },
      board
    );
    expect(
      nextRemoteDelivery(
        state,
        { fromCache: false, cmdId: "cached", sentBy: phone, command: quiet },
        board
      )
    ).toBeNull();
  });
});
