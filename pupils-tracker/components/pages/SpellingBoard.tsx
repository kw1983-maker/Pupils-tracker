"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileUp,
  Maximize,
  Minimize,
  Square,
  Type as TypeIcon,
  X,
} from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";
import { Field, fieldClassName } from "@/components/ui/Field";
import { ClassTimer } from "@/components/ui/ClassTimer";
import { ClassControl } from "@/components/ui/ClassControl";
import { MonitorControl } from "@/components/ui/MonitorControl";
import { PupilPicker } from "@/components/ui/PupilPicker";
import { InkCanvas } from "@/components/ui/InkCanvas";
import { DocumentLayer } from "@/components/ui/DocumentLayer";
import { DocumentToolbar } from "@/components/ui/DocumentToolbar";
import { useBoardDocument } from "@/lib/useBoardDocument";

type BoardType = "Spelling" | "Dictation";

export function SpellingBoard() {
  // Teacher-set values — reset to defaults each session (not persisted).
  const [type, setType] = useState<BoardType>("Spelling");
  const [num, setNum] = useState("1");
  // Blank canvas: hide the day/type/date header for a clean writing surface.
  const [blank, setBlank] = useState(false);

  // Mount-gated date so SSR and client match; refresh each minute so the day
  // and date roll over at midnight if the board is left open.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Fullscreen ("Present") support for clean projection.
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [isFull, setIsFull] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFull(document.fullscreenElement === boardRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const togglePresent = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void boardRef.current?.requestFullscreen?.();
    }
  };

  // Teaching file (PDF/image) shown on the board — session-only.
  const { doc, page, pages, error, openFile, close, next, prev, dismissError } =
    useBoardDocument();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void openFile(file);
    e.target.value = ""; // allow re-picking the same file
  };

  // Page flips from the keyboard / presenter clickers (arrows + PageUp/Down),
  // ignored while typing in a form control.
  const multiPage = doc?.kind === "pdf" && pages > 1;
  useEffect(() => {
    if (!multiPage) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, select, textarea, [contenteditable=true]"))
        return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [multiPage, next, prev]);

  if (!now) return null;

  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const date = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const label = num.trim() ? `${type} (${num.trim()})` : type;

  const items = [weekday, label, date];

  return (
    <div className="space-y-4">
      <SectionCard title="Spelling / Dictation board">
        <div className="flex flex-wrap items-end gap-3">
          {!blank && (
            <>
              <Field label="Type" htmlFor="sb-type">
                <select
                  id="sb-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as BoardType)}
                  className={`${fieldClassName} w-auto`}
                >
                  <option value="Spelling">Spelling</option>
                  <option value="Dictation">Dictation</option>
                </select>
              </Field>
              <Field label="Number" htmlFor="sb-num">
                <input
                  id="sb-num"
                  type="number"
                  min={1}
                  value={num}
                  onChange={(e) => setNum(e.target.value)}
                  className={`${fieldClassName} w-28`}
                />
              </Field>
            </>
          )}
          <Button
            variant={blank ? undefined : "secondary"}
            onClick={() => setBlank((b) => !b)}
          >
            {blank ? (
              <>
                <TypeIcon className="h-4 w-4" /> Show header
              </>
            ) : (
              <>
                <Square className="h-4 w-4" /> Blank canvas
              </>
            )}
          </Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <FileUp className="h-4 w-4" /> Open file
          </Button>
          {/* .ppt/.pptx are accepted on purpose: picking one shows the
              friendly "export as PDF" hint instead of greying files out. */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*,.pdf,.ppt,.pptx"
            className="hidden"
            onChange={onPickFile}
          />
          <Button variant="secondary" onClick={togglePresent} className="ml-auto">
            {isFull ? (
              <>
                <Minimize className="h-4 w-4" /> Exit
              </>
            ) : (
              <>
                <Maximize className="h-4 w-4" /> Present
              </>
            )}
          </Button>
        </div>
        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-warning-bg px-3 py-2 text-sm text-paper-700">
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={dismissError}
              aria-label="Dismiss"
              className="rounded p-0.5 text-paper-500 outline-none transition-colors hover:text-paper-700 focus-visible:shadow-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </SectionCard>

      {/* The board — a clean white canvas the pupils read & the teacher writes on. */}
      <div
        ref={boardRef}
        className="card relative min-h-[60vh] overflow-hidden [&:fullscreen]:min-h-screen [&:fullscreen]:rounded-none"
      >
        {/* Header pinned to the top; pointer-events-none so strokes reach the
            canvas beneath, z-10 so the printed header stays crisp over the ink.
            Hidden in "Blank canvas" mode, and auto-hidden while a file is
            open so it doesn't sit on top of the document. */}
        {!blank && !doc && (
          <div className="pointer-events-none relative z-10 flex flex-wrap items-end justify-center gap-x-10 gap-y-2 px-6 pt-6 text-center">
            {items.map((text, i) => (
              <span
                key={i}
                className="inline-block border-b-4 border-mark-blue-ink/50 pb-1.5 font-hand text-4xl font-bold leading-none text-mark-blue-ink sm:text-5xl lg:text-6xl"
              >
                {text}
              </span>
            ))}
          </div>
        )}

        {/* Teaching file rendered beneath the ink (earlier in DOM order, and
            pointer-events-none) so the pen annotates on top of the page. */}
        {doc && <DocumentLayer doc={doc} page={page} />}

        {/* Freehand writing surface (stylus/touch/mouse) + its toolbar.
            Each document page keeps its own ink via pageKey. */}
        <InkCanvas
          pageKey={
            doc
              ? doc.kind === "pdf"
                ? `pdf:${doc.id}:${page}`
                : `img:${doc.id}`
              : undefined
          }
        />

        {/* Page navigation / close controls for the open file — inside the
            board so they stay usable in Present mode. */}
        {doc && (
          <DocumentToolbar
            name={doc.name}
            page={page}
            pages={pages}
            onPrev={prev}
            onNext={next}
            onClose={close}
          />
        )}

        {/* In Present (fullscreen) mode the global floating tools are outside
            this subtree and hidden, so render the full cluster here — timer,
            spinning wheel, monitors and class-control sounds stay usable. */}
        {isFull && (
          <div className="absolute bottom-6 right-6 z-20 flex items-end gap-3">
            <PupilPicker />
            <MonitorControl />
            <ClassControl />
            <ClassTimer />
          </div>
        )}
      </div>
    </div>
  );
}
