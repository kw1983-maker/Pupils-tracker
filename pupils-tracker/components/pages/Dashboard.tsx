"use client";

import { ReactNode, useMemo, useState } from "react";
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
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { fieldClassName } from "@/components/ui/Field";
import { Stagger, StaggerItem } from "@/components/ui/motion";

const GRID = "var(--color-paper-100)";
const TICK = { fontSize: 11, fill: "var(--color-paper-500)" };
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // JS getDay() order

// Subtle "paper float" hover, reduced-motion safe (style guide §7).
const CARD_LIFT =
  "transition hover:-translate-y-0.5 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0";

const ALERT_TONES = {
  info: "bg-info-bg text-info",
  brand: "bg-brand-100 text-brand-700",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  success: "bg-success-bg text-success",
  paper: "bg-paper-100 text-paper-500",
} as const;
type AlertTone = keyof typeof ALERT_TONES;

// One calm, consistent row for every alert in "Needs attention" — a tinted icon
// tile, an optional pupil avatar, the text, optional meta, and an optional dismiss.
function AlertRow({
  icon,
  tone = "paper",
  avatarName,
  children,
  meta,
  pulse = false,
  onDismiss,
  dismissLabel,
}: {
  icon: ReactNode;
  tone?: AlertTone;
  avatarName?: string;
  children: ReactNode;
  meta?: ReactNode;
  pulse?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-md bg-surface p-2.5 shadow-paper ${
        pulse ? "motion-reduce:animate-none animate-pulse" : ""
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ALERT_TONES[tone]}`}
      >
        {icon}
      </span>
      {avatarName && <Avatar size="xs" name={avatarName} />}
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-paper-700">
        {children}
      </span>
      {meta && <span className="shrink-0 text-xs font-medium text-paper-400">{meta}</span>}
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="shrink-0 rounded-md p-1 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-danger focus-visible:shadow-ring"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

// Eyebrow-labelled group used to chunk the "Needs attention" panel.
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-2xs font-bold uppercase tracking-wider text-paper-400">
        {label}
      </p>
      {children}
    </div>
  );
}

// A positive spotlight tile (Star of the month / Badge leader).
function HighlightTile({
  icon,
  tone,
  eyebrow,
  names,
  value,
  avatarName,
  avatarHighlight,
}: {
  icon: ReactNode;
  tone: AlertTone;
  eyebrow: string;
  names: string;
  value: ReactNode;
  avatarName?: string;
  avatarHighlight?: "top" | "low";
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface p-3 shadow-paper">
      {avatarName ? (
        <Avatar size="sm" name={avatarName} highlight={avatarHighlight} />
      ) : (
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ALERT_TONES[tone]}`}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-2xs font-bold uppercase tracking-wider text-paper-400">
          {eyebrow}
        </p>
        <p className="truncate text-sm font-semibold text-paper-700">{names}</p>
      </div>
      <span className="shrink-0 font-display text-lg font-bold tabular-nums text-paper-800">
        {value}
      </span>
    </div>
  );
}

