"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Trash2, Sparkles } from "lucide-react";
import { useTracker } from "@/lib/store";
import { BehaviorType } from "@/lib/types";
import { BEHAVIOR_OPTIONS } from "@/lib/behaviors";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldClassName } from "@/components/ui/Field";

// Every behavior entry is worth a fixed ±2 (mirrors the performance score).
const BEHAVIOR_POINTS = 2;

const inputCls = `w-full ${fieldClassName}`;

export function Behavior() {
  const { pupils, behavior, addBehavior, removeBehavior } = useTracker();
  const [pupilId, setPupilId] = useState("");
  const [type, setType] = useState<BehaviorType>("positive");
  const [behaviorLabel, setBehaviorLabel] = useState("");
  const [note, setNote] = useState("");

  // The dropdown lists behaviors matching the selected type; switching the
  // toggle clears any stale selection.
  const selectType = (t: BehaviorType) => {
    setType(t);
    setBehaviorLabel("");
  };

  const pupilName = (id: string) =>
    pupils.find((p) => p.id === id)?.name ?? "Unknown";

  const totals = pupils
    .map((p) => {
      const recs = behavior.filter((b) => b.pupilId === p.id);
      const net = recs.reduce(
        (sum, b) => sum + (b.type === "positive" ? BEHAVIOR_POINTS : -BEHAVIOR_POINTS),
        0
      );
      return { pupil: p, net };
    })
    .sort((a, b) => b.net - a.net);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pupilId || !behaviorLabel) return;
    // Store the chosen behavior, with the optional free-text note appended.
    const fullNote = [behaviorLabel, note.trim()].filter(Boolean).join(" — ");
    addBehavior(pupilId, type, BEHAVIOR_POINTS, fullNote);
    setBehaviorLabel("");
    setNote("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Log form */}
      <SectionCard title="Log behavior" className="lg:col-span-1">
        {pupils.length === 0 ? (
          <EmptyState title="No pupils yet">
            Add pupils first in the Homework tab.
          </EmptyState>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <select
              value={pupilId}
              onChange={(e) => setPupilId(e.target.value)}
              required
              className={inputCls}
            >
              <option value="">Select pupil…</option>
              {pupils.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => selectType("positive")}
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
                onClick={() => selectType("negative")}
                className={`flex items-center justify-center gap-2 rounded-md border py-2 text-sm font-semibold transition-colors ${
                  type === "negative"
                    ? "border-danger bg-danger-bg text-danger"
                    : "border-paper-200 text-paper-500"
                }`}
              >
                <ThumbsDown className="h-4 w-4" /> Needs work
              </button>
            </div>

            <select
              value={behaviorLabel}
              onChange={(e) => setBehaviorLabel(e.target.value)}
              required
              className={inputCls}
            >
              <option value="">Select behavior…</option>
              {BEHAVIOR_OPTIONS[type].map((o) => (
                <option key={o.label} value={o.label}>
                  {o.label} ({o.hint})
                </option>
              ))}
            </select>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)"
              rows={2}
              className={inputCls}
            />

            <Button type="submit" className="w-full">
              Add entry
            </Button>
          </form>
        )}

        {totals.length > 0 && (
          <div className="mt-6 border-t border-paper-100 pt-4">
            <p className="mb-2 flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-paper-400">
              <Sparkles className="h-3.5 w-3.5" /> Net points
            </p>
            <ul className="space-y-1.5">
              {totals.slice(0, 6).map(({ pupil, net }) => (
                <li
                  key={pupil.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate text-paper-600">{pupil.name}</span>
                  <span
                    className={`font-display font-bold tabular-nums ${
                      net > 0
                        ? "text-success"
                        : net < 0
                        ? "text-danger"
                        : "text-paper-400"
                    }`}
                  >
                    {net > 0 ? `+${net}` : net}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>

      {/* Activity log */}
      <SectionCard title="Recent activity" className="lg:col-span-2">
        {behavior.length === 0 ? (
          <EmptyState title="No behavior logged yet">
            Use the form to add your first entry.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {behavior.map((b) => (
              <li
                key={b.id}
                className="group flex items-start gap-3 rounded-md border border-paper-100 p-3"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    b.type === "positive"
                      ? "bg-success-bg text-success"
                      : "bg-danger-bg text-danger"
                  }`}
                >
                  {b.type === "positive" ? (
                    <ThumbsUp className="h-4 w-4" />
                  ) : (
                    <ThumbsDown className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-paper-700">
                      {pupilName(b.pupilId)}
                    </span>
                    <span
                      className={`font-display text-xs font-bold tabular-nums ${
                        b.type === "positive" ? "text-success" : "text-danger"
                      }`}
                    >
                      {b.type === "positive"
                        ? `+${BEHAVIOR_POINTS}`
                        : `-${BEHAVIOR_POINTS}`}
                    </span>
                    <span className="text-xs text-paper-400">{b.date}</span>
                  </div>
                  {b.note && (
                    <p className="truncate text-sm text-paper-500">{b.note}</p>
                  )}
                </div>
                <button
                  onClick={() => removeBehavior(b.id)}
                  aria-label="Delete entry"
                  className="shrink-0 text-paper-300 opacity-0 outline-none transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
