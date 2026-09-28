"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useAuth, getDeviceId } from "./auth";
import { sendRemoteCommand, subscribeRemoteCommands } from "./firebase";
import type { RemoteCommand } from "./remote-protocol";
import { isRemoteCommand } from "./remote-protocol";
import { useTracker } from "./store";

export type { RemoteCommand, RulesAction } from "./remote-protocol";
export { applyClassOrTimerCommand } from "./remote-protocol";

/**
 * Board remote: one device (usually the phone) sends a command, every other
 * device signed in to the account (usually the projector) carries it out.
 *
 * Commands go out on three paths so they still arrive if one misses:
 *  1. user_state/{uid}_remote (the original dedicated doc)
 *  2. user_state/{uid}_metadata.remote (the account doc class-list already uses)
 *  3. the open class doc's boardCommand field (the same live sync as plus/minus)
 *
 * The class-control megaphone and the timer on the floating toolbar send the
 * same commands, so tapping Keep quiet / Attention / Start on the phone also
 * plays on the board — not only the Board remote menu.
 */

type Handler = (command: RemoteCommand) => void;

interface RemoteContextValue {
  send: (command: RemoteCommand) => Promise<boolean>;
  subscribe: (handler: Handler) => () => void;
}

const RemoteContext = createContext<RemoteContextValue | null>(null);

function newCmdId(): string {
  return Math.random().toString(36).slice(2);
}

export function RemoteProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { teacherId, publishBoardCommand, remoteBoardCommand } = useTracker();
  const handlers = useRef(new Set<Handler>());
  const seenCmdIds = useRef(new Set<string>());

  const emit = useCallback((command: RemoteCommand, cmdId: string) => {
    if (cmdId) {
      if (seenCmdIds.current.has(cmdId)) return;
      seenCmdIds.current.add(cmdId);
      if (seenCmdIds.current.size > 40) {
        const oldest = seenCmdIds.current.values().next().value;
        if (oldest) seenCmdIds.current.delete(oldest);
      }
    }
    for (const h of handlers.current) h(command);
  }, []);

  const accountId = teacherId || user?.uid || null;

  useEffect(() => {
    if (!accountId) return;
    const deviceId = getDeviceId();
    return subscribeRemoteCommands(accountId, deviceId, (raw, cmdId) => {
      if (!isRemoteCommand(raw)) return;
      emit(raw, cmdId);
    });
  }, [accountId, emit]);

  // Commands that arrived on the class doc (same path as plus/minus marks).
  useEffect(() => {
    if (!remoteBoardCommand) return;
    emit(remoteBoardCommand.command, remoteBoardCommand.cmdId);
  }, [remoteBoardCommand, emit]);

  const send = useCallback(
    async (command: RemoteCommand) => {
      const deviceId = getDeviceId();
      const cmdId = newCmdId();
      publishBoardCommand({
        cmdId,
        sentBy: deviceId,
        command,
        at: Date.now(),
      });
      if (!accountId) return true;
      try {
        await sendRemoteCommand(
          accountId,
          deviceId,
          command as unknown as Record<string, unknown>,
          cmdId
        );
        return true;
      } catch (err) {
        console.error("Remote command failed:", err);
        // The class-doc stamp above still syncs the way marks do.
        return true;
      }
    },
    [accountId, publishBoardCommand]
  );

  const subscribe = useCallback((handler: Handler) => {
    handlers.current.add(handler);
    return () => {
      handlers.current.delete(handler);
    };
  }, []);

  return (
    <RemoteContext.Provider value={{ send, subscribe }}>
      {children}
    </RemoteContext.Provider>
  );
}

/** Send a command to the other devices. Resolves false if it couldn't be sent. */
export function useRemoteSend() {
  const ctx = useContext(RemoteContext);
  if (!ctx) throw new Error("useRemoteSend must be used within RemoteProvider");
  return ctx.send;
}

/**
 * Same as useRemoteSend, but a no-op when no RemoteProvider is mounted
 * (toolbar tools still play locally).
 */
export function useRemoteSendOptional() {
  const ctx = useContext(RemoteContext);
  return ctx?.send ?? (async () => false);
}

/** Run `handler` for every command arriving from another device. */
export function useRemoteCommand(handler: Handler) {
  const ctx = useContext(RemoteContext);
  if (!ctx) throw new Error("useRemoteCommand must be used within RemoteProvider");
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  const { subscribe } = ctx;
  useEffect(() => subscribe((c) => latest.current(c)), [subscribe]);
}
