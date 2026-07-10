"use client";

import { useMemo, useState } from "react";
import {
  ClipboardCheck,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  CalendarCheck,
} from "lucide-react";
import { useTracker, todayISO } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";
import { Field, fieldClassName } from "@/components/ui/Field";
import { parseSpreadsheetId } from "@/lib/google-sheets-url";
import { standardCodeSkill, type PupilFillStatus } from "@/lib/pbd-sheet";
import {
  matchClassId,
  todayTabName,
  blocksForTab,
  pickCurrentBlock,
  extractStandardCode,
  WEEKDAY_TABS,
  currentWeekDateForTab,
} from "@/lib/lesson-plan";

interface PupilFillResult {
  name: string;
  status: PupilFillStatus;
}

type FillState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "done"; updatedCount: number; results: PupilFillResult[] }
  | { state: "error"; message: string; serviceAccountEmail?: string };

const STATUS_LABEL: Record<PupilFillStatus, string> = {
  filled: "filled",
  "filled-new-row": "added + filled",
  "no-pbd-score": "no PBD score yet",
  "sheet-full": "no blank row left",
};

interface DayFillOutcome {
  tabName: string;
  dateISO: string;
  standardCode: string | null;
  skipReason?: "no-standard" | "no-attendance";
  ok?: boolean;
  updatedCount?: number;
  results?: PupilFillResult[];
  message?: string;
}

type WeekFillState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "done"; outcomes: DayFillOutcome[] }
  | { state: "error"; message: string };

async function fillOneDay(
  idToken: string,
  spreadsheetUrl: string,
  className: string,
  standardCode: string,
  dateISO: string,
  presentNames: string[]
): Promise<{ ok: boolean; updatedCount?: number; results?: PupilFillResult[]; message?: string; serviceAccountEmail?: string }> {
  const res = await fetch("/api/pbd-sheet", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ spreadsheetUrl, className, standardCode, dateISO, presentNames }),
  });
  const data = await res.json();
  if (data.ok) {
    return { ok: true, updatedCount: data.updatedCount, results: data.results ?? [] };
  }
  return { ok: false, message: data.message ?? "Fill failed.", serviceAccountEmail: data.serviceAccountEmail };
}

