"use client";

import { useSyncExternalStore } from "react";

// A shared wall clock that ticks once a minute. It is null during SSR and the
// hydration render (so server and client HTML match), then the current time.

const TICK_MS = 60_000;

let now: Date | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  if (!timer) {
    // Fresh reading when the clock (re)starts, so it is never stale.
    now = new Date();
    timer = setInterval(() => {
      now = new Date();
      listeners.forEach((l) => l());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function getSnapshot() {
  if (!now) now = new Date();
  return now;
}

function getServerSnapshot() {
  return null;
}

/** Current time, refreshed each minute; null until mounted on the client. */
export function useNow(): Date | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
