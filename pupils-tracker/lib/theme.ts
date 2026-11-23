"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { THEME_KEY, isThemeChoice, resolveTheme, type ThemeChoice } from "./theme-choice";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The device's own light/dark setting, live. */
export function subscribeSystemDark(onChange: () => void) {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
export const systemDarkNow = () => window.matchMedia(DARK_QUERY).matches;

/**
 * Dark sets data-theme="dark" on <html> (popups render in a portal under
 * <body>, so the root is the only place that covers them); the dark token
 * values live in app/globals.css.
 */
export function setRootTheme(dark: boolean) {
  const root = document.documentElement;
  if (dark) root.dataset.theme = "dark";
  else delete root.dataset.theme;
}

// Kept in memory too, so the choice still works when storage is unavailable.
let memoryChoice: ThemeChoice | null = null;
const listeners = new Set<() => void>();

function readChoice(): ThemeChoice {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (isThemeChoice(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return memoryChoice ?? "light";
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab of the app changed it.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

const serverChoice = (): ThemeChoice => "light";

/** The main app's theme choice on this device. */
export function useThemeChoice() {
  const choice = useSyncExternalStore(subscribe, readChoice, serverChoice);
  const setChoice = useCallback((next: ThemeChoice) => {
    memoryChoice = next;
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* storage unavailable — lasts until the page is reloaded */
    }
    listeners.forEach((l) => l());
  }, []);
  return { choice, setChoice };
}

/**
 * Keeps <html> in step with the saved choice while the main app is open. Reads
 * the choice directly rather than through React state, so hydration never
 * drops the theme the inline script in app/layout.tsx already applied.
 */
export function useApplyTheme() {
  useEffect(() => {
    const apply = () => setRootTheme(resolveTheme(readChoice(), systemDarkNow()));
    apply();
    const offChoice = subscribe(apply);
    const offSystem = subscribeSystemDark(apply);
    return () => {
      offChoice();
      offSystem();
      setRootTheme(false);
    };
  }, []);
}
