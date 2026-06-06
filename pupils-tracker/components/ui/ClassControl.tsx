"use client";

import { useEffect, useRef, useState } from "react";
import { Megaphone, Siren, PartyPopper, VolumeX, X } from "lucide-react";
import { Button } from "./Button";

// Real sound recordings (Mixkit), served from public/sounds/.
const ALARM_SRC = "/sounds/keep-quiet-alarm.wav";
const APPLAUSE_SRC = "/sounds/applause.wav";
const APPLAUSE_MS = 5000;

export function ClassControl() {
  const [open, setOpen] = useState(false);
  const [honking, setHonking] = useState(false);
  const [clapping, setClapping] = useState(false);

  const alarmRef = useRef<HTMLAudioElement | null>(null);
  const applauseRef = useRef<HTMLAudioElement | null>(null);
  const clapEnd = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lazily create the audio elements (browser only). The alarm loops continuously
  // until stopped; the applause is capped at 5s by a timeout.
  const getAlarm = () => {
    if (!alarmRef.current) {
      const a = new Audio(ALARM_SRC);
      a.loop = true;
      alarmRef.current = a;
    }
    return alarmRef.current;
  };
  const getApplause = () => {
    if (!applauseRef.current) {
      const a = new Audio(APPLAUSE_SRC);
      a.addEventListener("ended", () => setClapping(false));
      applauseRef.current = a;
    }
    return applauseRef.current;
  };

  // --- honking alarm (loop until stop) ---
  const stopHonk = () => {
    const a = alarmRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setHonking(false);
  };

  const toggleHonk = () => {
    if (honking) {
      stopHonk();
      return;
    }
    const a = getAlarm();
    a.currentTime = 0;
    void a.play();
    setHonking(true);
  };

  // --- applause (5s, restart on re-press) ---
  const stopClap = () => {
    const a = applauseRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    if (clapEnd.current) {
      clearTimeout(clapEnd.current);
      clapEnd.current = null;
    }
    setClapping(false);
  };

  const startClap = () => {
    const a = getApplause();
    if (clapEnd.current) clearTimeout(clapEnd.current);
    a.currentTime = 0;
    void a.play();
    clapEnd.current = setTimeout(stopClap, APPLAUSE_MS);
    setClapping(true);
  };

  // Stop playback / clear timer on unmount.
  useEffect(() => {
    return () => {
      alarmRef.current?.pause();
      applauseRef.current?.pause();
      if (clapEnd.current) clearTimeout(clapEnd.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-end gap-2">
      {open && (
        <div
          className="card w-64 rounded-card p-4 shadow-float"
          role="group"
          aria-label="Class control"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-paper-400">
              <Megaphone className="h-3.5 w-3.5" /> Class control
            </h2>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close class control panel"
              className="rounded-md p-1 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-600 focus-visible:shadow-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <Button
              variant={honking ? "danger" : "secondary"}
              className={`w-full justify-center ${
                honking ? "motion-reduce:animate-none animate-pulse" : ""
              }`}
              onClick={toggleHonk}
            >
              {honking ? (
                <>
                  <VolumeX className="h-4 w-4" /> Stop alarm
                </>
              ) : (
                <>
                  <Siren className="h-4 w-4" /> Keep quiet
                </>
              )}
            </Button>

            <Button
              className={`w-full justify-center ${
                clapping ? "motion-reduce:animate-none animate-pulse" : ""
              }`}
              onClick={startClap}
            >
              <PartyPopper className="h-4 w-4" />
              {clapping ? "Clapping…" : "Applause"}
            </Button>
          </div>
        </div>
      )}

      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Hide class control" : "Show class control"}
        className={`flex h-12 w-12 items-center justify-center rounded-full shadow-float outline-none transition-colors focus-visible:shadow-ring ${
          honking
            ? "bg-danger text-surface motion-reduce:animate-none animate-pulse"
            : "bg-brand-500 text-surface hover:bg-brand-600"
        }`}
      >
        <Megaphone className="h-5 w-5" />
      </button>
    </div>
  );
}
