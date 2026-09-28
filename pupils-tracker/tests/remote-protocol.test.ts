import { describe, expect, it, vi } from "vitest";
import {
  applyClassOrTimerCommand,
  applyPickCommand,
  freshRemoteListenState,
  isRemoteCommand,
  nextRemoteDelivery,
  parseBoardCommand,
  resolvePickedPupil,
  type ClassControlSink,
  type PickerSink,
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

function pickerSink(): PickerSink {
  return {
    phase: "idle",
    setOpen: vi.fn(),
    spin: vi.fn(),
  };
}

describe("applyPickCommand", () => {
  it("opens the picker and spins, landing on the given pupil", () => {
    const picker = pickerSink();
    expect(
      applyPickCommand({ type: "pick", pupilId: "p1" }, picker)
    ).toBe(true);
    expect(picker.setOpen).toHaveBeenCalledWith(true);
    expect(picker.spin).toHaveBeenCalledWith("p1");
  });

  it("spins without a pupil id when the phone did not choose one", () => {
    const picker = pickerSink();
    applyPickCommand({ type: "pick" }, picker);
    expect(picker.spin).toHaveBeenCalledWith(undefined);
  });

  it("does not start a second spin while one is already running", () => {
    const picker = pickerSink();
    picker.phase = "spinning";
    expect(applyPickCommand({ type: "pick", pupilId: "p1" }, picker)).toBe(
      true
    );
    expect(picker.spin).not.toHaveBeenCalled();
  });

  it("ignores class-control commands", () => {
    const picker = pickerSink();
    expect(
      applyPickCommand({ type: "class", action: "quiet" }, picker)
    ).toBe(false);
    expect(picker.spin).not.toHaveBeenCalled();
  });
});

describe("isRemoteCommand pick", () => {
  it("accepts a pick with or without pupilId", () => {
    expect(isRemoteCommand({ type: "pick" })).toBe(true);
    expect(isRemoteCommand({ type: "pick", pupilId: "abc" })).toBe(true);
  });

  it("rejects a pick with a non-string pupilId", () => {
    expect(isRemoteCommand({ type: "pick", pupilId: 3 })).toBe(false);
  });
});

describe("resolvePickedPupil", () => {
  const pupils = [
    { id: "a", name: "Ali" },
    { id: "b", name: "Ben" },
    { id: "c", name: "Cai" },
  ];

  it("lands on the pupilId the phone already chose", () => {
    const result = resolvePickedPupil(pupils, [], true, "b");
    expect(result?.chosen.id).toBe("b");
  });

  it("still honours pupilId even if that pupil was already drawn this round", () => {
    const result = resolvePickedPupil(pupils, ["b"], true, "b");
    expect(result?.chosen.id).toBe("b");
  });

  it("returns null when the class is empty", () => {
    expect(resolvePickedPupil([], [], true)).toBeNull();
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

describe("parseBoardCommand", () => {
  it("accepts a class-control envelope stamped on the class doc", () => {
    expect(
      parseBoardCommand({
        cmdId: "abc",
        sentBy: "phone",
        command: { type: "class", action: "quiet" },
        at: 1,
      })
    ).toEqual({
      cmdId: "abc",
      sentBy: "phone",
      command: { type: "class", action: "quiet" },
      at: 1,
    });
  });

  it("rejects missing or garbage envelopes", () => {
    expect(parseBoardCommand(null)).toBeNull();
    expect(parseBoardCommand({ cmdId: "x" })).toBeNull();
    expect(
      parseBoardCommand({
        cmdId: "x",
        sentBy: "phone",
        command: { type: "nope" },
      })
    ).toBeNull();
  });

  it("accepts a pick stamped with the chosen pupil", () => {
    expect(
      parseBoardCommand({
        cmdId: "pick1",
        sentBy: "phone",
        command: { type: "pick", pupilId: "s-12" },
        at: 9,
      })
    ).toEqual({
      cmdId: "pick1",
      sentBy: "phone",
      command: { type: "pick", pupilId: "s-12" },
      at: 9,
    });
  });
});
