"use client";

import React, { useState } from "react";
import { Trash2, Check, AlertCircle } from "lucide-react";
import { useTracker, todayISO } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { HighlighterTag, markerFor } from "@/components/ui/HighlighterTag";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldClassName } from "@/components/ui/Field";

const QUICK_TYPES = ["Spelling", "Dictation", "Workbook", "PBD"];
const inputCls = `w-full ${fieldClassName}`;

export function HomeworkTracker() {
  const {
    pupils,
    assignments,
    submissions,
    removePupil,
    addAssignment,
    removeAssignment,
    toggleSubmission,
    toggleAllForAssignment,
    getPupilScore,
    loadSampleData,
  } = useTracker();

  const [newDate, setNewDate] = useState(todayISO);
  const [newTitle, setNewTitle] = useState("");

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newTitle.trim()) return;
    addAssignment(newDate, newTitle);
    setNewTitle("");
  };

  let totalPossible = pupils.length * assignments.length;
  let totalChecked = 0;
  assignments.forEach((a) => {
    const subs = submissions[a.id] || {};
    totalChecked += pupils.filter((p) => !!subs[p.id]).length;
  });
  const overall =
    totalPossible > 0 ? Math.round((totalChecked / totalPossible) * 100) : 0;

  const gridStyle = {
    gridTemplateColumns: `220px repeat(${Math.max(
      assignments.length,
      1
    )}, minmax(120px, 1fr)) 90px`,
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Sidebar controls */}
      <aside className="card flex shrink-0 flex-col gap-6 p-5 lg:w-72">
        <div>
          <label className="mb-3 block text-2xs font-bold uppercase tracking-wider text-paper-400">
            Quick Add Column
          </label>
          <div className="mb-4 flex flex-col gap-2">
            {QUICK_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => addAssignment(newDate, t)}
                className="w-full rounded-md border border-paper-200 bg-surface px-3 py-2 text-left text-xs font-semibold text-brand-700 outline-none transition-colors hover:border-brand-400 hover:bg-brand-50 focus-visible:shadow-ring"
              >
                + {t}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleAddAssignment}
            className="space-y-3 border-t border-paper-100 pt-4"
          >
            <label className="mb-2 block text-2xs font-bold uppercase tracking-wider text-paper-400">
              Custom Column
            </label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className={inputCls}
            />
            <input
              type="text"
              required
              list="assignment-types"
              placeholder="e.g. Spelling"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className={inputCls}
            />
            <datalist id="assignment-types">
              {QUICK_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <Button type="submit" variant="secondary" className="w-full">
              + Add New Column
            </Button>
          </form>
        </div>

        <div className="mt-auto rounded-lg bg-brand-50 p-4">
          <p className="mb-1 text-2xs font-bold uppercase tracking-wider text-brand-700">
            Class Completion
          </p>
          <div className="font-display text-2xl font-bold tabular-nums text-paper-800">
            {overall}%
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand-200">
            <div
              className="h-full bg-brand-500 transition-all"
              style={{ width: `${overall}%` }}
            />
          </div>
        </div>
      </aside>

      {/* Grid */}
      <div className="min-w-0 flex-1">
        <div className="card flex max-h-[70vh] flex-col overflow-hidden">
          <div className="thin-scroll flex-1 overflow-auto">
            <div className="min-w-max">
              {/* Header */}
              <div
                className="sticky top-0 z-20 grid border-b border-paper-200 bg-paper-50/90 backdrop-blur"
                style={gridStyle}
              >
                <div className="flex items-center border-r border-paper-100 p-4 text-sm font-semibold text-paper-600">
                  Pupil Name
                </div>
                {assignments.length === 0 && (
                  <div className="flex items-center justify-center border-r border-paper-100 p-4 text-xs italic text-paper-400">
                    No assignments. Add one from the sidebar.
                  </div>
                )}
                {assignments.map((a) => {
                  const allChecked =
                    pupils.length > 0 &&
                    pupils.every((p) => !!submissions[a.id]?.[p.id]);
                  return (
                    <div
                      key={a.id}
                      className="relative flex flex-col items-center justify-center gap-1.5 border-r border-paper-100 p-4"
                    >
                      <HighlighterTag marker={markerFor(a.title)}>
                        {new Date(a.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </HighlighterTag>
                      <span
                        className="line-clamp-1 text-center text-xs font-semibold text-paper-900"
                        title={a.title}
                      >
                        {a.title}
                      </span>
                      <div className="mt-1 flex gap-1">
                        <button
                          onClick={() => toggleAllForAssignment(a.id)}
                          className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider outline-none transition-colors focus-visible:shadow-ring ${
                            allChecked
                              ? "border-brand-500 bg-brand-500 text-surface hover:bg-brand-600"
                              : "border-brand-200 bg-surface text-brand-700 hover:bg-brand-50"
                          }`}
                        >
                          {allChecked ? "Uncheck All" : "Check All"}
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                "Remove this assignment? This clears its submission data."
                              )
                            )
                              removeAssignment(a.id);
                          }}
                          aria-label={`Delete ${a.title}`}
                          className="rounded border border-paper-200 bg-surface px-1.5 py-0.5 text-paper-400 outline-none hover:bg-danger-bg hover:text-danger focus-visible:shadow-ring"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-center p-4 text-2xs font-bold uppercase tracking-wider text-paper-400">
                  Score
                </div>
              </div>

              {/* Body */}
              <div className="divide-y divide-paper-100">
                {pupils.length === 0 ? (
                  <EmptyState
                    title="No pupils in this class yet"
                    action={
                      <Button variant="secondary" onClick={loadSampleData}>
                        Load class roster
                      </Button>
                    }
                  >
                    Load this class&apos;s roster from the namelist.
                  </EmptyState>
                ) : (
                  pupils.map((pupil, idx) => {
                    const { score, total } = getPupilScore(pupil.id);
                    const dotColors = [
                      "bg-success",
                      "bg-danger",
                      "bg-warning",
                      "bg-brand-500",
                    ];
                    const dotColor = dotColors[idx % dotColors.length];
                    return (
                      <div
                        key={pupil.id}
                        className="group grid transition-colors hover:bg-paper-50"
                        style={gridStyle}
                      >
                        <div className="flex items-center justify-between border-r border-paper-100 p-4 text-sm font-medium">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div
                              className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`}
                            />
                            <span className="truncate" title={pupil.name}>
                              {pupil.name}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm("Remove this pupil?"))
                                removePupil(pupil.id);
                            }}
                            aria-label={`Remove ${pupil.name}`}
                            className="shrink-0 text-paper-300 opacity-0 outline-none transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {assignments.length === 0 && (
                          <div className="border-r border-paper-100 bg-paper-50/40 p-4" />
                        )}
                        {assignments.map((a) => {
                          const isChecked = !!submissions[a.id]?.[pupil.id];
                          return (
                            <button
                              key={a.id}
                              role="checkbox"
                              aria-checked={isChecked}
                              aria-label={`${pupil.name} — ${a.title}`}
                              onClick={() => toggleSubmission(a.id, pupil.id)}
                              className={`flex items-center justify-center border-r border-paper-100 p-4 outline-none transition-colors focus-visible:shadow-ring ${
                                isChecked
                                  ? "bg-brand-50/50"
                                  : "hover:bg-paper-100/60"
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded-[6px] border transition-colors ${
                                  isChecked
                                    ? "border-brand-500 bg-brand-500"
                                    : "border-paper-300 bg-surface"
                                }`}
                              >
                                {isChecked && (
                                  <Check
                                    className="h-3.5 w-3.5 text-surface"
                                    strokeWidth={3}
                                  />
                                )}
                              </span>
                            </button>
                          );
                        })}
                        <div className="flex items-center justify-center p-4 font-display text-xs font-bold tabular-nums text-paper-500">
                          {score}/{total}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer stat cards */}
        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <div className="card flex flex-1 items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-bg">
              <Check className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xs font-bold uppercase tracking-wider text-paper-400">
                Latest Average
              </p>
              <p className="font-display text-lg font-bold text-paper-800">
                {overall}% Compliance
              </p>
            </div>
          </div>
          <div className="card flex flex-1 items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
              <AlertCircle className="h-6 w-6 text-brand-700" />
            </div>
            <div>
              <p className="text-2xs font-bold uppercase tracking-wider text-paper-400">
                Pending Submissions
              </p>
              <p className="font-display text-lg font-bold text-paper-800">
                {totalPossible - totalChecked} Missing
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
