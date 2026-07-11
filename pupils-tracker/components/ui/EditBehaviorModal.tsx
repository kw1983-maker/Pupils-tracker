"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Minus, Plus, X } from "lucide-react";
import { BehaviorRecord, BehaviorType } from "@/lib/types";
import { BEHAVIOR_POINTS } from "@/lib/behaviors";
import { Button } from "@/components/ui/Button";
import { fieldClassName } from "@/components/ui/Field";

/** Edit a logged behaviour entry after the fact: points, type, and note. */
export function EditBehaviorModal({
  record,
  onSave,
  onClose,
}: {
  record: BehaviorRecord;
  onSave: (patch: { type: BehaviorType; points: number; note: string }) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<BehaviorType>(record.type);
  const [points, setPoints] = useState(Math.abs(record.points ?? BEHAVIOR_POINTS));
  const [note, setNote] = useState(record.note ?? "");

  const step = (delta: number) =>
    setPoints((p) => Math.min(20, Math.max(1, p + delta)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-paper-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card flex w-full max-w-md flex-col overflow-hidden shadow-lift motion-reduce:animate-none animate-[pop_.3s_ease-out]"
        role="dialog"
        aria-modal="true"
        aria-label="Edit behaviour entry"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-paper-100 px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-paper-900">
            Edit entry
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
              onClick={() => setType("positive")}
              className={`flex items-center justify-center gap-2 rounded-md border py-2 text-sm font-semibold transition-colors ${
                type === "positive"
                  ? "border-success bg-success-bg text-success-ink"
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
                  ? "border-danger bg-danger-bg text-danger-ink"
                  : "border-paper-200 text-paper-500"
              }`}
            >
              <ThumbsDown className="h-4 w-4" /> Needs work
            </button>
          </div>

          <div className="flex items-center justify-center gap-3">
            <span className="text-2xs font-bold uppercase tracking-wider text-paper-400">
              Points
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
                  type === "positive" ? "text-success" : "text-danger"
                }`}
                aria-live="polite"
              >
                {type === "positive" ? "+" : "−"}
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

          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className={`w-full ${fieldClassName}`}
          />

          <div className="flex justify-end gap-2 border-t border-paper-100 pt-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onSave({ type, points, note: note.trim() })}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
