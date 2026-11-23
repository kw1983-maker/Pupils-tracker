"use client";

import { SegmentedControl, type SegmentedOption } from "@/components/ui/SegmentedControl";
import { useThemeChoice } from "@/lib/theme";
import type { ThemeChoice } from "@/lib/theme-choice";

const OPTIONS: SegmentedOption<ThemeChoice>[] = [
  { id: "auto", label: "Same as computer" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

/** Theme choice for this device, shown in the "•••" menu. */
export function ThemePicker() {
  const { choice, setChoice } = useThemeChoice();
  return (
    <div className="px-3 py-2">
      <p className="mb-2 text-sm font-semibold text-paper-700">Theme</p>
      <SegmentedControl
        value={choice}
        onChange={setChoice}
        options={OPTIONS}
        ariaLabel="Theme"
      />
    </div>
  );
}
