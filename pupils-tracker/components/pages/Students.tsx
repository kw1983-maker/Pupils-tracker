"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Check,
  X,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  TrendingDown,
  Trash2,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTracker } from "@/lib/store";
import { Pupil } from "@/lib/types";
import { badgeById } from "@/lib/badges";
import { BEHAVIOR_POINTS } from "@/lib/behaviors";
import { isSfxMuted, setSfxMuted } from "@/lib/sound";
import { BehaviorPointsModal } from "@/components/ui/BehaviorPointsModal";
import { SectionCard } from "@/components/ui/SectionCard";
import { Donut } from "@/components/ui/Donut";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { HighlighterTag } from "@/components/ui/HighlighterTag";
import { fieldClassName } from "@/components/ui/Field";

// Score 80 is the neutral baseline; above is green/up, below is red/down.
const scoreTone = (s: number) =>
  s > 80 ? "text-success" : s < 80 ? "text-danger" : "text-paper-600";
const ScoreTrend = ({ s, className }: { s: number; className?: string }) =>
  s > 80 ? (
    <TrendingUp className={className} />
  ) : s < 80 ? (
    <TrendingDown className={className} />
  ) : null;

export function Students() {
  const {
    pupils,
    assignments,
    submissions,
    attendance,
    behavior,
    badges,
    getPupilScore,
    getPerformanceScore,
    updatePupilNotes,
    removeBehavior,
    removeBadge,
  } = useTracker();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Pupil whose ClassDojo-style points dialog is open (tap on an avatar card).
  const [pointsFor, setPointsFor] = useState<Pupil | null>(null);
  const [muted, setMuted] = useState(isSfxMuted);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setSfxMuted(next);
  };

  const pupilName = (id: string) =>
    pupils.find((p) => p.id === id)?.name ?? "Unknown";

  // Badge counts per badgeId for one pupil (a badge can be earned repeatedly).
  const pupilBadgeCounts = (pupilId: string) => {
    const counts = new Map<string, number>();
    badges
      .filter((b) => b.pupilId === pupilId)
      .forEach((b) => counts.set(b.badgeId, (counts.get(b.badgeId) ?? 0) + 1));
    return counts;
  };

  const attendanceStats = (pupilId: string) => {
    const days = Object.keys(attendance).filter(
      (d) => attendance[d][pupilId] !== undefined
    );
    const present = days.filter((d) => attendance[d][pupilId] === "present").length;
    const late = days.filter((d) => attendance[d][pupilId] === "late").length;
    const absent = days.filter((d) => attendance[d][pupilId] === "absent").length;
    const total = days.length;
    const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { present, late, absent, total, pct };
  };

  if (!selectedId) {
    // Net behavior points per pupil, highest first (name as tie-break), with
    // competition ranking: pupils on equal points share a place (1, 2, 2, 4).
    const totals = pupils
      .map((p) => {
        const net = behavior
          .filter((b) => b.pupilId === p.id)
          .reduce(
            (sum, b) =>
              sum + (b.type === "positive" ? BEHAVIOR_POINTS : -BEHAVIOR_POINTS),
            0
          );
        return { pupil: p, net };
      })
      .sort((a, b) => b.net - a.net || a.pupil.name.localeCompare(b.pupil.name));
    let lastPlace = 0;
    const ranked = totals.map((t, i, arr) => {
      if (i === 0 || arr[i - 1].net !== t.net) lastPlace = i + 1;
      return { ...t, place: lastPlace };
    });
    const pointsTone = (net: number) =>
      net > 0 ? "text-success" : net < 0 ? "text-danger" : "text-paper-400";
    const MEDALS = ["🥇", "🥈", "🥉"];

    // Per-pupil badge collection: pupils with at least one badge, most first.
    const cabinet = pupils
      .map((p) => ({
        pupil: p,
        total: badges.filter((b) => b.pupilId === p.id).length,
        counts: pupilBadgeCounts(p.id),
      }))
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total);

    return (
      <div className="space-y-4">
      <SectionCard title={`Students — ${pupils.length}`}>
        {pupils.length === 0 ? (
          <EmptyState title="No pupils yet">
            Add a namelist in the Homework tab.
          </EmptyState>
        ) : (
          // ClassDojo-style grid: avatar on top, name below, score on the
          // avatar's shoulder — packs the whole class onto one screen.
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
            {pupils.map((p) => {
              const perf = getPerformanceScore(p.id).score;
              const badgeCount = badges.filter((b) => b.pupilId === p.id).length;
              return (
                <li key={p.id}>
                  <button
                    onClick={() => setPointsFor(p)}
                    className="flex h-full w-full flex-col items-center gap-1.5 rounded-md border border-paper-100 bg-surface p-3 outline-none transition-colors hover:border-brand-400 focus-visible:shadow-ring"
                  >
                    <span className="relative">
                      <Avatar size="lg" name={p.name} />
                      <span
                        title={`Performance score ${perf}`}
                        className={`absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold tabular-nums text-surface ${
                          perf > 80
                            ? "bg-success"
                            : perf < 80
                              ? "bg-danger"
                              : "bg-paper-300"
                        }`}
                      >
                        {perf}
                      </span>
                    </span>
                    <span className="line-clamp-2 break-words text-center text-xs font-semibold text-paper-700">
                      {p.name}
                    </span>
                    {badgeCount > 0 && (
                      <span
                        className="text-2xs text-paper-400"
                        title={`${badgeCount} ${badgeCount === 1 ? "badge" : "badges"}`}
                      >
                        🏅 {badgeCount}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {pupils.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Class ranking — every pupil placed by net points so each child
              can see their position at a glance. */}
          <SectionCard title="Class ranking">
            <table className="w-full">
              <thead>
                <tr className="text-left text-2xs font-bold uppercase tracking-wider text-paper-400">
                  <th scope="col" className="w-20 px-3 py-2">
                    Place
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Pupil
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Total marks
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map(({ pupil, net, place }) => {
                  const medal = net > 0 && place <= 3 ? MEDALS[place - 1] : null;
                  return (
                    <tr
                      key={pupil.id}
                      className={`border-t border-paper-100 ${
                        medal
                          ? place === 1
                            ? "bg-mark-amber/60"
                            : "bg-mark-amber/25"
                          : ""
                      }`}
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-display text-sm font-bold tabular-nums text-paper-600">
                        #{place}
                        {medal && (
                          <span className="ml-1.5" aria-hidden>
                            {medal}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <Avatar size="xs" name={pupil.name} />
                          <span className="truncate text-sm font-medium text-paper-700">
                            {pupil.name}
                          </span>
                        </span>
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-display text-base font-bold tabular-nums ${scoreTone(
                          getPerformanceScore(pupil.id).score
                        )}`}
                      >
                        {getPerformanceScore(pupil.id).score}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-display text-base font-bold tabular-nums ${pointsTone(
                          net
                        )}`}
                      >
                        {net > 0 ? `+${net}` : net}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </SectionCard>

          {/* Activity log, ported from the old Behavior tab. */}
          <SectionCard title="Recent activity">
            {behavior.length === 0 ? (
              <EmptyState title="No behavior logged yet">
                Tap a pupil&apos;s avatar above to award points.
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
                        <Avatar size="xs" name={pupilName(b.pupilId)} />
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

          {/* Trophy cabinet + Recent awards, ported from the old Rewards tab. */}
          <SectionCard
            title="Trophy cabinet"
            action={
              <button
                onClick={toggleSound}
                aria-pressed={!muted}
                title={muted ? "Celebration sounds off" : "Celebration sounds on"}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-2xs font-bold uppercase tracking-wider text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-600 focus-visible:shadow-ring"
              >
                {muted ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 text-brand-500" />
                )}
                Sound
              </button>
            }
          >
            {cabinet.length === 0 ? (
              <EmptyState
                icon={<Trophy className="h-6 w-6" />}
                title="No badges awarded yet"
              >
                Tap a pupil&apos;s avatar and pick Badge to hand out the first
                reward.
              </EmptyState>
            ) : (
              <ul className="space-y-3">
                {cabinet.map(({ pupil, total, counts }) => (
                  <li
                    key={pupil.id}
                    className="rounded-md border border-paper-100 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex min-w-0 items-center gap-2">
                        <Avatar size="xs" name={pupil.name} />
                        <span className="truncate text-sm font-semibold text-paper-700">
                          {pupil.name}
                        </span>
                      </span>
                      <span className="text-2xs font-bold uppercase tracking-wider text-paper-400">
                        {total} {total === 1 ? "badge" : "badges"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[...counts.entries()].map(([bId, count]) => {
                        const def = badgeById(bId);
                        if (!def) return null;
                        return (
                          <HighlighterTag key={bId} marker={def.marker}>
                            <span aria-hidden="true">{def.emoji}</span>
                            {def.label}
                            {count > 1 && (
                              <span className="opacity-70">×{count}</span>
                            )}
                          </HighlighterTag>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Recent awards">
            {badges.length === 0 ? (
              <p className="text-sm text-paper-500">Nothing awarded yet.</p>
            ) : (
              <ul className="space-y-2">
                {badges.slice(0, 12).map((b) => {
                  const def = badgeById(b.badgeId);
                  return (
                    <li
                      key={b.id}
                      className="group flex items-start gap-3 rounded-md border border-paper-100 p-3"
                    >
                      <span className="text-2xl leading-none" aria-hidden="true">
                        {def?.emoji ?? "🏅"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Avatar size="xs" name={pupilName(b.pupilId)} />
                          <span className="text-sm font-semibold text-paper-700">
                            {pupilName(b.pupilId)}
                          </span>
                          {def && (
                            <HighlighterTag marker={def.marker}>
                              {def.label}
                            </HighlighterTag>
                          )}
                          <span className="text-xs text-paper-400">{b.date}</span>
                        </div>
                        {b.note && (
                          <p className="truncate text-sm text-paper-500">
                            {b.note}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeBadge(b.id)}
                        aria-label="Remove badge"
                        className="shrink-0 text-paper-300 opacity-0 outline-none transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      )}

      {pointsFor && (
        <BehaviorPointsModal
          pupil={pointsFor}
          onClose={() => setPointsFor(null)}
          onViewProfile={() => {
            setSelectedId(pointsFor.id);
            setPointsFor(null);
          }}
        />
      )}
      </div>
    );
  }

  const pupil = pupils.find((p) => p.id === selectedId);
  if (!pupil) {
    setSelectedId(null);
    return null;
  }

  const { score, total } = getPupilScore(pupil.id);
  const perfScore = getPerformanceScore(pupil.id).score;
  const hwPct = total > 0 ? Math.round((score / total) * 100) : 0;
  const att = attendanceStats(pupil.id);
  const records = behavior.filter((b) => b.pupilId === pupil.id);
  const netPoints = records.reduce(
    (s, b) => s + (b.type === "positive" ? 2 : -2),
    0
  );

  return (
    <div className="space-y-4">
      <button
        onClick={() => setSelectedId(null)}
        className="flex items-center gap-2 text-sm font-semibold text-paper-500 outline-none hover:text-brand-600 focus-visible:shadow-ring"
      >
        <ArrowLeft className="h-4 w-4" /> Back to all students
      </button>

      <SectionCard>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4">
            <Avatar name={pupil.name} size="lg" decorative={false} />
            <div>
              <h2 className="font-display text-xl font-semibold text-paper-800">
                {pupil.name}
              </h2>
              <p
                className={`text-sm font-semibold ${
                  netPoints > 0
                    ? "text-success"
                    : netPoints < 0
                    ? "text-danger"
                    : "text-paper-400"
                }`}
              >
                {netPoints > 0 ? `+${netPoints}` : netPoints} behavior points
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-8">
            <div className="text-center">
              <p
                className={`flex items-center justify-center gap-1 font-display text-3xl font-bold tabular-nums ${scoreTone(
                  perfScore
                )}`}
              >
                {perfScore}
                <ScoreTrend s={perfScore} className="h-6 w-6" />
              </p>
              <p className="text-xs text-paper-400">Performance score</p>
            </div>
            <Donut percentage={hwPct} size={92} sub="homework" />
            <Donut
              percentage={att.pct}
              size={92}
              color="var(--color-info)"
              trackColor="var(--color-info-bg)"
              sub="attendance"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Badges">
        {(() => {
          const counts = pupilBadgeCounts(pupil.id);
          if (counts.size === 0)
            return (
              <p className="text-sm text-paper-500">
                No badges yet — award one by tapping the pupil&apos;s avatar in
                the class grid.
              </p>
            );
          return (
            <div className="flex flex-wrap gap-2">
              {[...counts.entries()].map(([bId, count]) => {
                const def = badgeById(bId);
                if (!def) return null;
                return (
                  <HighlighterTag key={bId} marker={def.marker}>
                    <span aria-hidden="true">{def.emoji}</span>
                    {def.label}
                    {count > 1 && <span className="opacity-70">×{count}</span>}
                  </HighlighterTag>
                );
              })}
            </div>
          );
        })()}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Homework history">
          {assignments.length === 0 ? (
            <p className="text-sm text-paper-500">No assignments yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {assignments.map((a) => {
                const done = !!submissions[a.id]?.[pupil.id];
                return (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-md border border-paper-100 px-3 py-2 text-sm"
                  >
                    <span className="text-paper-600">
                      <span className="font-medium">{a.title}</span>{" "}
                      <span className="text-xs text-paper-400">{a.date}</span>
                    </span>
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full ${
                        done
                          ? "bg-success-bg text-success"
                          : "bg-danger-bg text-danger"
                      }`}
                    >
                      {done ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Attendance record">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-success-bg p-3">
                <p className="font-display text-2xl font-bold text-success">
                  {att.present}
                </p>
                <p className="text-xs text-paper-400">Present</p>
              </div>
              <div className="rounded-lg bg-warning-bg p-3">
                <p className="font-display text-2xl font-bold text-warning">
                  {att.late}
                </p>
                <p className="text-xs text-paper-400">Late</p>
              </div>
              <div className="rounded-lg bg-danger-bg p-3">
                <p className="font-display text-2xl font-bold text-danger">
                  {att.absent}
                </p>
                <p className="text-xs text-paper-400">Absent</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Behavior log">
            {records.length === 0 ? (
              <p className="text-sm text-paper-500">Nothing logged yet.</p>
            ) : (
              <ul className="thin-scroll max-h-44 space-y-1.5 overflow-auto">
                {records.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center gap-2 text-sm text-paper-600"
                  >
                    {b.type === "positive" ? (
                      <ThumbsUp className="h-4 w-4 text-success" />
                    ) : (
                      <ThumbsDown className="h-4 w-4 text-danger" />
                    )}
                    <span className="truncate">{b.note || b.type}</span>
                    <span className="ml-auto text-xs text-paper-400">
                      {b.date}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Teacher notes">
        <textarea
          value={pupil.notes ?? ""}
          onChange={(e) => updatePupilNotes(pupil.id, e.target.value)}
          placeholder="Private notes about this pupil…"
          rows={3}
          className={`w-full ${fieldClassName}`}
        />
      </SectionCard>
    </div>
  );
}
