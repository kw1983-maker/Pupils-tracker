"use client";

import type { ReactNode } from "react";

export type SegmentedOption<T extends string> = {
  id: T;
  label: string;
  icon?: ReactNode;
};

/**
 * Pill-style segmented toggle — the single source of truth for the
 * "two-or-more mutually exclusive options" control used across the app
 * (e.g. Tutor's Speak/Type and image-provider switches).
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  disabled,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-full bg-paper-100 p-0.5"
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold outline-none transition focus-visible:shadow-ring disabled:cursor-not-allowed disabled:opacity-40 ${
              active
                ? "bg-surface text-brand-700 shadow-paper"
                : "text-paper-500 hover:text-paper-700"
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
