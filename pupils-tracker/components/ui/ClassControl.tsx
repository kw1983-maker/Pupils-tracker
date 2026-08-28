"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
import { useEmojiShout } from "./EmojiShout";

// Real sound recordings (Mixkit), served from public/sounds/.
const ALARM_SRC = "/sounds/keep-quiet-alarm.wav";
const APPLAUSE_SRC = "/sounds/applause.wav";
const APPLAUSE_MS = 5000;

export function ClassControl() {
  const { shout, dismiss } = useEmojiShout();
  const [open, setOpen] = useState(false);
  const [honking, setHonking] = useState(false);
  const [clapping, setClapping] = useState(false);
  const [chiming, setChiming] = useState(false);

  const alarmRef = useRef<HTMLAudioElement | null>(null);
  const applauseRef = useRef<HTMLAudioElement | null>(null);
  const clapEnd = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const chimeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ids of the full-screen emoji shouts each tool is currently holding open.
  const honkShout = useRef<number | null>(null);
  const clapShout = useRef<number | null>(null);
  const chimeShout = useRef<number | null>(null);

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
      // If the recording runs short, clear the shout with it rather than letting
      // it hang on until the 5s cap.
      a.addEventListener("ended", () => {
        setClapping(false);
        dismiss(clapShout.current);
        clapShout.current = null;
      });
      applauseRef.current = a;
    }
    return applauseRef.current;
  };

  // --- attention chime (synthesized, loops until stopped) ---
  const chime = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    void ctx.resume();
    const now = ctx.currentTime;
    // A soft two-note bell (a fifth apart): "ding-ding".
    [
      { freq: 880, at: 0 },
      { freq: 1320, at: 0.15 },
    ].forEach(({ freq, at }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + at;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.start(t);
      osc.stop(t + 0.62);
    });
  };

  const stopChime = () => {
    if (chimeTimer.current) {
      clearInterval(chimeTimer.current);
      chimeTimer.current = null;
    }
    dismiss(chimeShout.current);
    chimeShout.current = null;
    setChiming(false);
  };

  const toggleChime = () => {
    if (chiming) {
      stopChime();
      return;
    }
    if (!ctxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctxRef.current = new Ctx();
    }
    chime();
    chimeTimer.current = setInterval(chime, 1300);
    chimeShout.current = shout("🔔", { label: "Eyes on me", hold: true });
    setChiming(true);
  };

  // --- honking alarm (loop until stop) ---
  const stopHonk = () => {
    const a = alarmRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    dismiss(honkShout.current);
    honkShout.current = null;
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
    // Held for the whole looping alarm — the class keeps seeing it until Stop.
    honkShout.current = shout("🤫", {
      label: "Shhh…",
      hold: true,
      tone: "danger",
    });
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
    dismiss(clapShout.current);
    clapShout.current = null;
    setClapping(false);
  };

  const startClap = () => {
    const a = getApplause();
    if (clapEnd.current) clearTimeout(clapEnd.current);
    // Re-press restarts rather than stacking a second shout.
    dismiss(clapShout.current);
    a.currentTime = 0;
    void a.play();
    clapEnd.current = setTimeout(stopClap, APPLAUSE_MS);
    clapShout.current = shout("👏", {
      label: "Well done!",
      ms: APPLAUSE_MS,
      tone: "success",
    });
    setClapping(true);
  };

  // Stop playback / clear timers / drop any held shout on unmount.
  useEffect(() => {
    const held = [honkShout, clapShout, chimeShout];
    return () => {
      alarmRef.current?.pause();
      applauseRef.current?.pause();
      if (clapEnd.current) clearTimeout(clapEnd.current);
      if (chimeTimer.current) clearInterval(chimeTimer.current);
      void ctxRef.current?.close();
      held.forEach((r) => {
        dismiss(r.current);
        r.current = null;
      });
    };
  }, [dismiss]);

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
              <span aria-hidden="true">📣</span> Class control
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
              <span className="text-lg leading-none" aria-hidden="true">
                {honking ? "🔇" : "🤫"}
              </span>
              {honking ? "Stop alarm" : "Keep quiet"}
            </Button>

            <Button
              className={`w-full justify-center ${
                clapping ? "motion-reduce:animate-none animate-pulse" : ""
              }`}
              onClick={startClap}
            >
              <span className="text-lg leading-none" aria-hidden="true">
                👏
              </span>
              {clapping ? "Clapping…" : "Applause"}
            </Button>

            <Button
              variant={chiming ? "danger" : "secondary"}
              className={`w-full justify-center ${
                chiming ? "motion-reduce:animate-none animate-pulse" : ""
              }`}
              onClick={toggleChime}
            >
              <span className="text-lg leading-none" aria-hidden="true">
                {chiming ? "🔕" : "🔔"}
              </span>
              {chiming ? "Stop bell" : "Attention"}
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
        <span className="text-2xl leading-none" aria-hidden="true">
          📣
        </span>
      </button>
    </div>
  );
}
