"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useTracker } from "@/lib/store";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";
import { Field, fieldClassName } from "@/components/ui/Field";
import {
  matchClassId,
  normClass,
  todayTabName,
  blocksForTab,
  type PlanBlock,
} from "@/lib/lesson-plan";
import { parseSpreadsheetId } from "@/lib/google-sheets-url";

function formatAgo(at: number): string {
  const secs = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return `${hours}h ago`;
}

export function LessonPlanCard() {
  const {
    lessonPlanUrl,
    setLessonPlanUrl,
    lessonPlan,
    classes,
    classAliases,
    setClassAlias,
    setCurrentClass,
    currentClassId,
    lessonPlanSyncStatus,
    retryLessonPlanSync,
  } = useTracker();

  // Forces a re-render every 30s so "Synced Nm ago" stays roughly current.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (lessonPlanSyncStatus.state !== "synced") return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [lessonPlanSyncStatus.state]);

  const todayTab = todayTabName();
  const todayBlocks = lessonPlan && todayTab ? blocksForTab(lessonPlan, todayTab) : [];

  // Distinct plan classes that don't map to an app class (need an alias).
  const unmatched = lessonPlan
    ? [...new Set(lessonPlan.blocks.map((b) => b.classRaw))].filter(
        (raw) => !matchClassId(raw, classes, classAliases)
      )
    : [];

  const urlLooksValid = !lessonPlanUrl || !!parseSpreadsheetId(lessonPlanUrl);

  return (
    <SectionCard title="My lesson plan">
      <div className="space-y-5">
        {/* Google Sheet link */}
        <Field label="Google Sheet link (this week's plan)" htmlFor="lp-url">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="lp-url"
              type="url"
              inputMode="url"
              placeholder="https://docs.google.com/spreadsheets/d/…"
              value={lessonPlanUrl}
              onChange={(e) => setLessonPlanUrl(e.target.value)}
              className={`${fieldClassName} w-full`}
            />
            {lessonPlanUrl && (
              <a
                href={lessonPlanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-paper-200 bg-surface px-4 py-2 text-sm font-semibold text-paper-700 outline-none transition hover:border-brand-400 focus-visible:shadow-ring"
              >
                Open plan
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          {!urlLooksValid && (
            <p className="mt-1 text-2xs text-paper-400">
              That doesn&apos;t look like a Google Sheets link.
            </p>
          )}
        </Field>

        {/* Sync status */}
        {lessonPlanUrl && urlLooksValid && (
          <SyncStatusBanner status={lessonPlanSyncStatus} onRetry={retryLessonPlanSync} />
        )}

        {/* Alias editor for unmatched plan classes */}
        {unmatched.length > 0 && (
          <div className="rounded-md border border-warning/40 bg-warning/5 p-3">
            <p className="mb-2 text-2xs font-bold uppercase tracking-wider text-warning">
              Match these plan classes to your classes
            </p>
            <ul className="space-y-2">
              {unmatched.map((raw) => (
                <li key={raw} className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-paper-700">{raw}</span>
                  <span className="text-paper-400">→</span>
                  <select
                    className={fieldClassName}
                    defaultValue=""
                    onChange={(e) =>
                      e.target.value && setClassAlias(normClass(raw), e.target.value)
                    }
                  >
                    <option value="" disabled>
                      Choose class…
                    </option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Today's classes from the plan */}
        {lessonPlan && (
          <div>
            <p className="mb-2 flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-paper-400">
              <CalendarClock className="h-4 w-4" />
              Today{todayTab ? ` (${todayTab})` : ""}
            </p>
            {!todayTab ? (
              <p className="text-sm text-paper-400">No school today (weekend).</p>
            ) : todayBlocks.length === 0 ? (
              <p className="text-sm text-paper-400">
                No lessons found for today in the plan.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {todayBlocks.map((b, i) => (
                  <TodayBlockChip
                    key={`${b.classRaw}-${i}`}
                    block={b}
                    matchedId={matchClassId(b.classRaw, classes, classAliases)}
                    active={
                      matchClassId(b.classRaw, classes, classAliases) === currentClassId
                    }
                    onSwitch={setCurrentClass}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function SyncStatusBanner({
  status,
  onRetry,
}: {
  status: ReturnType<typeof useTracker>["lessonPlanSyncStatus"];
  onRetry: () => void;
}) {
  if (status.state === "idle") return null;

  if (status.state === "syncing") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-paper-100 p-3 text-sm text-paper-500">
        <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
        Syncing to Google Sheet…
      </div>
    );
  }

  if (status.state === "synced") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-success/10 p-3 text-sm text-success">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Synced {formatAgo(status.at)}
        {status.updatedCount > 0
          ? ` — updated ${status.updatedCount} reflection${status.updatedCount === 1 ? "" : "s"}.`
          : "."}
      </div>
    );
  }

  // error
  return (
    <div className="flex items-start gap-2 rounded-md bg-danger/10 p-3 text-sm text-danger">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1 space-y-1">
        <p>{status.message}</p>
        {status.serviceAccountEmail && (
          <p className="text-2xs text-danger/80">
            Share the sheet with{" "}
            <span className="font-mono font-semibold">{status.serviceAccountEmail}</span> as
            Editor, then retry.
          </p>
        )}
        <Button variant="secondary" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    </div>
  );
}

function TodayBlockChip({
  block,
  matchedId,
  active,
  onSwitch,
}: {
  block: PlanBlock;
  matchedId: string | null;
  active: boolean;
  onSwitch: (id: string) => void;
}) {
  const time =
    block.timeStart && block.timeEnd
      ? `${block.timeStart}–${block.timeEnd}`
      : block.timeStart || "";
  return (
    <li>
      <button
        type="button"
        disabled={!matchedId}
        onClick={() => matchedId && onSwitch(matchedId)}
        title={block.topic || undefined}
        className={`flex flex-col items-start rounded-md border px-3 py-2 text-left outline-none transition focus-visible:shadow-ring disabled:opacity-50 ${
          active
            ? "border-brand-400 bg-brand-50"
            : "border-paper-200 bg-surface hover:border-brand-300"
        }`}
      >
        <span className="font-display text-sm font-semibold text-paper-800">
          {block.classRaw}
          {active && <span className="ml-1 text-2xs text-brand-600">• now showing</span>}
        </span>
        {time && <span className="text-2xs text-paper-400">{time}</span>}
      </button>
    </li>
  );
}
