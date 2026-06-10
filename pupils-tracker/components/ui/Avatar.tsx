import { MARKER_CLASSES, markerFor } from "@/components/ui/HighlighterTag";

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
}: {
  name: string;
  size?: keyof typeof SIZES;
  decorative?: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-bold ${MARKER_CLASSES[markerFor(name)]} ${SIZES[size]}`}
      aria-hidden={decorative}
      aria-label={decorative ? undefined : name}
    >
      {initialsOf(name)}
    </div>
  );
}
