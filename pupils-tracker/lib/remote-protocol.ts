import type { Tab } from "./types";

/**
 * Commands one signed-in device can send so the others (usually the projector)
 * carry them out. The wire format lives in user_state/{uid}_remote.
 */
export type RemoteCommand =
  | { type: "pick" }
  | { type: "timer"; action: "start"; minutes: number }
  | { type: "timer"; action: "pause" | "resume" | "reset" }
  | { type: "tab"; tab: Tab }
  // Class-control shouts + sounds. Explicit start/stop: the sending device
  // may not share the board's current alarm/bell state.
  | {
      type: "class";
      action: "quiet" | "quiet-stop" | "applause" | "bell" | "bell-stop";
    }
  | { type: "spelling"; action: "next" | "prev" | "play" | "pause" | "stop" }
  | { type: "rules"; action: RulesAction };

export type RulesAction = "spin" | "reveal" | "reset";

/** Envelope written onto the class doc so commands ride the same sync as marks. */
export type BoardCommand = {
  cmdId: string;
  sentBy: string;
  command: RemoteCommand;
  at: number;
};

export function isRemoteCommand(value: unknown): value is RemoteCommand {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return (
    type === "pick" ||
    type === "timer" ||
    type === "tab" ||
    type === "class" ||
    type === "spelling" ||
    type === "rules"
  );
}

export function parseBoardCommand(raw: unknown): BoardCommand | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.cmdId !== "string" || !rec.cmdId) return null;
  if (typeof rec.sentBy !== "string" || !rec.sentBy) return null;
  if (!isRemoteCommand(rec.command)) return null;
  const at = typeof rec.at === "number" ? rec.at : 0;
  return { cmdId: rec.cmdId, sentBy: rec.sentBy, command: rec.command, at };
}

export type ClassControlSink = {
  startHonk: () => void;
  stopHonk: () => void;
  startClap: () => void;
  startChime: () => void;
  stopChime: () => void;
};

export type TimerSink = {
  status: "idle" | "running" | "paused" | "done";
  startMinutes: (min: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setOpen: (open: boolean) => void;
};

/**
 * Play a class-control shout/sound or drive the classroom timer on this
 * device. Returns true when the command was one of those (so the caller can
 * skip the rest of its switch).
 */
export function applyClassOrTimerCommand(
  command: RemoteCommand,
  classControl: ClassControlSink,
  timer: TimerSink
): boolean {
  if (command.type === "class") {
    if (command.action === "quiet") classControl.startHonk();
    else if (command.action === "quiet-stop") classControl.stopHonk();
    else if (command.action === "applause") classControl.startClap();
    else if (command.action === "bell") classControl.startChime();
    else if (command.action === "bell-stop") classControl.stopChime();
    return true;
  }
  if (command.type === "timer") {
    if (command.action === "start") timer.startMinutes(command.minutes);
    // Guards: resuming an idle timer would "finish" it at once and ring.
    else if (command.action === "pause" && timer.status === "running") {
      timer.pause();
    } else if (command.action === "resume" && timer.status === "paused") {
      timer.resume();
    } else if (command.action === "reset") timer.reset();
    timer.setOpen(true);
    return true;
  }
  return false;
}

/** Mutable listener state for user_state/{uid}_remote snapshots. */
export type RemoteListenState = {
  primed: boolean;
  lastId: string | null;
  /** True after any snapshot, including a cache-only one we did not prime on. */
  sawSnapshot: boolean;
};

export function freshRemoteListenState(): RemoteListenState {
  return { primed: false, lastId: null, sawSnapshot: false };
}

/**
 * Decide whether this snapshot is a new command this device should run.
 *
 * A cache-only first snapshot is remembered but not primed: if we primed on
 * cache, coming online later would replay that old command. If we ignored
 * cache entirely, a command that landed while we waited for the server would
 * be treated as the baseline and dropped. Own-device sends are never delivered.
 */
export function nextRemoteDelivery(
  state: RemoteListenState,
  snap: {
    fromCache: boolean;
    cmdId: string | null;
    sentBy?: string;
    command?: Record<string, unknown> | null;
  },
  deviceId: string
): Record<string, unknown> | null {
  if (!state.primed) {
    if (snap.fromCache) {
      state.lastId = snap.cmdId;
      state.sawSnapshot = true;
      return null;
    }
    state.primed = true;
    const landedWhileWaiting =
      state.sawSnapshot && !!snap.cmdId && snap.cmdId !== state.lastId;
    state.lastId = snap.cmdId;
    if (
      landedWhileWaiting &&
      snap.command &&
      snap.sentBy &&
      snap.sentBy !== deviceId
    ) {
      return snap.command;
    }
    return null;
  }
  if (!snap.cmdId || snap.cmdId === state.lastId) return null;
  state.lastId = snap.cmdId;
  if (!snap.command || snap.sentBy === deviceId) return null;
  return snap.command;
}
