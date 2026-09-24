"use client";

import { useState } from "react";
import { Monitor, Pause, Play, RotateCcw, Timer, Wand2 } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { usePicker } from "./PupilPicker";
import { useTimerContext } from "@/lib/useTimer";
import { useRemoteCommand, useRemoteSend, type RemoteCommand } from "@/lib/remote";
import type { Tab } from "@/lib/types";

const TIMER_PRESETS = [1, 2, 3, 5, 10];

/**
 * Carries out board-remote commands on this device (the projector side):
 * pick a pupil, run the timer. Tab switching is handled by the Shell, which
 * owns the active tab. Renders nothing.
 */
export function RemoteReceiver() {
  const timer = useTimerContext();
  const picker = usePicker();
  useRemoteCommand((c) => {
    if (c.type === "pick") {
      if (picker.phase === "spinning") return;
      picker.setOpen(true);
      picker.spin();
    } else if (c.type === "timer") {
      if (c.action === "start") timer.startMinutes(c.minutes);
      // Guards: resuming an idle timer would "finish" it at once and ring.
      else if (c.action === "pause" && timer.status === "running") timer.pause();
      else if (c.action === "resume" && timer.status === "paused") timer.resume();
      else if (c.action === "reset") timer.reset();
      timer.setOpen(true);
    }
  });
  return null;
}

/**
 * The phone side: buttons that drive whichever other device is showing the
 * app (usually the projector).
 */
export function BoardRemoteModal({
  isOpen,
  onClose,
  tabs,
}: {
  isOpen: boolean;
  onClose: () => void;
  tabs: { id: Tab; label: string }[];
}) {
  const send = useRemoteSend();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (command: RemoteCommand, done: string) => {
    setStatus(null);
    const ok = await send(command);
    setStatus(
      ok
        ? { ok, text: done }
        : { ok, text: "Couldn't reach the board — check your connection." }
    );
  };

  const sectionTitle =
    "mb-2 flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-paper-400";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Board remote"
      titleIcon={<Monitor className="h-5 w-5 text-brand-500" />}
    >
      <p className="mb-4 text-sm text-paper-500">
        Controls the app on your other open screen, like the projector. Keep it
        open there, signed in to the same account.
      </p>

      <section className="mb-5">
        <h3 className={sectionTitle}>
          <span aria-hidden="true">🎲</span> Pick a pupil
        </h3>
        <Button
          className="w-full"
          onClick={() => run({ type: "pick" }, "Picking on the board…")}
        >
          <Wand2 className="h-4 w-4" />
          Pick someone
        </Button>
      </section>

      <section className="mb-5">
        <h3 className={sectionTitle}>
          <Timer className="h-3.5 w-3.5" /> Timer
        </h3>
        <div className="mb-2 grid grid-cols-5 gap-2">
          {TIMER_PRESETS.map((m) => (
            <Button
              key={m}
              variant="secondary"
              onClick={() =>
                run(
                  { type: "timer", action: "start", minutes: m },
                  `${m}-minute timer started on the board`
                )
              }
            >
              {m}m
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="ghost"
            onClick={() => run({ type: "timer", action: "pause" }, "Timer paused")}
          >
            <Pause className="h-4 w-4" /> Pause
          </Button>
          <Button
            variant="ghost"
            onClick={() => run({ type: "timer", action: "resume" }, "Timer resumed")}
          >
            <Play className="h-4 w-4" /> Resume
          </Button>
          <Button
            variant="ghost"
            onClick={() => run({ type: "timer", action: "reset" }, "Timer reset")}
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </section>

      <section>
        <h3 className={sectionTitle}>
          <Monitor className="h-3.5 w-3.5" /> Show on the board
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant="secondary"
              size="sm"
              onClick={() =>
                run({ type: "tab", tab: t.id }, `Board is showing ${t.label}`)
              }
            >
              {t.label}
            </Button>
          ))}
        </div>
      </section>

      {status && (
        <p
          role="status"
          className={`mt-4 text-sm font-semibold ${
            status.ok ? "text-success-ink" : "text-danger-ink"
          }`}
        >
          {status.text}
        </p>
      )}
    </Modal>
  );
}
