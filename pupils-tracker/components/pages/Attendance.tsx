"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, CalendarCheck, Download } from "lucide-react";
import { useTracker, todayISO } from "@/lib/store";
import { AttendanceStatus } from "@/lib/types";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";
import { StatusPill, Status } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { fieldClassName } from "@/components/ui/Field";

const STATUS_ORDER: AttendanceStatus[] = ["present", "late", "absent"];

const STATUS_META: Record<
  AttendanceStatus,
  { label: string; status: Status; icon: React.ReactNode }
> = {
  present: {
    label: "Present",
    status: "success",
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
  },
  late: {
    label: "Late",
    status: "warning",
    icon: <Clock className="h-4 w-4" aria-hidden />,
  },
  absent: {
    label: "Absent",
    status: "danger",
    icon: <XCircle className="h-4 w-4" aria-hidden />,
  },
};

export function Attendance() {
  const {
    pupils,
    attendance,
    setAttendance,
    markAllPresent,
    unmarkAll,
    exportWeeklyAttendance,
  } = useTracker();
  const [date, setDate] = useState(todayISO);
  // Weekly attendance export — any chosen day exports its whole Mon–Fri week.
  const [exportDate, setExportDate] = useState(todayISO);

  const day = attendance[date] || {};
  const counts = pupils.reduce(
    (acc, p) => {
      const s = day[p.id];
      if (s === "present") acc.present++;
      else if (s === "late") acc.late++;
      else if (s === "absent") acc.absent++;
      else acc.unmarked++;
      return acc;
    },
    { present: 0, late: 0, absent: 0, unmarked: 0 }
  );

  const cycle = (pupilId: string) => {
    const current = day[pupilId];
    const idx = current ? STATUS_ORDER.indexOf(current) : -1;
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    setAttendance(date, pupilId, next);
  };

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarCheck className="h-5 w-5 text-brand-500" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status="success">{counts.present} present</StatusPill>
            <StatusPill status="warning">{counts.late} late</StatusPill>
            <StatusPill status="danger">{counts.absent} absent</StatusPill>
            <StatusPill status="neutral">{counts.unmarked} unmarked</StatusPill>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => unmarkAll(date)}
              disabled={
                counts.present + counts.late + counts.absent === 0
              }
            >
              Unmark all
            </Button>
            <Button onClick={() => markAllPresent(date)} disabled={pupils.length === 0}>
              Mark all present
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Export weekly attendance">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="attendance-export-date"
              className="text-xs font-semibold text-paper-500"
            >
              Pick any day in the week
            </label>
            <input
              id="attendance-export-date"
              type="date"
              value={exportDate}
              onChange={(e) => setExportDate(e.target.value)}
              className={`${fieldClassName} w-auto`}
            />
          </div>
          <Button onClick={() => exportWeeklyAttendance(exportDate)}>
            <Download className="h-4 w-4" />
            Export Mon–Fri (all classes)
          </Button>
          <p className="w-full text-xs text-paper-400 sm:w-auto sm:flex-1">
            Downloads one Excel file with every class&apos;s Monday–Friday
            attendance for the chosen week.
          </p>
        </div>
      </SectionCard>

      <SectionCard title={`Roster — ${pupils.length} pupils`}>
        {pupils.length === 0 ? (
          <EmptyState title="No pupils yet">
            Add a namelist in the Homework tab.
          </EmptyState>
        ) : (
          <>
            <p className="mb-3 text-xs text-paper-400">
              Tap a pupil to cycle Present → Late → Absent.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {pupils.map((pupil) => {
                const status = day[pupil.id];
                const meta = status ? STATUS_META[status] : null;
                return (
                  <li key={pupil.id}>
                    <button
                      onClick={() => cycle(pupil.id)}
                      className="flex w-full items-center justify-between rounded-md border border-paper-100 bg-surface p-3 text-left outline-none transition-colors hover:border-brand-400 focus-visible:shadow-ring"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Avatar size="xs" name={pupil.name} />
                        <span className="truncate text-sm font-semibold text-paper-700">
                          {pupil.name}
                        </span>
                      </span>
                      {meta ? (
                        <StatusPill status={meta.status} icon={meta.icon}>
                          {meta.label}
                        </StatusPill>
                      ) : (
                        <StatusPill status="neutral">Mark</StatusPill>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </SectionCard>
    </div>
  );
}
