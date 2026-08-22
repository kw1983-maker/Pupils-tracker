"use client";

import type { CSSProperties, ReactNode } from "react";

/** Comic 24-point star burst with optional label (storyboard + live PK). */
export function StarBurst({
  x,
  y,
  size,
  scale,
  label,
  color,
  className,
  style,
}: {
  x?: number | string;
  y?: number | string;
  size: number;
  scale: number;
  label?: string;
  color: string;
  className?: string;
  style?: CSSProperties;
}) {
  const pts: string[] = [];
  const n = 12;
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 50 : 26;
    pts.push(`${50 + Math.cos(a) * r}% ${50 + Math.sin(a) * r}%`);
  }
  const positioned =
    x !== undefined && y !== undefined
      ? ({
          position: "absolute" as const,
          left: x,
          top: y,
          marginLeft: -size / 2,
          marginTop: -size / 2,
        } as const)
      : {};

  return (
    <div
      className={className}
      style={{
        ...positioned,
        width: size,
        height: size,
        transform: `scale(${scale}) rotate(${(1 - scale) * 40}deg)`,
        clipPath: `polygon(${pts.join(",")})`,
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 40px rgba(255,220,120,0.6)",
        pointerEvents: "none",
        ...style,
      }}
      aria-hidden="true"
    >
      {label ? (
        <span
          className="font-arcade"
          style={{
            color: "#fff",
            fontSize: size * 0.2,
            letterSpacing: "0.02em",
            textShadow: "0 3px 0 rgba(0,0,0,0.35)",
            transform: "translateY(2px)",
          }}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}

/** Arcade slam text (Luckiest Guy via --font-arcade). */
export function ComicText({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`font-arcade pointer-events-none absolute inset-0 flex items-center justify-center ${className ?? ""}`}
      style={style}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

export function ScreenVignette({
  intensity = 0.65,
}: {
  intensity?: number;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5]"
      style={{
        boxShadow: `inset 0 0 260px 80px rgba(0,0,0,${intensity})`,
      }}
      aria-hidden="true"
    />
  );
}

export function ScreenDarken({ opacity }: { opacity: number }) {
  if (opacity <= 0) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[6] bg-black"
      style={{ opacity }}
      aria-hidden="true"
    />
  );
}

export function WhiteFlash({ opacity }: { opacity: number }) {
  if (opacity <= 0) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[20] bg-white"
      style={{ opacity }}
      aria-hidden="true"
    />
  );
}

export function HeartbeatPulse({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[7]"
      style={{
        boxShadow: `inset 0 0 200px 70px rgba(220,30,40,${amount * 0.5})`,
        opacity: amount,
      }}
      aria-hidden="true"
    />
  );
}

/** Impact labels cycled for live PK rounds. */
export const IMPACT_LABELS = ["POW", "BAM", "HIT", "WHAM"] as const;

export function impactLabelFor(round: number): string {
  return IMPACT_LABELS[((round % IMPACT_LABELS.length) + IMPACT_LABELS.length) % IMPACT_LABELS.length]!;
}
