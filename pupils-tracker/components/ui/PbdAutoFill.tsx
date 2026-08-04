"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, X } from "lucide-react";
import { useTracker } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { parseSpreadsheetId } from "@/lib/google-sheets-url";
import { fillPbdOneDay } from "@/lib/pbd-client";
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
    }
  | { state: "error"; message: string; serviceAccountEmail?: string };

/** Always-mounted watcher: when every pupil in the current class is marked for
 *  a day this week that has a learning standard in the lesson plan, fills that
 *  day's Band into the class PBD Google Sheet — same write as "Fill today's
 *  Band", without requiring a Resources-tab click. */
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

    const dayKeys = Object.keys(attendance);
    const snapshots: { dayKey: string; dateISO: string; fingerprint: string; codes: string[] }[] =
      [];

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
      const codes = [
        ...new Set(
          classBlocks
            .map((b) => extractStandardCode(b.learningStandard))
            .filter((c): c is string => !!c)
        ),
      ];
      if (codes.length === 0) continue;

      const presentNames = pupils
        .filter((p) => day[p.id] !== "absent")
        .map((p) => p.name)
        .sort();
      const fingerprint = `${codes.slice().sort().join(",")}:${presentNames.join("|")}`;
      snapshots.push({
        dayKey: `${currentClassId}|${dateISO}`,
        dateISO,
        fingerprint,
        codes,
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

    const sheetId = parseSpreadsheetId(pbdSheetUrl);
    if (!sheetId || !user || !lessonPlan) {
      // Prerequisites missing — remember fingerprints so we don't retry-spam,
      // but clear them again if the teacher later pastes a sheet URL / signs in
      // (they'll need to remake attendance or we could leave unset…). Leave
      // unset so a later URL paste still triggers once attendance is complete.
      return;
    }

    // Debounce: finishing the last few pupils shouldn't fire three sheet writes.
    let cancelled = false;
    const scheduledClassId = currentClassId;
    const scheduledUrl = pbdSheetUrl;
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

        setStatus({ state: "loading", dateISO: s.dateISO, standards: s.codes });
        const day = attendance[s.dateISO] ?? {};
        const presentNames = pupils
          .filter((p) => day[p.id] !== "absent")
          .map((p) => p.name);

        let totalUpdated = 0;
        let failed: { message: string; serviceAccountEmail?: string } | null = null;
        for (const code of s.codes) {
          if (cancelled || seededForClassRef.current !== scheduledClassId) return;
          const outcome = await fillPbdOneDay(
            idToken,
            scheduledUrl,
            scheduledClassName,
            code,
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
          totalUpdated += outcome.updatedCount ?? 0;
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
          standards: s.codes,
          updatedCount: totalUpdated,
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
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <p className="flex-1 text-sm text-paper-600">
              PBD sheet updated for {status.dateISO}
              {status.standards.length > 0
                ? ` — ${status.standards.join(", ")}`
                : ""}
              {status.updatedCount > 0 ? ` (${status.updatedCount} cells).` : "."}
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
