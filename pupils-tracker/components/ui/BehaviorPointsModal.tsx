"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, UserRound, X } from "lucide-react";
import { useTracker } from "@/lib/store";
import { Pupil, BehaviorType } from "@/lib/types";
import { BEHAVIOR_OPTIONS, BEHAVIOR_POINTS } from "@/lib/behaviors";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { fieldClassName } from "@/components/ui/Field";
import { useCelebrate } from "@/components/ui/Celebration";

/**
 * ClassDojo-style points dialog: opened by tapping a pupil's avatar in the
 * Students grid. One tap on a behavior tile logs ±2 points and closes.
 * Modal shell follows DriveLinkModal / BookPickerModal.
 */
export function BehaviorPointsModal({
  pupil,
  onClose,
  onViewProfile,
}: {
  pupil: Pupil;
  onClose: () => void;
  /** Open the pupil's full detail page (homework, attendance, notes). */
  onViewProfile: () => void;
}) {
  const { behavior, addBehavior } = useTracker();
  const celebrate = useCelebrate();
  const [type, setType] = useState<BehaviorType>("positive");
  const [note, setNote] = useState("");

  const net = behavior
    .filter((b) => b.pupilId === pupil.id)
    .reduce(
      (sum, b) => sum + (b.type === "positive" ? BEHAVIOR_POINTS : -BEHAVIOR_POINTS),
      0
    );

  // One tap = logged, exactly like ClassDojo. The optional note rides along.
  const pick = (label: string) => {
    const fullNote = [label, note.trim()].filter(Boolean).join(" — ");
    addBehavior(pupil.id, type, BEHAVIOR_POINTS, fullNote);
    if (type === "positive") celebrate();
    onClose();
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
        aria-label={`Behavior points for ${pupil.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-paper-100 px-5 py-4">
          <Avatar size="lg" name={pupil.name} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-lg font-semibold text-paper-900">
              {pupil.name}
            </h2>
            <p
              className={`text-sm font-semibold ${
                net > 0 ? "text-success" : net < 0 ? "text-danger" : "text-paper-400"
              }`}
            >
              {net > 0 ? `+${net}` : net} behavior points
            </p>
          </div>
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
              onClick={() => setType("positive")}
              className={`flex items-center justify-center gap-2 rounded-md border py-2 text-sm font-semibold transition-colors ${
                type === "positive"
                  ? "border-success bg-success-bg text-success"
                  : "border-paper-200 text-paper-500"
              }`}
            >
              <ThumbsUp className="h-4 w-4" /> Positive
            </button>
            <button
              type="button"
              onClick={() => setType("negative")}
              className={`flex items-center justify-center gap-2 rounded-md border py-2 text-sm font-semibold transition-colors ${
                type === "negative"
                  ? "border-danger bg-danger-bg text-danger"
                  : "border-paper-200 text-paper-500"
              }`}
            >
              <ThumbsDown className="h-4 w-4" /> Needs work
            </button>
          </div>

          {/* Tap a tile to log it immediately. */}
          <div className="grid grid-cols-2 gap-2">
            {BEHAVIOR_OPTIONS[type].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => pick(o.label)}
                className="rounded-md border border-paper-100 bg-surface p-3 text-left outline-none transition-colors hover:border-brand-400 focus-visible:shadow-ring"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-paper-700">
                    {o.label}
                  </span>
                  <span
                    className={`shrink-0 font-display text-sm font-bold tabular-nums ${
                      type === "positive" ? "text-success" : "text-danger"
                    }`}
                  >
                    {type === "positive" ? `+${BEHAVIOR_POINTS}` : `-${BEHAVIOR_POINTS}`}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-paper-400">{o.hint}</span>
              </button>
            ))}
          </div>

          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional) — included with the next tap"
            className={`w-full ${fieldClassName}`}
          />

          <div className="flex justify-end border-t border-paper-100 pt-3">
            <Button variant="secondary" onClick={onViewProfile}>
              <UserRound className="h-4 w-4" /> View profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
