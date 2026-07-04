"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  CalendarClock,
  ExternalLink,
  Upload,
  RefreshCw,
  Trash2,
  Download,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useTracker } from "@/lib/store";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";
import { Field, fieldClassName } from "@/components/ui/Field";
import {
  parseWorkbook,
  matchClassId,
  normClass,
  todayTabName,
  blocksForTab,
  type PlanBlock,
} from "@/lib/lesson-plan";
import { saveWorkbook, clearWorkbook } from "@/lib/lesson-plan-idb";
import { fillAndDownloadPlan, fillAndStorePlan } from "@/lib/lesson-plan-download";

export function LessonPlanCard() {
  const {
    lessonPlanUrl,
    setLessonPlanUrl,
    lessonPlan,
    setLessonPlan,
    classes,
    classAliases,
    setClassAlias,
    setCurrentClass,
    currentClassId,
    getAbsenteeInfo,
  } = useTracker();

  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "warn"; text: string } | null>(
    null
  );
  const [dragging, setDragging] = useState(false);

  function isXlsx(file: File): boolean {
    return (
      /\.xlsx$/i.test(file.name) ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!isXlsx(file)) {
      setNote({ kind: "warn", text: "Please drop an .xlsx file." });
      return;
    }
    void handleFile(file);
  }

  const todayTab = todayTabName();
  const todayBlocks = lessonPlan && todayTab ? blocksForTab(lessonPlan, todayTab) : [];

  // Distinct plan classes that don't map to an app class (need an alias).
  const unmatched = lessonPlan
    ? [...new Set(lessonPlan.blocks.map((b) => b.classRaw))].filter(
        (raw) => !matchClassId(raw, classes, classAliases)
      )
    : [];

  async function handleFile(file: File) {
    setBusy(true);
    setNote(null);
    try {
      const bytes = await file.arrayBuffer();
      const plan = await parseWorkbook(bytes.slice(0), file.name);
      await saveWorkbook(file.name, bytes);
      setLessonPlan(plan);
      if (plan.blocks.length === 0) {
        setNote({
          kind: "warn",
          text: "Loaded, but no weekday tabs (ISNIN…JUMAAT) with a Class field were found in this file.",
        });
        return;
      }
      // Fill from records now (no download) — the teacher downloads later with
      // "Fill & download now".
      const res = await fillAndStorePlan({
        plan,
        classes,
        aliases: classAliases,
        getAbsenteeInfo,
      });
      setNote({
        kind: "ok",
        text: `Loaded ${plan.tabNames.length} day tab(s), ${plan.blocks.length} lesson(s). Filled ${
          res?.filled ?? 0
        } — press “Fill & download now” to save the file.`,
      });
    } catch (e) {
      setNote({
        kind: "warn",
        text: `Could not read this file: ${(e as Error).message}`,
      });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleFillDownload() {
    if (!lessonPlan) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fillAndDownloadPlan({
        plan: lessonPlan,
        classes,
        aliases: classAliases,
        getAbsenteeInfo,
      });
      if (!res) {
        setNote({ kind: "warn", text: "No uploaded file found — upload the plan first." });
      } else {
        setNote({
          kind: "ok",
          text: `Filled ${res.filled} lesson(s) and downloaded the updated plan.`,
        });
      }
    } catch (e) {
      setNote({ kind: "warn", text: `Fill failed: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    await clearWorkbook();
    setLessonPlan(null);
    setNote(null);
  }

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
        </Field>

        {/* Excel upload — click the button or drag a file onto the zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`rounded-md border-2 border-dashed p-4 transition-colors ${
            dragging ? "border-brand-400 bg-brand-50" : "border-paper-200"
          }`}
        >
          <p className="mb-1 block text-2xs font-bold uppercase tracking-wider text-paper-400">
            Excel file (download the Sheet as .xlsx, then upload)
          </p>
          <p className="mb-2 text-sm text-paper-400">
            Drag &amp; drop your .xlsx here, or
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <Button
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <Upload className="h-4 w-4" />
              {lessonPlan ? "Replace file" : "Upload .xlsx"}
            </Button>
            {lessonPlan && (
              <>
                <Button variant="secondary" onClick={handleFillDownload} disabled={busy}>
                  {busy ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Fill &amp; download now
                </Button>
                <Button variant="ghost" onClick={handleRemove} disabled={busy}>
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              </>
            )}
          </div>
          {lessonPlan && (
            <p className="mt-2 text-2xs text-paper-400">
              Loaded <span className="font-semibold text-paper-600">{lessonPlan.fileName}</span>{" "}
              — {lessonPlan.tabNames.join(", ") || "no weekday tabs"} · {lessonPlan.blocks.length}{" "}
              lesson(s).
            </p>
          )}
        </div>

        {note && (
          <div
            className={`flex items-start gap-2 rounded-md p-3 text-sm ${
              note.kind === "ok"
                ? "bg-success/10 text-success"
                : "bg-warning/10 text-warning"
            }`}
          >
            {note.kind === "ok" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{note.text}</span>
          </div>
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
