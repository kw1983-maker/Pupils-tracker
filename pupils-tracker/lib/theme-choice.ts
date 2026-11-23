/** Pure theme rules, shared by the client hooks and the inline script. */

export type ThemeChoice = "auto" | "light" | "dark";

/** localStorage key for the main app (the phone page keeps its own). */
export const THEME_KEY = "app-theme";

export function isThemeChoice(v: unknown): v is ThemeChoice {
  return v === "auto" || v === "light" || v === "dark";
}

/** True when the dark theme should be on. */
export function resolveTheme(choice: ThemeChoice, systemDark: boolean): boolean {
  return choice === "dark" || (choice === "auto" && systemDark);
}

/**
 * Runs in <body> before the first paint, so a dark page never flashes white.
 * Skips /phone, which manages its own theme (components/phone/PhoneTheme.tsx).
 */
export const THEME_SCRIPT = `(function(){try{if(/^\\/phone(\\/|$)/.test(location.pathname))return;var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`;
