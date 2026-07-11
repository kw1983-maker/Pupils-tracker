"use client";

import { MARKER_CLASSES, markerFor } from "@/components/ui/HighlighterTag";
import { useTracker } from "@/lib/store";

const SIZES = {
  xs: "h-7 w-7 text-2xs",
  sm: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-2xl",
} as const;

// Array.from keeps surrogate pairs (CJK extensions, emoji) intact.
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = Array.from(words[0])[0];
  if (words.length === 1) return first.toUpperCase();
  const last = Array.from(words[words.length - 1])[0];
  return (first + last).toUpperCase();
}

export function Avatar({
  name,
  size = "sm",
  decorative = true,
  highlight,
}: {
  name: string;
  size?: keyof typeof SIZES;
  decorative?: boolean;
  // Performance spotlight: "top" glows gold, "low" pulses alarm-red.
  highlight?: "top" | "low";
}) {
  // Unique-per-class avatar so two pupils never share a face; falls back to the
  // plain name-hash for non-pupil labels (e.g. "Class").
  const { avatarFor } = useTracker();
  const fx =
    highlight === "top"
      ? "avatar-glow"
      : highlight === "low"
        ? "avatar-alarm"
        : "";
  // The glow/alarm ring lives on the inner circle.
  return (
    <span
      className={`relative inline-flex shrink-0 ${SIZES[size]}`}
      aria-hidden={decorative}
      aria-label={decorative ? undefined : name}
    >
      <span
        className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full font-display font-bold ${MARKER_CLASSES[markerFor(name)]} ${SIZES[size]} ${fx}`}
      >
        {/* Initials stay underneath as the fallback while the picture loads
            (or if the avatar files are missing). */}
        {initialsOf(name)}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarFor(name)}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </span>
    </span>
  );
}
