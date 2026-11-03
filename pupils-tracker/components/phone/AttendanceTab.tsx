"use client";

import { useState } from "react";
import { Check, Save, Users } from "lucide-react";
import { todayISO, useTracker } from "@/lib/store";
import { shortenName } from "@/lib/pupil-name";
import type { AttendanceStatus } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

const NEXT: Record<AttendanceStatus, AttendanceStatus> = {
  present: "absent",
  absent: "late",
  late: "present",
};

const STYLE: Record<AttendanceStatus, string> = {
  present: "bg-success-bg text-success-ink",
  absent: "bg-danger-bg text-danger-ink",
  late: "bg-warning-bg text-warning-ink",
};

const LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
};

/**
 * Phone roll call: everyone starts as present (or as already recorded today),
 * tap a pupil to cycle present → absent → late, then save once.
 */
export function AttendanceTab() {
  const { pupils, attendance, setAttendance, currentClassId } = useTracker();
  const date = todayISO();
  const saved = attendance[date] ?? {};
  // Draft edits keyed by class so switching class starts a fresh draft.
  const [draft, setDraft] = useState<{
    classId: string;
    marks: Record<string, AttendanceStatus>;
  }>({ classId: currentClassId, marks: {} });
  const [justSaved, setJustSaved] = useState(false);

  const marks = draft.classId === currentClassId ? draft.marks : {};
  const statusOf = (id: string): AttendanceStatus => marks[id] ?? saved[id] ?? "present";

  const counts = pupils.reduce(
    (acc, p) => {
      acc[statusOf(p.id)] += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0 } as Record<AttendanceStatus, number>
  );
  const recordedToday = pupils.length > 0 && pupils.every((p) => saved[p.id]);
  const dirty = Object.keys(marks).length > 0 || !recordedToday;

  const toggle = (id: string) => {
    setJustSaved(false);
    setDraft({ classId: currentClassId, marks: { ...marks, [id]: NEXT[statusOf(id)] } });
  };

  const save = () => {
    for (const p of pupils) {
      const status = statusOf(p.id);
      if (saved[p.id] !== status) setAttendance(date, p.id, status);
    }
    setDraft({ classId: currentClassId, marks: {} });
    setJustSaved(true);
  };

  if (pupils.length === 0) {
    return (
      <EmptyState icon={<Users className="h-6 w-6" />} title="No pupils in this class">
        Add pupils in the web app&apos;s Students tab.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-paper-800">Roll call</h2>
          <p className="text-xs text-paper-500">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}{" "}
            · tap a name to change it
          </p>
        </div>
        <p className="text-right text-xs font-semibold text-paper-600">
          <span className="text-success-ink">{counts.present} in</span> ·{" "}
          <span className="text-danger-ink">{counts.absent} absent</span> ·{" "}
          <span className="text-warning-ink">{counts.late} late</span>
        </p>
      </div>

      <ul className="divide-y divide-paper-100 overflow-hidden rounded-card bg-surface shadow-float">
        {pupils.map((p) => {
          const status = statusOf(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => toggle(p.id)}
                aria-label={`${p.name}: ${LABEL[status]}. Tap to change.`}
                className="flex w-full items-center gap-3 px-3 py-2 text-left outline-none focus-visible:shadow-ring"
              >
                <Avatar name={p.name} size="xs" />
                <span className="flex-1 truncate text-sm font-semibold text-paper-700">
                  {shortenName(p.name)}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${STYLE[status]}`}>
                  {LABEL[status]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-20 z-10">
        <Button className="w-full shadow-float" onClick={save} disabled={!dirty}>
          {justSaved && !dirty ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save attendance
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
