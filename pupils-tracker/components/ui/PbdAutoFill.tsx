"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, X } from "lucide-react";
import { useTracker } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { parseSpreadsheetId } from "@/lib/google-sheets-url";
import { fillPbdOneDay } from "@/lib/pbd-client";
import type { PbdFillSkipReason } from "@/lib/pbd-sheet";
import { pbdSubjectForLesson } from "@/lib/pbd-subjects";
import {
  blocksForTab,
  currentWeekDateForTab,
  extractStandardCode,
  matchClassId,
  tabNameForDateISO,
} from "@/lib/lesson-plan";

type AutoFillStatus =
  | { state: "idle" }
  | { state: "loading"; dateISO: string; standards: string[] }
  | {
      state: "done";
      dateISO: string;
      standards: string[];
      updatedCount: number;
      skipReason?: PbdFillSkipReason;
    }
  | { state: "error"; message: string; serviceAccountEmail?: string };

interface FillJob {
  code: string;
  sheetUrl: string;
}

/** Always-mounted watcher: when every pupil in the current class is marked for
 *  a day this week that has a learning standard in the lesson plan, fills that
 *  day's Band into the class PBD Google Sheet — same write as "Fill today's
 *  Band", without requiring a Resources-tab click. BI vs PJ is chosen from
 *  each lesson block's subject. */
