import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { THEME_SCRIPT, isThemeChoice, resolveTheme } from "@/lib/theme-choice";

function runScript(pathname: string, saved: string | null, systemDark: boolean) {
  const setAttribute = vi.fn();
  new Function("location", "localStorage", "matchMedia", "document", THEME_SCRIPT)(
    { pathname },
    { getItem: () => saved },
    () => ({ matches: systemDark }),
    { documentElement: { setAttribute } }
  );
  return setAttribute.mock.calls.length > 0;
}

describe("theme choice", () => {
  it("follows the computer only on auto", () => {
    expect(resolveTheme("auto", true)).toBe(true);
    expect(resolveTheme("auto", false)).toBe(false);
    expect(resolveTheme("light", true)).toBe(false);
    expect(resolveTheme("dark", false)).toBe(true);
  });

  it("rejects unknown saved values", () => {
    expect(isThemeChoice("dark")).toBe(true);
    expect(isThemeChoice("blue")).toBe(false);
    expect(isThemeChoice(null)).toBe(false);
  });

  it("the pre-paint script agrees, and starts on light", () => {
    for (const systemDark of [true, false]) {
      expect(runScript("/", null, systemDark)).toBe(false);
      for (const c of ["auto", "light", "dark"] as const)
        expect(runScript("/", c, systemDark)).toBe(resolveTheme(c, systemDark));
    }
  });

  it("the pre-paint script leaves the phone page alone", () => {
    expect(runScript("/phone", "dark", true)).toBe(false);
    expect(runScript("/phone/", "dark", true)).toBe(false);
    expect(runScript("/phones", "dark", true)).toBe(true);
  });
});

// The light block repeats @theme's values so an area can opt out of dark mode.
describe("design tokens", () => {
  const tokens = (css: string, start: string) => {
    const from = css.indexOf(start);
    expect(from).toBeGreaterThan(-1);
    const body = css.slice(from, css.indexOf("}", from));
    return Object.fromEntries(
      [...body.matchAll(/(--(?:color|shadow)-[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]])
    );
  };
  for (const file of ["app/globals.css", "docs/design/tokens.css"]) {
    it(`${file}: the always-light block matches @theme and covers every dark token`, () => {
      const css = readFileSync(file, "utf8");
      const light = tokens(css, '  [data-theme="light"] {');
      const base = tokens(css, "@theme {");
      expect(light).toEqual(base);
      const dark = tokens(css, ':root[data-theme="dark"] {');
      expect(Object.keys(dark).length).toBeGreaterThan(0);
      for (const k of Object.keys(dark)) expect(light).toHaveProperty(k);
    });
  }
});
