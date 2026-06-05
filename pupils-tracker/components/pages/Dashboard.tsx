"use client";

import { useMemo } from "react";
import {
  Users,
  ClipboardCheck,
  CalendarCheck,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
} from "lucide-react";
import { useTracker, todayISO } from "@/lib/store";
import { getSpellingStatus, getSpellingDayLabel } from "@/lib/spelling-schedule";
import { StatCard } from "@/components/ui/StatCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { Donut } from "@/components/ui/Donut";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Stagger, StaggerItem } from "@/components/ui/motion";

export function Dashboard({
  onNavigate,
}: {
  onNavigate: (
    tab: "homework" | "attendance" | "behavior" | "students"
  ) => void;
}) {
  const {
    pupils,
    assignments,
    submissions,
    attendance,
    behavior,
    loadSampleData,
    currentClassName,
  } = useTracker();

  let totalPossible = pupils.length * assignments.length;
  let totalChecked = 0;
  assignments.forEach((a) => {
    const subs = submissions[a.id] || {};
    totalChecked += pupils.filter((p) => !!subs[p.id]).length;
  });
  const hwPct =
    totalPossible > 0 ? Math.round((totalChecked / totalPossible) * 100) : 0;

  const today = todayISO();
  const day = attendance[today] || {};
  const presentToday = pupils.filter(
    (p) => day[p.id] === "present" || day[p.id] === "late"
  ).length;
  const attPct =
    pupils.length > 0 ? Math.round((presentToday / pupils.length) * 100) : 0;

  const weekAgo = new Date(Date.now() - 7 * 86400000)
    .toISOString()
    .split("T")[0];
  const weekRecords = behavior.filter((b) => b.date >= weekAgo);
  const weekNet = weekRecords.reduce(
    (s, b) => s + (b.type === "positive" ? b.points : -b.points),
    0
  );

  // Only consider assignments the teacher has actually started recording
  // (at least one pupil ticked). Until then, nothing is flagged.
  const markedAssignmentIds = assignments
    .filter((a) => pupils.some((p) => submissions[a.id]?.[p.id]))
    .map((a) => a.id);

  const needsAttention =
    markedAssignmentIds.length === 0
      ? []
      : pupils
          .map((p) => {
            const done = markedAssignmentIds.filter(
              (id) => submissions[id]?.[p.id]
            ).length;
            const missed = markedAssignmentIds.length - done;
            const pct = Math.round((done / markedAssignmentIds.length) * 100);
            return { pupil: p, pct, missed };
          })
          .filter((x) => x.missed > 0) // missed at least one recorded homework
          .sort((a, b) => a.pct - b.pct)
          .slice(0, 8);

  // Spelling / Dictation awareness
  const spellingAlert = useMemo(
    () => getSpellingStatus(currentClassName),
    [currentClassName]
  );
  const spellingDayLabel = useMemo(
    () => getSpellingDayLabel(currentClassName),
    [currentClassName]
  );

  const recent = behavior.slice(0, 6);
  const pupilName = (id: string) =>
    pupils.find((p) => p.id === id)?.name ?? "Unknown";

  return (
    <div className="space-y-4">
      {/* Stat row */}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <StatCard
            label="Pupils"
            value={pupils.length}
            icon={<Users className="h-6 w-6" />}
            tone="brand"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Homework"
            value={`${hwPct}%`}
            sub={`${totalChecked}/${totalPossible} done`}
            icon={<ClipboardCheck className="h-6 w-6" />}
            tone="info"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Attendance today"
            value={`${attPct}%`}
            sub={`${presentToday}/${pupils.length} in`}
            icon={<CalendarCheck className="h-6 w-6" />}
            tone="success"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Behavior (7d)"
            value={weekNet > 0 ? `+${weekNet}` : weekNet}
            sub={`${weekRecords.length} entries`}
            icon={
              weekNet >= 0 ? (
                <ThumbsUp className="h-6 w-6" />
              ) : (
                <ThumbsDown className="h-6 w-6" />
              )
            }
            tone={weekNet >= 0 ? "success" : "danger"}
          />
        </StaggerItem>
      </Stagger>

      <Stagger className="grid gap-4 lg:grid-cols-3">
        <StaggerItem>
          <SectionCard title="Homework completion">
            <div className="flex flex-col items-center gap-3 py-4">
              <Donut percentage={hwPct} size={150} sub="overall" />
              <button
                onClick={() => onNavigate("homework")}
                className="text-sm font-semibold text-brand-600 hover:underline"
              >
                Open tracker →
              </button>
            </div>
          </SectionCard>
        </StaggerItem>

        <StaggerItem className="lg:col-span-2">
          <SectionCard title="Needs attention">
            {/* ── Spelling / Dictation banner ── */}
            {spellingAlert ? (
              <div
                className={`mb-3 flex items-center gap-3 rounded-lg p-3 ${
                  spellingAlert.status === "today"
                    ? "border border-danger-bg bg-danger-bg/40"
                    : "border border-warning-bg bg-warning-bg/40"
                }`}
              >
                <BookOpen
                  className={`h-5 w-5 shrink-0 ${
                    spellingAlert.status === "today"
                      ? "text-danger"
                      : "text-warning"
                  }`}
                />
                <span className="flex-1 text-sm font-semibold text-paper-700">
                  {spellingAlert.status === "today"
                    ? `📝 Spelling & Dictation is TODAY (${spellingAlert.dayLabel})`
                    : `📋 Spelling & Dictation is TOMORROW (${spellingAlert.dayLabel})`}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                    spellingAlert.status === "today"
                      ? "bg-danger text-white"
                      : "bg-warning text-white"
                  }`}
                >
                  {spellingAlert.status}
                </span>
              </div>
            ) : spellingDayLabel ? (
              <div className="mb-3 flex items-center gap-3 rounded-lg border border-paper-100 bg-paper-50 p-3">
                <BookOpen className="h-5 w-5 shrink-0 text-brand-500" />
                <span className="text-sm text-paper-500">
                  Spelling & Dictation day for {currentClassName}:{" "}
                  <span className="font-semibold text-paper-700">
                    every {spellingDayLabel}
                  </span>
                </span>
              </div>
            ) : null}

            {/* ── Homework attention list ── */}
            {needsAttention.length === 0 ? (
              pupils.length === 0 ? (
                <EmptyState
                  title="No pupils in this class yet"
                  action={
                    <Button variant="secondary" onClick={loadSampleData}>
                      Load class roster
                    </Button>
                  }
                >
                  Load the roster from the namelist, or upload one in the
                  Homework tab.
                </EmptyState>
              ) : markedAssignmentIds.length === 0 ? (
                <EmptyState title="Nothing to flag yet">
                  Mark who submitted in the Homework tab — pupils who miss
                  recorded homework will appear here.
                </EmptyState>
              ) : (
                <EmptyState title="Everyone has submitted 🎉">
                  No pupil has missed recorded homework.
                </EmptyState>
              )
            ) : (
              <ul className="space-y-2">
                {needsAttention.map(({ pupil, missed }) => (
                  <li
                    key={pupil.id}
                    className="flex items-center gap-3 rounded-md border border-warning-bg bg-warning-bg/50 p-3"
                  >
                    <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
                    <span className="flex-1 truncate text-sm font-medium text-paper-700">
                      {pupil.name}
                    </span>
                    <span className="font-display text-sm font-semibold tabular-nums text-warning">
                      missed {missed}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </StaggerItem>
      </Stagger>

      <SectionCard
        title="Recent behavior activity"
        action={
          <button
            onClick={() => onNavigate("behavior")}
            className="text-xs font-semibold text-brand-600 hover:underline"
          >
            View all →
          </button>
        }
      >
        {recent.length === 0 ? (
          <EmptyState title="No activity yet">
            Log a positive or negative note in the Behavior tab.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-paper-100">
            {recent.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-2.5">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
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
                <span className="text-sm font-semibold text-paper-700">
                  {pupilName(b.pupilId)}
                </span>
                <span className="truncate text-sm text-paper-400">{b.note}</span>
                <span className="ml-auto shrink-0 text-xs text-paper-400">
                  {b.date}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