export function PbdAutoFill() {
  const {
    hydrated,
    cloudReconciled,
    currentClassId,
    currentClassName,
    pupils,
    attendance,
    lessonPlan,
    classes,
    classAliases,
    pbdSheetUrl,
    pbdPjSheetUrl,
  } = useTracker();
  const { user } = useAuth();

  const [status, setStatus] = useState<AutoFillStatus>({ state: "idle" });
  // Per class+date fingerprint of the last auto-fill we ran (or seeded on
  // load). Lets us re-fire when present/absent changes after a full mark, and
  // skip the already-complete days that were sitting there at page load.
  const lastByDayRef = useRef<Map<string, string>>(new Map());
  const seededRef = useRef(false);
  const seededForClassRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || !cloudReconciled) return;
    if (seededForClassRef.current !== currentClassId) {
      seededForClassRef.current = currentClassId;
      seededRef.current = false;
      lastByDayRef.current = new Map();
    }

    const sheetUrlFor = (subject: "BI" | "PJ") =>
      subject === "PJ" ? pbdPjSheetUrl : pbdSheetUrl;

    const dayKeys = Object.keys(attendance);
    const snapshots: {
      dayKey: string;
      dateISO: string;
      fingerprint: string;
      jobs: FillJob[];
    }[] = [];

    for (const dateISO of dayKeys) {
      const tab = tabNameForDateISO(dateISO);
      if (!tab) continue;
      // Only this week's lesson-plan tabs — past weeks aren't on the live sheet.
      if (currentWeekDateForTab(tab) !== dateISO) continue;

      const day = attendance[dateISO] ?? {};
      if (pupils.length === 0) continue;
      const allMarked = pupils.every((p) => day[p.id] != null);
      if (!allMarked) {
        lastByDayRef.current.delete(`${currentClassId}|${dateISO}`);
        continue;
      }

      if (!lessonPlan) continue;
      const classBlocks = blocksForTab(lessonPlan, tab).filter(
        (b) => matchClassId(b.classRaw, classes, classAliases) === currentClassId
      );

      const jobsByKey = new Map<string, FillJob>();
      for (const block of classBlocks) {
        const code = extractStandardCode(block.learningStandard);
        if (!code) continue;
        const subject = pbdSubjectForLesson(block.subject);
        const sheetUrl = sheetUrlFor(subject);
        if (!parseSpreadsheetId(sheetUrl)) continue;
        jobsByKey.set(`${subject}|${code}`, { code, sheetUrl });
      }
      const jobs = [...jobsByKey.values()];
      if (jobs.length === 0) continue;

      const presentNames = pupils
        .filter((p) => day[p.id] !== "absent")
        .map((p) => p.name)
        .sort();
      const fingerprint = `${jobs
        .map((j) => `${j.sheetUrl}::${j.code}`)
        .sort()
        .join(",")}:${presentNames.join("|")}`;
      snapshots.push({
        dayKey: `${currentClassId}|${dateISO}`,
        dateISO,
        fingerprint,
        jobs,
      });
    }

    if (!seededRef.current) {
      seededRef.current = true;
      for (const s of snapshots) lastByDayRef.current.set(s.dayKey, s.fingerprint);
      return;
    }

    const pending = snapshots.filter(
      (s) => lastByDayRef.current.get(s.dayKey) !== s.fingerprint
    );
    if (pending.length === 0) return;

    if (!user || !lessonPlan) {
      // Prerequisites missing — don't stamp fingerprints so a later sign-in /
      // URL paste can still trigger.
      return;
    }

    // Debounce: finishing the last few pupils shouldn't fire three sheet writes.
    let cancelled = false;
    const scheduledClassId = currentClassId;
    const scheduledClassName = currentClassName;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      let idToken: string;
      try {
        idToken = await user.getIdToken();
      } catch {
        setStatus({
          state: "error",
          message: "Sign in to auto-fill the PBD sheet.",
        });
        return;
      }

      for (const s of pending) {
        if (cancelled || seededForClassRef.current !== scheduledClassId) return;
        // Already stamped for this fingerprint (e.g. overlapping timer).
        if (lastByDayRef.current.get(s.dayKey) === s.fingerprint) continue;

        const standards = s.jobs.map((j) => j.code);
        setStatus({ state: "loading", dateISO: s.dateISO, standards });
        const day = attendance[s.dateISO] ?? {};
        const presentNames = pupils
          .filter((p) => day[p.id] !== "absent")
          .map((p) => p.name);

        let totalUpdated = 0;
        let columnSkipped = false;
        let failed: { message: string; serviceAccountEmail?: string } | null = null;
        for (const job of s.jobs) {
          if (cancelled || seededForClassRef.current !== scheduledClassId) return;
          const outcome = await fillPbdOneDay(
            idToken,
            job.sheetUrl,
            scheduledClassName,
            job.code,
            s.dateISO,
            presentNames
          );
          if (!outcome.ok) {
            failed = {
              message: outcome.message ?? "PBD auto-fill failed.",
              serviceAccountEmail: outcome.serviceAccountEmail,
            };
            break;
          }
          if (outcome.skipReason === "column-already-filled") {
            columnSkipped = true;
          } else {
            totalUpdated += outcome.updatedCount ?? 0;
          }
        }

        if (failed) {
          setStatus({
            state: "error",
            message: failed.message,
            serviceAccountEmail: failed.serviceAccountEmail,
          });
          // Don't stamp fingerprint — teacher can fix sheet share / retry by
          // tweaking attendance.
          return;
        }

        lastByDayRef.current.set(s.dayKey, s.fingerprint);
        setStatus({
          state: "done",
          dateISO: s.dateISO,
          standards,
          updatedCount: totalUpdated,
          skipReason: columnSkipped && totalUpdated === 0 ? "column-already-filled" : undefined,
        });
      }
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    hydrated,
    cloudReconciled,
    currentClassId,
    currentClassName,
    pupils,
    attendance,
    lessonPlan,
    classes,
    classAliases,
    pbdSheetUrl,
    pbdPjSheetUrl,
    user,
  ]);

  // Auto-dismiss success after a few seconds.
  useEffect(() => {
    if (status.state !== "done") return;
    const id = setTimeout(() => setStatus({ state: "idle" }), 6000);
    return () => clearTimeout(id);
  }, [status]);

  if (status.state === "idle") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 print:hidden"
    >
      <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-card bg-surface p-3 shadow-float">
        {status.state === "loading" && (
          <>
            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-brand-500" />
            <p className="text-sm text-paper-600">
              Filling PBD sheet for {status.dateISO}
              {status.standards.length > 0
                ? ` (${status.standards.join(", ")})`
                : ""}
              …
            </p>
          </>
        )}
        {status.state === "done" && (
          <>
            <CheckCircle2
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                status.skipReason === "column-already-filled" ? "text-paper-400" : "text-success"
              }`}
            />
            <p className="flex-1 text-sm text-paper-600">
              {status.skipReason === "column-already-filled"
                ? `PBD column already filled for ${status.dateISO}${
                    status.standards.length > 0
                      ? ` (${status.standards.join(", ")})`
                      : ""
                  } — skipped.`
                : `PBD sheet updated for ${status.dateISO}${
                    status.standards.length > 0
                      ? ` — ${status.standards.join(", ")}`
                      : ""
                  }${status.updatedCount > 0 ? ` (${status.updatedCount} cells).` : "."}`}
            </p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setStatus({ state: "idle" })}
              className="rounded-md p-1 text-paper-400 outline-none hover:bg-paper-100 hover:text-paper-700 focus-visible:shadow-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
        {status.state === "error" && (
          <>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <div className="flex-1 space-y-1 text-sm text-danger">
              <p>{status.message}</p>
              {status.serviceAccountEmail && (
                <p className="text-2xs text-danger/80">
                  Share the sheet with{" "}
                  <span className="font-mono font-semibold">
                    {status.serviceAccountEmail}
                  </span>{" "}
                  as Editor.
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setStatus({ state: "idle" })}
              className="rounded-md p-1 text-paper-400 outline-none hover:bg-paper-100 hover:text-paper-700 focus-visible:shadow-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
