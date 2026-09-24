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
import type { Tab } from "./types";

/**
 * Board remote: one device (usually the phone) sends a command, every other
 * device signed in to the account (usually the projector) carries it out.
 * Commands go through user_state/{uid}_remote — see lib/firebase.ts.
 */
export type RemoteCommand =
  | { type: "pick" }
  | { type: "timer"; action: "start"; minutes: number }
  | { type: "timer"; action: "pause" | "resume" | "reset" }
  | { type: "tab"; tab: Tab };

type Handler = (command: RemoteCommand) => void;

interface RemoteContextValue {
  send: (command: RemoteCommand) => Promise<boolean>;
  subscribe: (handler: Handler) => () => void;
}

const RemoteContext = createContext<RemoteContextValue | null>(null);

export function RemoteProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const handlers = useRef(new Set<Handler>());

  useEffect(() => {
    if (!user) return;
    return subscribeRemoteCommands(user.uid, getDeviceId(), (raw) => {
      const command = raw as RemoteCommand;
      for (const h of handlers.current) h(command);
    });
  }, [user]);

  const send = useCallback(
    async (command: RemoteCommand) => {
      if (!user) return false;
      try {
        await sendRemoteCommand(user.uid, getDeviceId(), command);
        return true;
      } catch (err) {
        console.error("Remote command failed:", err);
        return false;
      }
    },
    [user]
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
