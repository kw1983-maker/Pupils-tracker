"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { prefGet, prefSet } from "@/lib/native";

type ThemeChoice = "auto" | "light" | "dark";

const PREF_KEY = "phone-theme";
const ORDER: ThemeChoice[] = ["auto", "light", "dark"];
const LABEL: Record<ThemeChoice, string> = {
  auto: "Theme: same as phone",
  light: "Theme: light",
  dark: "Theme: dark",
};
const ICON = { auto: Monitor, light: Sun, dark: Moon };

const DARK_QUERY = "(prefers-color-scheme: dark)";

// The phone's own light/dark setting, live.
function subscribeSystemDark(onChange: () => void) {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const systemDarkNow = () => window.matchMedia(DARK_QUERY).matches;
const systemDarkOnServer = () => false;

/**
 * Header button cycling the phone page's theme: same as the phone (default)
 * → light → dark. Dark sets data-theme="dark" on <html> (popups render in a
 * portal under <body>, so the root is the only place that covers them); the
 * dark token values live in app/globals.css. Removed again on unmount, so the
 * board page never inherits it. Remembered per device.
 */
export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>("auto");
  const systemDark = useSyncExternalStore(
    subscribeSystemDark,
    systemDarkNow,
    systemDarkOnServer
  );

  useEffect(() => {
    void prefGet(PREF_KEY).then((v) => {
      if (v === "auto" || v === "light" || v === "dark") setChoice(v);
    });
  }, []);

  const dark = choice === "dark" || (choice === "auto" && systemDark);
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.dataset.theme = "dark";
    else delete root.dataset.theme;
    return () => {
      delete root.dataset.theme;
    };
  }, [dark]);

  const next = () => {
    const n = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];
    setChoice(n);
    void prefSet(PREF_KEY, n);
  };

  const Icon = ICON[choice];
  return (
    <button
      type="button"
      onClick={next}
      aria-label={LABEL[choice]}
      title={LABEL[choice]}
      className="flex h-9 w-9 items-center justify-center rounded-md text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-700 focus-visible:shadow-ring"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
