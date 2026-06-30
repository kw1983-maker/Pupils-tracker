"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Minus, Plus, X } from "lucide-react";
import { BehaviorType } from "@/lib/types";
import { BEHAVIOR_OPTIONS, BEHAVIOR_POINTS } from "@/lib/behaviors";
import { fieldClassName } from "@/components/ui/Field";
import { useCelebrate } from "@/components/ui/Celebration";
import { playWomp } from "@/lib/sound";

/**
 * Award the same points/reason to a chosen set of pupils (or the whole class)
 * in one action. Like BehaviorPointsModal, tapping a reason tile commits — but
 * the points amount is adjustable first (default ±2). Celebrates once.
 */
export function MultiAwardModal({
  count,
  onConfirm,
  onClose,
}: {
  /** How many pupils are selected (for the heading). */
  count: number;
  onConfirm: (
    type: BehaviorType,
    points: number,
    reasonLabel: string,
    note: string
  ) => void;
  onClose: () => void;
}) {
  const celebrate = useCelebrate();
  const [mode, setMode] = useState<BehaviorType>("positive");
  const [points, setPoints] = useState(BEHAVIOR_POINTS);
  const [note, setNote] = useState("");

  const step = (delta: number) =>
    setPoints((p) => Math.min(20, Math.max(1, p + delta)));

  const commit = (label: string) => {
    onConfirm(mode, points, label, note.trim());
    if (mode === "positive") celebrate();
    else playWomp();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-paper-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card flex w-full max-w-lg flex-col overflow-hidden shadow-lift motion-reduce:animate-none animate-[pop_.3s_ease-out]"
        role="dialog"
        aria-modal="true"
        aria-label={`Award points to ${count} pupils`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-paper-100 px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-paper-900">
            Award {count} {count === 1 ? "pupil" : "pupils"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-paper-400 outline-none transition-colors hover:text-paper-700 focus-visible:shadow-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("positive")}
              className={`flex items-center justify-center gap-2 rounded-md border py-2 text-sm font-semibold transition-colors ${
                mode === "positive"
                  ? "border-success bg-success-bg text-success"
                  : "border-paper-200 text-paper-500"
              }`}
            >
              <ThumbsUp className="h-4 w-4" /> Positive
            </button>
            <button
              type="button"
              onClick={() => setMode("negative")}
              className={`flex items-center justify-center gap-2 rounded-md border py-2 text-sm font-semibold transition-colors ${
                mode === "negative"
                  ? "border-danger bg-danger-bg text-danger"
                  : "border-paper-200 text-paper-500"
              }`}
            >
              <ThumbsDown className="h-4 w-4" /> Needs work
            </button>
          </div>

          {/* Editable points amount, applied to everyone selected. */}
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xs font-bold uppercase tracking-wider text-paper-400">
              Points each
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Fewer points"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-paper-200 text-paper-600 outline-none transition-colors hover:bg-paper-100 focus-visible:shadow-ring"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span
                className={`w-12 text-center font-display text-xl font-bold tabular-nums ${
                  mode === "positive" ? "text-success" : "text-danger"
                }`}
                aria-live="polite"
              >
                {mode === "positive" ? "+" : "−"}
                {points}
              </span>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="More points"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-paper-200 text-paper-600 outline-none transition-colors hover:bg-paper-100 focus-visible:shadow-ring"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tap a reason to award it to the whole selection. */}
          <div className="grid grid-cols-2 gap-2">
            {BEHAVIOR_OPTIONS[mode].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => commit(o.label)}
                className="rounded-md border border-paper-100 bg-surface p-3 text-left outline-none transition-colors hover:border-brand-400 focus-visible:shadow-ring"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-paper-700">
                    {o.label}
                  </span>
                  <span
                    className={`shrink-0 font-display text-sm font-bold tabular-nums ${
                      mode === "positive" ? "text-success" : "text-danger"
                    }`}
                  >
                    {mode === "positive" ? `+${points}` : `-${points}`}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-paper-400">
                  {o.hint}
                </span>
              </button>
            ))}
          </div>

          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional) — included with the award"
            className={`w-full ${fieldClassName}`}
          />
        </div>
      </div>
    </div>
  );
}
