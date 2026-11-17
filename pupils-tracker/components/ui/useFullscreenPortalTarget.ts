"use client";

import { useEffect, useState } from "react";

const current = () =>
  (document.fullscreenElement as HTMLElement | null) ?? document.body;

/**
 * Where an overlay should portal to: `document.body` normally, but the
 * fullscreen element while one is active — anything portaled to <body> is
 * invisible during fullscreen (Present mode, the Phonics full-screen stage).
 * Null only during server rendering.
 */
export function useFullscreenPortalTarget(): HTMLElement | null {
  const [target, setTarget] = useState<HTMLElement | null>(() =>
    typeof document === "undefined" ? null : current()
  );

  useEffect(() => {
    const update = () => setTarget(current());
    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  return target;
}
