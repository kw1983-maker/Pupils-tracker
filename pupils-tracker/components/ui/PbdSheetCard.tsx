"use client";

import { useMemo, useState } from "react";
import {
  ClipboardCheck,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
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

  const urlLooksValid = !pbdSheetUrl || !!parseSpreadsheetId(pbdSheetUrl);
  const skill = standardCodeSkill(standardCode.trim());
  const canFill =
    !!parseSpreadsheetId(pbdSheetUrl) && !!skill && fillState.state !== "loading";

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
      const res = await fetch("/api/pbd-sheet", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          spreadsheetUrl: pbdSheetUrl,
          className: currentClassName,
          standardCode: standardCode.trim(),
          dateISO: today,
          presentNames,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFillState({
          state: "done",
          updatedCount: data.updatedCount,
          results: data.results ?? [],
        });
      } else {
        setFillState({
          state: "error",
          message: data.message ?? "Fill failed.",
          serviceAccountEmail: data.serviceAccountEmail,
        });
      }
    } catch {
      setFillState({ state: "error", message: "Could not reach the server." });
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