export function Dashboard({
  onNavigate,
}: {
  onNavigate: (tab: "homework" | "attendance" | "students") => void;
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

  // Add-homework-reminder form state (tucked behind a disclosure at the panel foot).
  const [hwType, setHwType] = useState<string>(HOMEWORK_TYPES[0]);
  const [hwInfo, setHwInfo] = useState("");
  const [showReminderForm, setShowReminderForm] = useState(false);
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
  // "No activity" = nobody has any behavior logged yet, so everyone is still
  // sitting on the base score (homework doesn't affect the score).
  const hasScoringActivity = behavior.length > 0;
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

  // Highlights: a crowned Star exists only when there's activity and a clear leader.
  const hasStar = pupils.length > 0 && hasScoringActivity && !allTied;
  const starHint = !hasScoringActivity
    ? "Scores start at 80 — log homework & behavior to crown a Star of the month."
    : `Everyone's tied at ${topScore} pts — no Star of the month yet.`;
  const showHighlights = hasStar || badgeLeaders.length > 0;
  const hasTodayUpcoming =
    !!spellingAlert ||
    !!spellingDayLabel ||
    upcomingEvents.length > 0 ||
    homeworkReminders.length > 0;

  const attentionCount =
    watched.length +
    needsAttention.length +
    upcomingEvents.length +
    homeworkReminders.length +
    (spellingAlert ? 1 : 0);

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
            className={CARD_LIFT}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Homework"
            value={`${hwPct}%`}
            sub={`${totalChecked}/${totalPossible} done`}
            icon={<ClipboardCheck className="h-6 w-6" />}
            tone="info"
            className={CARD_LIFT}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Attendance today"
            value={`${attPct}%`}
            sub={`${presentToday}/${pupils.length} in`}
            icon={<CalendarCheck className="h-6 w-6" />}
            tone="success"
            className={CARD_LIFT}
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
            className={CARD_LIFT}
          />
        </StaggerItem>
      </Stagger>

      <Stagger className="grid gap-4 lg:grid-cols-3">
        <StaggerItem>
          <div className="space-y-4">
            <SectionCard title="Today at a glance" className={CARD_LIFT}>
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

            <SectionCard title="Attendance trend (Mon–Fri)" className={CARD_LIFT}>
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

            <SectionCard title="Performance spread" className={CARD_LIFT}>
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
          <div className="space-y-4">
            {/* ── Highlights: positive wins, on their own calm card ── */}
            {showHighlights ? (
              <SectionCard
                title="Highlights"
                action={
                  <span className="text-2xs font-bold uppercase tracking-wider text-paper-400">
                    This week
                  </span>
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {hasStar && (
                    <HighlightTile
                      icon={<Trophy className="h-5 w-5" />}
                      tone="success"
                      eyebrow="Star of the month"
                      names={leaderNames}
                      value={`${topScore} pts`}
                      avatarName={leaders.length === 1 ? leaders[0].pupil.name : undefined}
                      avatarHighlight="top"
                    />
                  )}
                  {badgeLeaders.length > 0 && (
                    <HighlightTile
                      icon={<Award className="h-5 w-5" />}
                      tone="warning"
                      eyebrow={`Badge leader${badgeLeaders.length > 1 ? "s" : ""}`}
                      names={badgeLeaderNames}
                      value={topBadges}
                      avatarName={badgeLeaders.length === 1 ? badgeLeaders[0].name : undefined}
                    />
                  )}
                </div>
              </SectionCard>
            ) : pupils.length > 0 ? (
              <SectionCard title="Highlights">
                <p className="text-xs text-paper-500">{starHint}</p>
              </SectionCard>
            ) : null}

            {/* ── Needs attention: only things to act on ── */}
            <SectionCard
              title="Needs attention"
              action={
                attentionCount > 0 ? (
                  <span className="rounded-full bg-danger-bg px-2.5 py-0.5 text-xs font-bold tabular-nums text-danger">
                    {attentionCount}
                  </span>
                ) : undefined
              }
            >
              <div className="space-y-4">
                {/* Today & upcoming: spelling, events, homework reminders */}
                {hasTodayUpcoming && (
                  <Group label="Today & upcoming">
                    <ul className="space-y-2">
                      {spellingAlert ? (
                        <AlertRow
                          icon={<BookOpen className="h-5 w-5" />}
                          tone={spellingAlert.status === "today" ? "danger" : "warning"}
                          pulse={spellingAlert.status === "today"}
                          meta={
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wide text-surface ${
                                spellingAlert.status === "today" ? "bg-danger" : "bg-warning"
                              }`}
                            >
                              {spellingAlert.status}
                            </span>
                          }
                        >
                          {spellingAlert.status === "today"
                            ? `📝 Spelling & Dictation is today (${spellingAlert.dayLabel})`
                            : `📋 Spelling & Dictation is tomorrow (${spellingAlert.dayLabel})`}
                        </AlertRow>
                      ) : spellingDayLabel ? (
                        <AlertRow icon={<BookOpen className="h-5 w-5" />} tone="brand">
                          Spelling & Dictation: every {spellingDayLabel}
                        </AlertRow>
                      ) : null}

                      {upcomingEvents.map((ev) => {
                        const isToday = ev.date === today;
                        return (
                          <AlertRow
                            key={ev.id}
                            icon={<CalendarDays className="h-5 w-5" />}
                            tone={isToday ? "brand" : "paper"}
                            pulse={isToday}
                            meta={isToday ? "today" : formatDMY(ev.date)}
                            onDismiss={() => removeCalendarEvent(ev.id)}
                            dismissLabel={`Delete event: ${ev.title}`}
                          >
                            {ev.title}
                            {ev.note ? ` — ${ev.note}` : ""}
                          </AlertRow>
                        );
                      })}

                      {homeworkReminders.map((h) => (
                        <AlertRow
                          key={h.id}
                          icon={<ClipboardCheck className="h-5 w-5" />}
                          tone="info"
                          meta={h.createdDate}
                          onDismiss={() => removeHomeworkReminder(h.id)}
                          dismissLabel={`Delete homework reminder: ${h.type}`}
                        >
                          Homework to submit: {h.type}
                          {h.info ? ` — ${h.info}` : ""}
                        </AlertRow>
                      ))}
                    </ul>
                  </Group>
                )}

                {/* Watch list */}
                {watched.length > 0 && (
                  <Group label="Watch list">
                    <ul className="space-y-2">
                      {watched.map((p) => (
                        <AlertRow
                          key={p.id}
                          icon={<Eye className="h-5 w-5" />}
                          tone="danger"
                          avatarName={p.name}
                          meta={
                            <span className="text-2xs font-bold uppercase tracking-wide text-danger">
                              watch
                            </span>
                          }
                          onDismiss={() => removeFromWatch(p.id)}
                          dismissLabel={`Remove ${p.name} from watch list`}
                        >
                          {p.name}
                        </AlertRow>
                      ))}
                    </ul>
                  </Group>
                )}

                {/* Homework follow-up (pupils who missed recorded homework) */}
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
                      Load the roster from the namelist, or upload one in the Homework tab.
                    </EmptyState>
                  ) : markedAssignmentIds.length === 0 ? (
                    <Group label="Homework follow-up">
                      <EmptyState title="Nothing to flag yet">
                        Mark who submitted in the Homework tab — pupils who miss recorded
                        homework will appear here.
                      </EmptyState>
                    </Group>
                  ) : (
                    <Group label="Homework follow-up">
                      <EmptyState title="Everyone has submitted 🎉">
                        No pupil has missed recorded homework.
                      </EmptyState>
                    </Group>
                  )
                ) : (
                  <Group label="Homework follow-up">
                    <ul className="space-y-2">
                      {needsAttention.map(({ pupil, missed }) => (
                        <AlertRow
                          key={pupil.id}
                          icon={<AlertTriangle className="h-5 w-5" />}
                          tone="warning"
                          avatarName={pupil.name}
                          meta={
                            <span className="font-display font-semibold text-warning">
                              missed {missed}
                            </span>
                          }
                        >
                          {pupil.name}
                        </AlertRow>
                      ))}
                    </ul>
                  </Group>
                )}

                {/* Add homework reminder (tucked behind a disclosure) */}
                <div className="border-t border-paper-100 pt-3">
                  {showReminderForm ? (
                    <form onSubmit={submitReminder} className="flex flex-wrap items-end gap-2">
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowReminderForm(false)}
                      >
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowReminderForm(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Add homework reminder
                    </Button>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>
        </StaggerItem>
      </Stagger>

      <SectionCard
        title="Recent behavior activity"
        className={CARD_LIFT}
        action={
          <button
            onClick={() => onNavigate("students")}
            className="text-xs font-semibold text-brand-600 hover:underline"
          >
            View all →
          </button>
        }
      >
        {recent.length === 0 ? (
          <EmptyState title="No activity yet">
            Tap a pupil&apos;s avatar in the Students tab to award points.
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
                <Avatar size="xs" name={pupilName(b.pupilId)} />
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
