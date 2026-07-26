"use client";

import { useState } from "react";
import { effectSrc } from "@/lib/pet-powers";

/**
 * A superpower's particle art (public/pets/effects/<id>.png).
 *
 * Falls back to the emoji if there is no power or the image fails, so a missing
 * file degrades instead of leaving a blank. Shared by the pet detail modal and
 * the PK arena — the art was originally wired into the modal only, so a duel
 * still threw emoji long after the sprites existed.
 */
export function PowerEffect({
  powerId,
  fallback,
  className = "",
}: {
  /** Power whose sprite to draw; omit to render the fallback. */
  powerId?: string;
  /** Emoji shown when there is no sprite to draw. */
  fallback: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (!powerId || broken) return <>{fallback}</>;
  return (
    // Fixed-size static public asset — next/image adds nothing here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={effectSrc(powerId)}
      alt=""
      aria-hidden="true"
      draggable={false}
      onError={() => setBroken(true)}
      className={`pet-fx-img ${className}`}
    />
  );
}
