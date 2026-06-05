import { ReactNode } from "react";

export type Marker =
  | "pink"
  | "amber"
  | "green"
  | "blue"
  | "purple"
  | "orange";

const MARKERS: Record<Marker, string> = {
  pink: "bg-mark-pink text-mark-pink-ink",
  amber: "bg-mark-amber text-mark-amber-ink",
  green: "bg-mark-green text-mark-green-ink",
  blue: "bg-mark-blue text-mark-blue-ink",
  purple: "bg-mark-purple text-mark-purple-ink",
  orange: "bg-mark-orange text-mark-orange-ink",
};

// Stable marker pick from an arbitrary string (e.g. assignment title / subject).
const ORDER: Marker[] = ["green", "amber", "blue", "pink", "purple", "orange"];
export function markerFor(key: string): Marker {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return ORDER[Math.abs(hash) % ORDER.length];
}

export function HighlighterTag({
  marker = "green",
  children,
  className = "",
}: {
  marker?: Marker;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-bold ${MARKERS[marker]} ${className}`}
    >
      {children}
    </span>
  );
}
