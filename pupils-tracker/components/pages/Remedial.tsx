"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Pencil,
  Play,
  Puzzle,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { REMEDIAL_ACTIVITIES, type RemedialActivity } from "@/lib/remedial";
import { PBD_BI } from "@/lib/pbd-bi";
import { useTracker } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import { Avatar } from "@/components/ui/Avatar";
import { fieldClassName } from "@/components/ui/Field";

// Compact star + score label (warning tone per design system).
function StarScore({
  score,
  className = "",
}: {
  score: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden />
      {score}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export function Remedial() {
  const { currentClassName, remedialScores, addRemedialScore } = useTracker();

  // The activity the pupil is about to play / playing. `player` is null while
  // the "Who's playing?" name picker is shown, set once a pupil is picked.
  const [activity, setActivity] = useState<RemedialActivity | null>(null);
  const [player, setPlayer] = useState<string | null>(null);
  // Latest running score the activity has reported via postMessage.
  const [liveScore, setLiveScore] = useState(0);
  // Brief confirmation after a play is saved.
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Year group of the current class, parsed from the leading digit of its name
  // ("1B" -> 1, "2D" -> 2). Activities are gated to the class's year.
  const classYear = useMemo(() => {
    const m = currentClassName.match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  }, [currentClassName]);

  // Activities available for this class: those matching its year, plus any that
  // are year-agnostic (no `year` set).
  const activities = useMemo(
    () =>
      REMEDIAL_ACTIVITIES.filter(
        (a) => a.year == null || a.year === classYear
      ),
    [classYear]
  );

  // Band 1/2 pupils of the current class — the remedial group (worst band first).
  const report = PBD_BI[currentClassName];
  const remedialPupils = useMemo(
    () =>
      (report?.records ?? [])
        .filter((r) => r.overall <= 2)
        .sort((a, b) => a.overall - b.overall || a.name.localeCompare(b.name)),
    [report]
  );

  // Listen for scores reported by the activity iframe (same-origin only).
  useEffect(() => {
    if (!activity || !player) return;
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (
        data &&
        data.type === "remedial-score" &&
        typeof data.score === "number"
      ) {
        setLiveScore(data.score);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [activity, player]);

  const leaveActivity = () => {
    setActivity(null);
    setPlayer(null);
    setLiveScore(0);
  };

  const finishAndSave = () => {
    if (!activity || !player) return;
    addRemedialScore(player, activity.id, activity.title, liveScore);
    setSavedMsg(`Saved ${player}'s score (${liveScore} stars) for ${activity.title}`);
    leaveActivity();
  };

  // ---- Playing an activity ----
  if (activity && player) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="secondary" size="sm" onClick={leaveActivity}>
              <ArrowLeft className="h-4 w-4" />
              Back to activities
            </Button>
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg font-semibold text-paper-900">
                {activity.title}
              </h2>
              <p className="truncate text-xs font-semibold text-paper-400">
                Playing as {player}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={finishAndSave}>
              <Check className="h-4 w-4" />
              Finish &amp; save <StarScore score={liveScore} />
            </Button>
            <a
              href={`${activity.path}?pupil=${encodeURIComponent(player)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-paper-400 outline-none transition hover:text-brand-600 hover:underline focus-visible:shadow-ring"
            >
              Open in new tab
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
        <iframe
          src={`${activity.path}?pupil=${encodeURIComponent(player)}`}
          title={activity.title}
          allow="autoplay; fullscreen; clipboard-write"
          allowFullScreen
          className="h-[calc(100vh-14rem)] w-full rounded-card border border-paper-200 bg-surface"
        />
      </div>
    );
  }

  // ---- Name picker: "Who's playing?" ----
  if (activity && !player) {
    return (
      <SectionCard title={`Who's playing? — ${activity.title}`}>
        <div className="mb-3">
          <Button variant="secondary" size="sm" onClick={leaveActivity}>
            <ArrowLeft className="h-4 w-4" />
            Back to activities
          </Button>
        </div>
        {remedialPupils.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No remedial pupils for this class"
          >
            Pupils appear here automatically once they have an overall band of 1
            or 2 in the Analytics data for {currentClassName || "this class"}.
          </EmptyState>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {remedialPupils.map((p) => (
              <li key={p.name}>
                <button
                  type="button"
                  onClick={() => {
                    setLiveScore(0);
                    setPlayer(p.name);
                  }}
                  className="group flex w-full items-center gap-3 rounded-md border border-paper-100 p-3 text-left outline-none transition hover:border-brand-300 hover:bg-brand-50 focus-visible:shadow-ring"
                >
                  <Avatar name={p.name} size="sm" highlight="low" />
                  <span className="min-w-0 flex-1 text-sm font-semibold text-paper-800">
                    {p.name}
                  </span>
                  <StatusPill status="danger">Band {p.overall}</StatusPill>
                  <Play className="h-4 w-4 shrink-0 text-paper-300 transition group-hover:text-brand-600" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    );
  }

  // ---- Activity list + progress panel ----
  return (
    <div className="space-y-4">
      {savedMsg && (
        <div className="flex items-center gap-2 rounded-card bg-success-bg px-4 py-2.5 text-sm font-semibold text-success-ink">
          <Check className="h-4 w-4 shrink-0" />
          {savedMsg}
        </div>
      )}

      <SectionCard title="Remedial">
        {activities.length === 0 ? (
          <EmptyState
            icon={<Puzzle className="h-6 w-6" />}
            title="No activities for this class"
          >
            {classYear
              ? `There are no remedial activities for Year ${classYear} yet.`
              : "There are no remedial activities for this class yet."}
          </EmptyState>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {activities.map((a) => (
            <li
              key={a.id}
              className="flex items-stretch gap-1 rounded-md border border-paper-100 transition hover:border-brand-300 hover:bg-brand-50"
            >
              <button
                type="button"
                onClick={() => {
                  setSavedMsg(null);
                  setActivity(a);
                  setPlayer(null);
                }}
                className="group flex min-w-0 flex-1 items-center gap-3 rounded-md p-3 text-left outline-none focus-visible:shadow-ring"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mark-green text-mark-green-ink">
                  <Puzzle className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-paper-800">
                  {a.title}
                </span>
                <Play className="h-4 w-4 shrink-0 text-paper-300 transition group-hover:text-brand-600" />
              </button>
              <a
                href={a.path}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new tab"
                aria-label={`Open ${a.title} in a new tab`}
                className="my-2 mr-2 flex w-9 shrink-0 items-center justify-center rounded-md text-paper-400 outline-none transition-colors hover:bg-brand-100 hover:text-brand-700 focus-visible:shadow-ring"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <RemedialProgress
        scores={remedialScores}
        bandByName={
          new Map((report?.records ?? []).map((r) => [r.name, r.overall]))
        }
      />
    </div>
  );
}

// Groups saved scores by pupil, then by activity, so the teacher sees each
// remedial pupil's progress (plays, best, latest, dated history) over time.
function RemedialProgress({
  scores,
  bandByName,
}: {
  scores: import("@/lib/types").RemedialScore[];
  bandByName: Map<string, number>;
}) {
  const { updateRemedialScore, removeRemedialScore } = useTracker();
  const byPupil = useMemo(() => {
    const pupils = new Map<
      string,
      Map<
        string,
        {
          title: string;
          plays: { id: string; score: number; playedAt: string }[];
        }
      >
    >();
    for (const s of scores) {
      if (!pupils.has(s.pupilName)) pupils.set(s.pupilName, new Map());
      const acts = pupils.get(s.pupilName)!;
      if (!acts.has(s.activityId))
        acts.set(s.activityId, { title: s.activityTitle, plays: [] });
      acts.get(s.activityId)!.plays.push({
        id: s.id,
        score: s.score,
        playedAt: s.playedAt,
      });
    }
    // Sort pupils by band (worst first), then name; sort each pupil's plays
    // most-recent first.
    return Array.from(pupils.entries())
      .map(([name, acts]) => ({
        name,
        band: bandByName.get(name),
        activities: Array.from(acts.entries()).map(([activityId, a]) => {
          const plays = [...a.plays].sort(
            (x, y) =>
              new Date(y.playedAt).getTime() - new Date(x.playedAt).getTime()
          );
          return {
            activityId,
            title: a.title,
            plays,
            best: Math.max(...plays.map((p) => p.score)),
            latest: plays[0]?.score ?? 0,
          };
        }),
      }))
      .sort(
        (a, b) =>
          (a.band ?? 99) - (b.band ?? 99) || a.name.localeCompare(b.name)
      );
  }, [scores, bandByName]);

  return (
    <SectionCard title="Progress">
      {byPupil.length === 0 ? (
        <EmptyState
          icon={<Star className="h-6 w-6" />}
          title="No scores yet"
        >
          When a remedial pupil finishes an activity and you tap “Finish &amp;
          save”, their score appears here so you can track their progress.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {byPupil.map((pupil) => (
            <li
              key={pupil.name}
              className="rounded-md border border-paper-100 p-3"
            >
              <div className="mb-2 flex items-center gap-3">
                <Avatar name={pupil.name} size="sm" />
                <span className="min-w-0 flex-1 text-sm font-semibold text-paper-800">
                  {pupil.name}
                </span>
                {pupil.band != null && (
                  <StatusPill status="danger">Band {pupil.band}</StatusPill>
                )}
              </div>
              <div className="space-y-2">
                {pupil.activities.map((a) => (
                  <div
                    key={a.activityId}
                    className="rounded-md bg-paper-50 p-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-paper-700">
                        {a.title}
                      </span>
                      <StatusPill status="neutral">
                        {a.plays.length}{" "}
                        {a.plays.length === 1 ? "play" : "plays"}
                      </StatusPill>
                      <StatusPill status="success">
                        <Star className="h-3 w-3" />
                        Best {a.best}
                      </StatusPill>
                      <StatusPill status="info">Latest {a.latest}</StatusPill>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {a.plays.map((p) => (
                        <PlayRow
                          key={p.id}
                          play={p}
                          onSave={(score) => updateRemedialScore(p.id, score)}
                          onDelete={() => removeRemedialScore(p.id)}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

// One dated play in the progress list — read-only by default, with inline
// edit (change the score) and a two-tap delete confirm.
function PlayRow({
  play,
  onSave,
  onDelete,
}: {
  play: { id: string; score: number; playedAt: string };
  onSave: (score: number) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState(String(play.score));

  const startEdit = () => {
    setDraft(String(play.score));
    setConfirmDelete(false);
    setEditing(true);
  };

  const save = () => {
    const n = Math.max(0, Math.round(Number(draft)));
    if (!Number.isNaN(n)) onSave(n);
    setEditing(false);
  };

  if (editing) {
    return (
      <li className="flex items-center justify-between gap-2 text-xs text-paper-500">
        <span>{formatDate(play.playedAt)}</span>
        <div className="flex items-center gap-1.5">
          <span aria-hidden="true">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
          </span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            aria-label="Edit score"
            className={`${fieldClassName} w-16 py-1`}
          />
          <button
            type="button"
            onClick={save}
            aria-label="Save score"
            className="rounded-md p-1 text-success outline-none transition-colors hover:bg-success-bg focus-visible:shadow-ring"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="Cancel edit"
            className="rounded-md p-1 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-700 focus-visible:shadow-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 text-xs text-paper-500">
      <span>{formatDate(play.playedAt)}</span>
      <div className="flex items-center gap-1.5">
        <StarScore score={play.score} className="font-semibold text-paper-700" />
        {confirmDelete ? (
          <>
            <span className="text-danger">Delete?</span>
            <button
              type="button"
              onClick={onDelete}
              aria-label="Confirm delete"
              className="rounded-md p-1 text-danger outline-none transition-colors hover:bg-danger-bg focus-visible:shadow-ring"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              aria-label="Cancel delete"
              className="rounded-md p-1 text-paper-400 outline-none transition-colors hover:bg-paper-100 hover:text-paper-700 focus-visible:shadow-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={startEdit}
              aria-label="Edit score"
              className="rounded-md p-1 text-paper-400 outline-none transition-colors hover:bg-brand-100 hover:text-brand-700 focus-visible:shadow-ring"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete score"
              className="rounded-md p-1 text-paper-400 outline-none transition-colors hover:bg-danger-bg hover:text-danger-ink focus-visible:shadow-ring"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
