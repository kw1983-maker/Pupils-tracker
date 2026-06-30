"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ReadAloudStatus = "idle" | "speaking" | "paused";

const hasSpeech = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * Thin wrapper over the browser's built-in Web Speech API (speechSynthesis) —
 * no API key, no cost. Reads a slower-than-default rate suited to young pupils
 * and prefers an English voice. Speech is cancelled on unmount.
 */
export function useReadAloud() {
  const [status, setStatus] = useState<ReadAloudStatus>("idle");
  // Lazy init (not an effect): the read-aloud UI only mounts client-side once a
  // PDF is open, so there's no SSR/hydration output to mismatch.
  const [supported] = useState(() => hasSpeech());
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (!hasSpeech()) return;
    window.speechSynthesis.cancel();
    utterRef.current = null;
    setStatus("idle");
  }, []);

  const speak = useCallback((text: string) => {
    if (!hasSpeech() || !text.trim()) return;
    const synth = window.speechSynthesis;
    synth.cancel(); // never let two utterances overlap
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85; // a touch slower for 6–8 year olds
    u.pitch = 1;
    const voices = synth.getVoices();
    const en =
      voices.find((v) => /^en[-_]/i.test(v.lang)) ??
      voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
    if (en) u.voice = en;
    u.onend = () => setStatus("idle");
    u.onerror = () => setStatus("idle");
    utterRef.current = u;
    synth.speak(u);
    setStatus("speaking");
  }, []);

  const pause = useCallback(() => {
    if (!hasSpeech()) return;
    window.speechSynthesis.pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    if (!hasSpeech()) return;
    window.speechSynthesis.resume();
    setStatus("speaking");
  }, []);

  // Stop any speech if the host component unmounts.
  useEffect(
    () => () => {
      if (hasSpeech()) window.speechSynthesis.cancel();
    },
    []
  );

  return { status, supported, speak, pause, resume, stop };
}
