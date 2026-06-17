"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CloudDownload,
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
import { AudioPlayerBar } from "@/components/ui/AudioPlayerBar";
import { BookPickerModal } from "@/components/ui/BookPickerModal";
import { DriveLinkModal } from "@/components/ui/DriveLinkModal";
import { useBoardDocument } from "@/lib/useBoardDocument";

type BoardType = "Spelling" | "Dictation";

export interface TeachRequest {
  url: string;
  name: string;
}

export function SpellingBoard({
  active = true,
  teachRequest,
  onTeachHandled,
}: {
  /** False while another tab is shown — the board stays mounted but hidden,
      so its keyboard shortcuts must sleep and playing media must pause. */
  active?: boolean;
  /** A Resources book queued from another tab — opened on mount, then cleared. */
  teachRequest?: TeachRequest | null;
  onTeachHandled?: () => void;
} = {}) {
  // Teacher-set values — reset to defaults each session (not persisted).
  const [type, setType] = useState<BoardType>("Spelling");
  const [num, setNum] = useState("1");
  // Blank canvas: hide the day/type/date header for a clean writing surface.
  const [blank, setBlank] = useState(false);
  // Bumped by "Blank canvas" to wipe every page's ink in the InkCanvas.
  const [resetToken, setResetToken] = useState(0);

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

  // Teaching file (PDF/image/video) and background audio — session-only.
  const {
    doc,
    audio,
    page,
    pages,
    error,
    loading,
    openFile,
    openUrl,
    openDriveLink,
    close,
    closeAudio,
    next,
    prev,
    dismissError,
  } = useBoardDocument();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const [driveOpen, setDriveOpen] = useState(false);

  // A book queued from the Resources tab ("Teach on board") — open it once
  // the board mounts, then clear the request.
  useEffect(() => {
    if (!teachRequest) return;
    void openUrl(teachRequest.url, teachRequest.name);
    onTeachHandled?.();
  }, [teachRequest, openUrl, onTeachHandled]);
  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void openFile(file);
    e.target.value = ""; // allow re-picking the same file
  };

  // Leaving the tab pauses any playing video (the audio bar and the YouTube
  // iframe handle their own pause via `active`). Position is kept, so the
  // teacher resumes from where they left off.
  useEffect(() => {
    if (!active) videoRef.current?.pause();
  }, [active]);

  // Page flips from the keyboard / presenter clickers (arrows + PageUp/Down),
  // ignored while typing in a form control or while the board is hidden.
  const multiPage = doc?.kind === "pdf" && pages > 1;
  useEffect(() => {
    if (!multiPage || !active) return;
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
  }, [multiPage, active, next, prev]);

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
            onClick={() => {
              if (!blank) {
                // "Blank canvas" is the board's reset: close the open file,
                // stop the audio and wipe the ink for a truly fresh surface.
                close();
                closeAudio();
                setResetToken((t) => t + 1);
              }
              setBlank((b) => !b);
            }}
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
          <Button variant="secondary" onClick={() => setBookPickerOpen(true)}>
            <BookOpen className="h-4 w-4" /> Books
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              dismissError();
              setDriveOpen(true);
            }}
          >
            <CloudDownload className="h-4 w-4" /> Drive / YouTube
          </Button>
          {/* .ppt/.pptx are accepted on purpose: picking one shows the
              friendly "export as PDF" hint instead of greying files out. */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*,audio/*,video/*,.pdf,.ppt,.pptx,.mp3,.wav,.m4a,.ogg,.mp4,.webm"
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
        {loading && !driveOpen && (
          <div className="mt-3 rounded-lg bg-paper-100 px-3 py-2 text-sm text-paper-600 motion-reduce:animate-none animate-pulse">
            Opening… large books can take a moment on slow connections.
          </div>
        )}
        {error && !driveOpen && (
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
                className="inline-block border-b-4 border-mark-blue-ink/50 pb-1.5 font-sans text-4xl font-bold leading-none text-mark-blue-ink sm:text-5xl lg:text-6xl"
              >
                {text}
              </span>
            ))}
          </div>
        )}

        {/* Teaching file rendered beneath the ink (earlier in DOM order, and
            pointer-events-none) so the pen annotates on top of the page. */}
        {doc && (
          <DocumentLayer doc={doc} page={page} videoRef={videoRef} active={active} />
        )}

        {/* Freehand writing surface (stylus/touch/mouse) + its toolbar.
            Each document page keeps its own ink via pageKey. Hidden for
            YouTube: the iframe needs the pointer events for its own controls,
            so no ink is possible there. */}
        {doc?.kind !== "youtube" && (
          <InkCanvas
            active={active}
            resetToken={resetToken}
            pageKey={
              doc
                ? doc.kind === "pdf"
                  ? `pdf:${doc.id}:${page}`
                  : doc.kind === "video"
                    ? `video:${doc.id}`
                    : `img:${doc.id}`
                : undefined
            }
          />
        )}

        {/* Page navigation / close controls for the open file — inside the
            board so they stay usable in Present mode. Video docs swap the
            pager for playback controls. */}
        {doc && (
          <DocumentToolbar
            name={doc.name}
            page={page}
            pages={pages}
            onPrev={prev}
            onNext={next}
            onClose={close}
            mediaRef={doc.kind === "video" ? videoRef : undefined}
          />
        )}

        {/* Dictation/listening track — independent of the document so it
            keeps playing while pages are flipped or the file is swapped. */}
        {audio && (
          <AudioPlayerBar
            key={audio.id}
            name={audio.name}
            url={audio.url}
            active={active}
            onClose={closeAudio}
          />
        )}

        {/* The toolbar card (with its Exit button) lives outside this
            fullscreened subtree, so Present mode needs its own way out. */}
        {isFull && (
          <button
            type="button"
            onClick={togglePresent}
            className="absolute right-6 top-6 z-20 flex items-center gap-2 rounded-card border border-paper-100 bg-surface/95 px-3 py-2 text-sm font-semibold text-paper-600 shadow-float outline-none backdrop-blur transition-colors hover:text-paper-900 focus-visible:shadow-ring"
          >
            <Minimize className="h-4 w-4" /> Exit full screen
          </button>
        )}

        {/* In Present (fullscreen) mode the global floating tools are outside
            this subtree and hidden, so render the full cluster here — timer,
            spinning wheel, monitors and class-control sounds stay usable. */}
        {!isFull && (
          <button
            type="button"
            onClick={togglePresent}
            className="absolute bottom-6 left-6 z-20 flex items-center gap-2 rounded-card border border-paper-100 bg-surface/95 px-3 py-2 text-sm font-semibold text-paper-600 shadow-float outline-none backdrop-blur transition-colors hover:text-paper-900 focus-visible:shadow-ring"
          >
            <Maximize className="h-4 w-4" /> Present
          </button>
        )}

        {isFull && (
          <div className="absolute bottom-6 right-6 z-20 flex items-end gap-3">
            <PupilPicker />
            <MonitorControl />
            <ClassControl />
            <ClassTimer />
          </div>
        )}
      </div>

      <BookPickerModal
        isOpen={bookPickerOpen}
        onClose={() => setBookPickerOpen(false)}
        onPick={(url, name) => void openUrl(url, name)}
      />

      <DriveLinkModal
        isOpen={driveOpen}
        onClose={() => {
          setDriveOpen(false);
          dismissError();
        }}
        onOpenLink={openDriveLink}
        loading={loading}
        error={error}
      />
    </div>
  );
}
