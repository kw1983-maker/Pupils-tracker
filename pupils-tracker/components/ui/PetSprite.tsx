"use client";

import { useState, type CSSProperties } from "react";
import { petEmoji, spriteFor } from "@/lib/pets";

export type PetMotion = "idle" | "egg" | "hero" | "none";

export function motionClass(kind: PetMotion): string {
  if (kind === "idle") return "pet-sprite-idle pet-sprite-motion";
  if (kind === "egg") return "pet-sprite-egg pet-sprite-motion";
  if (kind === "hero") return "pet-sprite-hero pet-sprite-motion";
  return "pet-sprite-motion";
}

/**
 * A pet's picture: the generated sprite when it exists (public/pets/<species>/
 * <stage>.png), falling back to an emoji so the feature works before any art is
 * generated. `species` may be undefined for a pupil who hasn't chosen a pet — an
 * egg stands in for that too.
 *
 * Shared by the Pets tab and the Students-tab cheer popup.
 */
export function PetSprite({
  species,
  stageId,
  px,
  className = "",
  motion = "none",
  floatDelay = 0,
  floatDur,
}: {
  species?: string;
  stageId: string;
  px: number;
  className?: string;
  motion?: PetMotion;
  /** Stagger idle loops so the grid doesn't bob in sync. */
  floatDelay?: number;
  floatDur?: number;
}) {
  const [broken, setBroken] = useState(false);
  const showEmoji = !species || broken;
  const wrapStyle = {
    "--float-delay": `${floatDelay}s`,
    ...(floatDur != null ? { "--float-dur": `${floatDur}s` } : {}),
  } as CSSProperties;

  const face = showEmoji ? (
    <span
      className="inline-flex items-center justify-center leading-none"
      style={{ fontSize: px * 0.82, width: px, height: px }}
      aria-hidden="true"
    >
      {species ? petEmoji(species, stageId) : "🥚"}
    </span>
  ) : (
    // Sprite is a fixed-size static public asset — next/image adds no value here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={spriteFor(species!, stageId)}
      onError={() => setBroken(true)}
      alt=""
      aria-hidden="true"
      width={px}
      height={px}
      className="object-contain"
      style={{ width: px, height: px }}
      draggable={false}
    />
  );

  return (
    <span
      className={`inline-flex ${motionClass(motion)} ${className}`}
      style={wrapStyle}
    >
      {face}
    </span>
  );
}