export function PbdSheetCard() {
  const {
    pbdSheetUrl,
    setPbdSheetUrl,
    currentClassId,
    currentClassName,
    pupils,
    attendance,
    lessonPlan,
    classes,
    classAliases,
  } = useTracker();
  const { user } = useAuth();
  const [standardCode, setStandardCode] = useState("");
  const [fillState, setFillState] = useState<FillState>({ state: "idle" });
  const [weekFillState, setWeekFillState] = useState<WeekFillState>({ state: "idle" });

  // Suggest today's standard code from the lesson plan, for this class: the
  // block whose time window is active right now, or otherwise the most
  // recent one that already started today (a teacher filling this in after
  // the period ends is the common case, not "live during the lesson").
  const suggestedBlock = useMemo(() => {
    const todayTab = todayTabName();
    if (!lessonPlan || !todayTab) return null;
    const todayClassBlocks = blocksForTab(lessonPlan, todayTab).filter(
      (b) => matchClassId(b.classRaw, classes, classAliases) === currentClassId
    );
    if (todayClassBlocks.length === 0) return null;
    const active = pickCurrentBlock(todayClassBlocks);
    if (active) return active;
    const started = todayClassBlocks
      .filter((b) => b.startMin != null)
      .sort((a, b) => (b.startMin as number) - (a.startMin as number));
    return started[0] ?? todayClassBlocks[0];
  }, [lessonPlan, classes, classAliases, currentClassId]);

  const suggestedCode = suggestedBlock
    ? extractStandardCode(suggestedBlock.learningStandard)
    : null;

  // Auto-fill from the suggestion, without fighting a manual edit — adjusted
  // during render (React's recommended pattern for "reset state when a
  // derived value changes") rather than in an effect, so it only overwrites
  // standardCode when suggestedCode itself actually changes (new class, new
  // lesson plan data), not on every re-render.
  const [lastSuggestedCode, setLastSuggestedCode] = useState<string | null>(null);
  if (suggestedCode !== lastSuggestedCode) {
    setLastSuggestedCode(suggestedCode);
    if (suggestedCode) setStandardCode(suggestedCode);
  }

  // Every this-week lesson-plan block (any weekday tab) for the current
  // class — the basis for "Fill this week", independent of whatever's typed
  // in the single-day standard-code box above.
  const weekBlocksForClass = useMemo(() => {
    if (!lessonPlan) return [];
    return WEEKDAY_TABS.flatMap((tab) =>
      blocksForTab(lessonPlan, tab).filter(
        (b) => matchClassId(b.classRaw, classes, classAliases) === currentClassId
      )
    );
  }, [lessonPlan, classes, classAliases, currentClassId]);

  const urlLooksValid = !pbdSheetUrl || !!parseSpreadsheetId(pbdSheetUrl);
  const skill = standardCodeSkill(standardCode.trim());
  const canFill =
    !!parseSpreadsheetId(pbdSheetUrl) && !!skill && fillState.state !== "loading";
  const canFillWeek =
    !!parseSpreadsheetId(pbdSheetUrl) &&
    weekBlocksForClass.length > 0 &&
    weekFillState.state !== "loading";

  const handleFill = async () => {
    if (!canFill) return;
    if (!user) {
      setFillState({
        state: "error",
        message: "Sign in (Cloud Sync) to fill in the Google Sheet.",
      });
      return;
    }

    const today = todayISO();
    const presentNames = pupils
      .filter((p) => attendance[today]?.[p.id] !== "absent")
      .map((p) => p.name);

    setFillState({ state: "loading" });
    try {
      const idToken = await user.getIdToken();
      const outcome = await fillOneDay(
        idToken,
        pbdSheetUrl,
        currentClassName,
        standardCode.trim(),
        today,
        presentNames
      );
      if (outcome.ok) {
        setFillState({
          state: "done",
          updatedCount: outcome.updatedCount ?? 0,
          results: outcome.results ?? [],
        });
      } else {
        setFillState({
          state: "error",
          message: outcome.message ?? "Fill failed.",
          serviceAccountEmail: outcome.serviceAccountEmail,
        });
      }
    } catch {
      setFillState({ state: "error", message: "Could not reach the server." });
    }
  };

  // Walks Mon-Fri in order for this class: skips a day if no attendance was
  // recorded at all (not taught yet / no lesson that day) or the block has
  // no learning standard, otherwise fills that day's Band from that day's
  // own recorded attendance — one API call per day, sequentially.
  const handleFillWeek = async () => {
    if (!canFillWeek) return;
    if (!user) {
      setWeekFillState({
        state: "error",
        message: "Sign in (Cloud Sync) to fill in the Google Sheet.",
      });
      return;
    }

    setWeekFillState({ state: "loading" });
    const outcomes: DayFillOutcome[] = [];
    try {
      const idToken = await user.getIdToken();
      for (const block of weekBlocksForClass) {
        const dateISO = currentWeekDateForTab(block.tabName);
        if (!dateISO) continue;
        const day = attendance[dateISO];
        if (!day || Object.keys(day).length === 0) {
          outcomes.push({ tabName: block.tabName, dateISO, standardCode: null, skipReason: "no-attendance" });
          continue;
        }
        const code = extractStandardCode(block.learningStandard);
        if (!code) {
          outcomes.push({ tabName: block.tabName, dateISO, standardCode: null, skipReason: "no-standard" });
          continue;
        }
        const presentNames = pupils.filter((p) => day[p.id] !== "absent").map((p) => p.name);
        const outcome = await fillOneDay(idToken, pbdSheetUrl, currentClassName, code, dateISO, presentNames);
        outcomes.push({
          tabName: block.tabName,
          dateISO,
          standardCode: code,
          ok: outcome.ok,
          updatedCount: outcome.updatedCount,
          results: outcome.results,
          message: outcome.message,
        });
      }
      setWeekFillState({ state: "done", outcomes });
    } catch {
      setWeekFillState({ state: "error", message: "Could not reach the server." });
    }
  };

  return (
    <SectionCard title="Rekod Perkembangan Murid (PBD)">
      <div className="space-y-5">
        <Field label={`Google Sheet link (${currentClassName})`} htmlFor="pbd-url">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="pbd-url"
              type="url"
              inputMode="url"
              placeholder="https://docs.google.com/spreadsheets/d/…"
              value={pbdSheetUrl}
              onChange={(e) => setPbdSheetUrl(e.target.value)}
              className={`${fieldClassName} w-full`}
            />
            {pbdSheetUrl && (
              <a
                href={pbdSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-paper-200 bg-surface px-4 py-2 text-sm font-semibold text-paper-700 outline-none transition hover:border-brand-400 focus-visible:shadow-ring"
              >
                Open sheet
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

        <p className="text-2xs text-paper-400">
          Reminder: share this sheet with{" "}
          <span className="font-mono font-semibold text-paper-500">
            sheets-writer@pupils-tracker-sheets.iam.gserviceaccount.com
          </span>{" "}
          as Editor, or filling it in will fail.
        </p>

        <Field label="Learning standard taught today" htmlFor="pbd-standard">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="pbd-standard"
              type="text"
              placeholder="e.g. 1.2.1"
              value={standardCode}
              onChange={(e) => setStandardCode(e.target.value)}
              className={`${fieldClassName} w-full sm:w-40`}
            />
            <Button onClick={handleFill} disabled={!canFill}>
              {fillState.state === "loading" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <ClipboardCheck className="h-4 w-4" />
              )}
              Fill today&apos;s Band
            </Button>
          </div>
          {standardCode.trim() && !skill && (
            <p className="mt-1 text-2xs text-paper-400">
              Should start with 1–4 (e.g. &ldquo;1.2.1&rdquo;) — Listening/Speaking/Reading/Writing.
            </p>
          )}
          {suggestedCode && suggestedCode === standardCode.trim() && (
            <p className="mt-1 text-2xs text-paper-400">
              From today&apos;s lesson plan{suggestedBlock?.topic ? ` — "${suggestedBlock.topic}"` : ""}.
              Edit if this isn&apos;t the right lesson.
            </p>
          )}
          {!suggestedCode && lessonPlan && (
            <p className="mt-1 text-2xs text-paper-400">
              No learning standard found in today&apos;s lesson plan for this class — enter it by hand.
            </p>
          )}
        </Field>

        <FillStatusBanner state={fillState} />

        <div className="border-t border-paper-100 pt-4">
          <p className="mb-2 text-2xs text-paper-400">
            Or fill in everything already taught to {currentClassName} this week, using each
            day&apos;s own learning standard and that day&apos;s recorded attendance:
          </p>
          <Button variant="secondary" onClick={handleFillWeek} disabled={!canFillWeek}>
            {weekFillState.state === "loading" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarCheck className="h-4 w-4" />
            )}
            Fill this week
          </Button>
          {!lessonPlan && (
            <p className="mt-1 text-2xs text-paper-400">
              Paste your weekly lesson plan link above first — this reads from it.
            </p>
          )}
          {lessonPlan && weekBlocksForClass.length === 0 && (
            <p className="mt-1 text-2xs text-paper-400">
              No lessons found for {currentClassName} in this week&apos;s plan.
            </p>
          )}
          <WeekFillStatusBanner state={weekFillState} />
        </div>
      </div>
    </SectionCard>
  );
}

function FillStatusBanner({ state }: { state: FillState }) {
  if (state.state === "idle" || state.state === "loading") return null;

  if (state.state === "done") {
    const skipped = state.results.filter(
      (r) => r.status === "no-pbd-score" || r.status === "sheet-full"
    );
    return (
      <div className="flex items-start gap-2 rounded-md bg-success/10 p-3 text-sm text-success">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1 space-y-1">
          <p>
            Filled {state.results.length - skipped.length} pupil
            {state.results.length - skipped.length === 1 ? "" : "s"}
            {state.updatedCount > 0 ? ` (${state.updatedCount} cells updated).` : "."}
          </p>
          {skipped.length > 0 && (
            <p className="text-2xs text-success/80">
              Skipped: {skipped.map((r) => `${r.name} (${STATUS_LABEL[r.status]})`).join(", ")}
            </p>
          )}
        </div>
      </div>
    );
  }

  // error
  return (
    <div className="flex items-start gap-2 rounded-md bg-danger/10 p-3 text-sm text-danger">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1 space-y-1">
        <p>{state.message}</p>
        {state.serviceAccountEmail && (
          <p className="text-2xs text-danger/80">
            Share the sheet with{" "}
            <span className="font-mono font-semibold">{state.serviceAccountEmail}</span> as
            Editor, then try again.
          </p>
        )}
      </div>
    </div>
  );
}

const SKIP_REASON_LABEL: Record<NonNullable<DayFillOutcome["skipReason"]>, string> = {
  "no-standard": "no learning standard found for this lesson",
  "no-attendance": "no attendance recorded — skipped",
};

function WeekFillStatusBanner({ state }: { state: WeekFillState }) {
  if (state.state === "idle" || state.state === "loading") return null;

  if (state.state === "error") {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-md bg-danger/10 p-3 text-sm text-danger">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{state.message}</p>
      </div>
    );
  }

  const filled = state.outcomes.filter((o) => o.ok);
  const failed = state.outcomes.filter((o) => o.ok === false);
  const skipped = state.outcomes.filter((o) => o.skipReason);

  if (state.outcomes.length === 0) return null;

  return (
    <div className="mt-2 space-y-1 rounded-md bg-paper-50 p-3 text-sm">
      {filled.map((o) => {
        const skippedPupils = (o.results ?? []).filter(
          (r) => r.status === "no-pbd-score" || r.status === "sheet-full"
        );
        const count = (o.results ?? []).length - skippedPupils.length;
        return (
          <p key={o.tabName} className="flex items-start gap-2 text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {o.tabName} ({o.dateISO}) — {o.standardCode}: filled {count} pupil
              {count === 1 ? "" : "s"}
              {skippedPupils.length > 0 &&
                ` (skipped ${skippedPupils.map((r) => r.name).join(", ")})`}
              .
            </span>
          </p>
        );
      })}
      {failed.map((o) => (
        <p key={o.tabName} className="flex items-start gap-2 text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {o.tabName} ({o.dateISO}) — {o.standardCode}: {o.message}
          </span>
        </p>
      ))}
      {skipped.map((o) => (
        <p key={o.tabName} className="text-paper-400">
          {o.tabName} ({o.dateISO}): {SKIP_REASON_LABEL[o.skipReason!]}.
        </p>
      ))}
    </div>
  );
}
