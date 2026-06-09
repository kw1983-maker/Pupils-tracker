"use client";

import { useMemo, useState } from "react";
import {
  Users,
  ClipboardCheck,
  CalendarCheck,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  Trophy,
  Award,
  Eye,
  X,
  Plus,
  CalendarDays,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { useTracker, todayISO } from "@/lib/store";
import { getSpellingStatus, getSpellingDayLabel } from "@/lib/spelling-schedule";
import { HOMEWORK_TYPES } from "@/lib/homework-types";
import { formatDMY } from "@/lib/format";
import { StatCard } from "@/components/ui/StatCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { Donut } from "@/components/ui/Donut";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { fieldClassName } from "@/components/ui/Field";
import { Stagger, StaggerItem } from "@/components/ui/motion";

const GRID = "var(--color-paper-100)";
const TICK = { fontSize: 11, fill: "var(--color-paper-500)" };
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // JS getDay() order

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
    badges,
    loadSampleData,
    currentClassName,
    getPerformanceScore,
    watchList,
    removeFromWatch,
    homeworkReminders,
    addHomeworkReminder,
    removeHomeworkReminder,
    calendarEvents,
    removeCalendarEvent,
  } = useTracker();

  // Add-homework-reminder form state.
  const [hwType, setHwType] = useState<string>(HOMEWORK_TYPES[0]);
  const [hwInfo, setHwInfo] = useState("");
  const submitReminder = (e: React.FormEvent) => {
    e.preventDefault();
    addHomeworkReminder(hwType, hwInfo);
    setHwInfo("");
  };

  // Pupils the monitor/teacher has flagged to watch (skip any stale ids).
  const watched = watchList
    .map((id) => pupils.find((p) => p.id === id))
    .filter((p): p is (typeof pupils)[number] => Boolean(p));

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
    (s, b) => s + (b.type === "positive" ? 2 : -2),
    0
  );

  // Today's attendance breakdown (only pupils actually marked today).
  const presentOnly = pupils.filter((p) => day[p.id] === "present").length;
  const lateToday = pupils.filter((p) => day[p.id] === "late").length;
  const absentToday = pupils.filter((p) => day[p.id] === "absent").length;
  const markedToday = presentOnly + lateToday + absentToday;

  // Last 5 recorded weekdays (Mon–Fri only — school week), attendance %.
  const trendLabels: Record<string, string> = {};
  const attTrend = Object.keys(attendance)
    .sort()
    .filter((date) => {
      const dow = new Date(`${date}T00:00:00`).getDay();
      return dow >= 1 && dow <= 5;
    })
    .slice(-5)
    .map((date) => {
      const rec = attendance[date];
      const ids = Object.keys(rec);
      const total = ids.length || 1;
      const inCount = ids.filter(
        (id) => rec[id] === "present" || rec[id] === "late"
      ).length;
      const key = date.slice(5);
      trendLabels[key] = WEEKDAYS[new Date(`${date}T00:00:00`).getDay()];
      return { date: key, pct: Math.round((inCount / total) * 100) };
    });

  // Performance spread vs the 80 baseline.
  const spread = pupils.reduce(
    (acc, p) => {
      const s = getPerformanceScore(p.id).score;
      if (s > 80) acc.above++;
      else if (s < 80) acc.below++;
      else acc.at++;
      return acc;
    },
    { below: 0, at: 0, above: 0 }
  );
  const spreadData = [
    { band: "Below", count: spread.below, color: "var(--color-danger)" },
    { band: "At 80", count: spread.at, color: "var(--color-paper-400)" },
    { band: "Above", count: spread.above, color: "var(--color-success)" },
  ];

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

  // Star of the Month — highest all-time performance score (live).
  const scored = pupils.map((p) => ({
    pupil: p,
    score: getPerformanceScore(p.id).score,
  }));
  const topScore = scored.reduce((max, s) => Math.max(max, s.score), -Infinity);
  const leaders = scored.filter((s) => s.score === topScore);
  // "No activity" = nobody has any behavior logged and no homework recorded yet,
  // so everyone is still sitting on the base score.
  const hasScoringActivity =
    behavior.length > 0 || markedAssignmentIds.length > 0;
  // When the whole class shares the top score there's no standout to crown.
  const allTied = pupils.length > 0 && leaders.length === pupils.length;
  // Otherwise show the leader(s), but keep the banner short on big ties.
  const MAX_NAMES = 3;
  const leaderNames =
    leaders.slice(0, MAX_NAMES).map((l) => l.pupil.name).join(", ") +
    (leaders.length > MAX_NAMES ? ` +${leaders.length - MAX_NAMES} more` : "");

  // Badge leaders — pupils with the most awarded badges (live).
  const topBadges = pupils.reduce(
    (max, p) => Math.max(max, badges.filter((b) => b.pupilId === p.id).length),
    0
  );
  const badgeLeaders =
    topBadges > 0
      ? pupils.filter((p) => badges.filter((b) => b.pupilId === p.id).length === topBadges)
      : [];
  const badgeLeaderNames =
    badgeLeaders.slice(0, MAX_NAMES).map((p) => p.name).join(", ") +
    (badgeLeaders.length > MAX_NAMES ? ` +${badgeLeaders.length - MAX_NAMES} more` : "");

  // Spelling / Dictation awareness
  const spellingAlert = useMemo(
    () => getSpellingStatus(currentClassName),
    [currentClassName]
  );
  const spellingDayLabel = useMemo(
    () => getSpellingDayLabel(currentClassName),
    [currentClassName]
  );

  // Calendar events that are today or still upcoming, soonest first — shown
  // flashing in "Needs attention" until they pass or are deleted.
  const upcomingEvents = calendarEvents
    .filter((ev) => ev.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

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
          <div className="space-y-4">
            <SectionCard title="Today at a glance">
              <div className="flex items-center justify-around gap-2 py-2">
                <Donut percentage={hwPct} size={104} sub="homework" />
                <Donut
                  percentage={attPct}
                  size={104}
                  color="var(--color-info)"
                  trackColor="var(--color-info-bg)"
                  sub="attendance"
                />
              </div>
              {markedToday === 0 ? (
                <p className="mt-1 text-center text-xs text-paper-400">
                  Attendance not taken yet today.
                </p>
              ) : (
                <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-paper-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-success" />
                    <span className="font-semibold tabular-nums text-paper-700">
                      {presentOnly}
                    </span>{" "}
                    present
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-warning" />
                    <span className="font-semibold tabular-nums text-paper-700">
                      {lateToday}
                    </span>{" "}
                    late
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-danger" />
                    <span className="font-semibold tabular-nums text-paper-700">
                      {absentToday}
                    </span>{" "}
                    absent
                  </span>
                </div>
              )}
              <button
                onClick={() => onNavigate("homework")}
                className="mt-3 block w-full text-center text-sm font-semibold text-brand-600 hover:underline"
              >
                Open tracker →
              </button>
            </SectionCard>

            <SectionCard title="Attendance trend (Mon–Fri)">
              {attTrend.length === 0 ? (
                <EmptyState title="No attendance recorded yet" />
              ) : (
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={attTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                    <XAxis
                      dataKey="date"
                      tick={TICK}
                      tickFormatter={(d) => trendLabels[d] ?? d}
                    />
                    <YAxis domain={[0, 100]} tick={TICK} unit="%" width={36} />
                    <Tooltip
                      formatter={(v) => `${v}%`}
                      labelFormatter={(d) => trendLabels[d] ?? d}
                    />
                    <Line
                      type="monotone"
                      dataKey="pct"
                      name="Attendance"
                      stroke="var(--color-info)"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            <SectionCard title="Performance spread">
              {pupils.length === 0 ? (
                <EmptyState title="No pupils yet" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={spreadData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                      <XAxis dataKey="band" tick={TICK} />
                      <YAxis allowDecimals={false} tick={TICK} width={28} />
                      <Tooltip formatter={(v) => `${v} pupils`} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {spreadData.map((d) => (
                          <Cell key={d.band} fill={d.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="mt-1 text-center text-xs text-paper-400">
                    Pupils vs the 80 baseline
                  </p>
                </>
              )}
            </SectionCard>
          </div>
        </StaggerItem>

        <StaggerItem className="lg:col-span-2">
          <SectionCard title="Needs attention">
            {/* ── Homework reminders (class-wide) ── */}
            <form
              onSubmit={submitReminder}
              className="mb-3 flex flex-wrap items-end gap-2"
            >
              <select
                aria-label="Homework type"
                value={hwType}
                onChange={(e) => setHwType(e.target.value)}
                className={`${fieldClassName} w-auto`}
              >
                {HOMEWORK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={hwInfo}
                onChange={(e) => setHwInfo(e.target.value)}
                placeholder="Extra info (optional)"
                aria-label="Extra info"
                className={`${fieldClassName} min-w-0 flex-1`}
              />
              <Button type="submit">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </form>

            {homeworkReminders.length > 0 && (
              <ul className="mb-3 space-y-2">
                {homeworkReminders.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center gap-3 rounded-lg border border-info-bg bg-info-bg/40 p-3 motion-reduce:animate-none animate-pulse"
                  >
                    <ClipboardCheck className="h-5 w-5 shrink-0 text-info" />
                    <span className="flex-1 truncate text-sm font-semibold text-paper-700">
                      Homework to be submitted: {h.type}
                      {h.info ? ` — ${h.info}` : ""}
                    </span>
                    <span className="shrink-0 text-2xs font-medium tabular-nums text-paper-400">
                      {h.createdDate}
                    </span>
                    <button
                      onClick={() => removeHomeworkReminder(h.id)}
                      aria-label={`Delete homework reminder: ${h.type}`}
                      className="shrink-0 rounded-md p-1 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-danger focus-visible:shadow-ring"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* ── Calendar events (today / upcoming) ── */}
            {upcomingEvents.length > 0 && (
              <ul className="mb-3 space-y-2">
                {upcomingEvents.map((ev) => {
                  const isToday = ev.date === today;
                  return (
                    <li
                      key={ev.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 ${
                        isToday
                          ? "border-brand-200 bg-brand-50 motion-reduce:animate-none animate-pulse"
                          : "border-paper-100 bg-paper-50"
                      }`}
                    >
                      <CalendarDays className="h-5 w-5 shrink-0 text-brand-500" />
                      <span className="flex-1 truncate text-sm font-semibold text-paper-700">
                        {ev.title}
                        {ev.note ? ` — ${ev.note}` : ""}
                      </span>
                      <span className="shrink-0 text-2xs font-medium tabular-nums text-paper-400">
                        {isToday ? "today" : formatDMY(ev.date)}
                      </span>
                      <button
                        onClick={() => removeCalendarEvent(ev.id)}
                        aria-label={`Delete event: ${ev.title}`}
                        className="shrink-0 rounded-md p-1 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-danger focus-visible:shadow-ring"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* ── Behavior watch list (monitor) ── */}
            {watched.length > 0 && (
              <ul className="mb-3 space-y-2">
                {watched.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg border border-danger-bg bg-danger-bg/40 p-3 motion-reduce:animate-none animate-pulse"
                  >
                    <Eye className="h-5 w-5 shrink-0 text-danger" />
                    <span className="flex-1 truncate text-sm font-semibold text-paper-700">
                      {p.name}
                    </span>
                    <span className="shrink-0 text-2xs font-bold uppercase tracking-wide text-danger">
                      watch
                    </span>
                    <button
                      onClick={() => removeFromWatch(p.id)}
                      aria-label={`Remove ${p.name} from watch list`}
                      className="shrink-0 rounded-md p-1 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-danger focus-visible:shadow-ring"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* ── Star of the Month banner ── */}
            {pupils.length > 0 &&
              (hasScoringActivity && !allTied ? (
                <div className="mb-3 flex items-center gap-3 rounded-lg border border-success-bg bg-success-bg/40 p-3">
                  <Trophy className="h-5 w-5 shrink-0 text-success" />
                  <span className="flex-1 text-sm font-semibold text-paper-700">
                    🏆 Star of the Month: {leaderNames}
                  </span>
                  <span className="shrink-0 font-display text-sm font-bold tabular-nums text-success">
                    {topScore} pts
                  </span>
                </div>
              ) : (
                <div className="mb-3 flex items-center gap-3 rounded-lg border border-paper-100 bg-paper-50 p-3">
                  <Trophy className="h-5 w-5 shrink-0 text-paper-400" />
                  <span className="text-sm text-paper-500">
                    {!hasScoringActivity
                      ? "Scores start at 80 — log homework & behavior to crown a Star of the Month."
                      : `Everyone's tied at ${topScore} pts — no Star of the Month yet.`}
                  </span>
                </div>
              ))}

            {/* ── Badge leaders banner ── */}
            {badgeLeaders.length > 0 && (
              <div className="mb-3 flex items-center gap-3 rounded-lg border border-mark-amber bg-mark-amber/30 p-3">
                <Award className="h-5 w-5 shrink-0 text-mark-amber-ink" />
                <span className="flex-1 text-sm font-semibold text-paper-700">
                  🏅 Badge leader{badgeLeaders.length > 1 ? "s" : ""}: {badgeLeaderNames}
                </span>
                <span className="shrink-0 font-display text-sm font-bold tabular-nums text-mark-amber-ink">
                  {topBadges}
                </span>
              </div>
            )}

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
