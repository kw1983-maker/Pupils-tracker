"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CloudDownload,
  FileUp,
  Layers,
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
import { BoardMarksDock } from "@/components/ui/BoardMarksDock";
import { WritingAssistantPanel } from "@/components/ui/WritingAssistantPanel";
import { BookPickerModal } from "@/components/ui/BookPickerModal";
import { DriveLinkModal } from "@/components/ui/DriveLinkModal";
import { OverlayWindow } from "@/components/ui/OverlayWindow";
import { ReadAloudBox } from "@/components/ui/ReadAloudBox";
import {
  useBoardDocument,
  getPdfPageText,
  renderPdfPageToImage,
} from "@/lib/useBoardDocument";
import { useReadAloud } from "@/lib/useReadAloud";
import { auth } from "@/lib/firebase";
import { useTracker, todayISO } from "@/lib/store";
import { formatDMY } from "@/lib/format";

type BoardType = "Spelling" | "Dictation";

export interface TeachRequest {
  url: string;
  name: string;
  // "bundled" (default) opens a local /books PDF via openUrl; "link" opens a
  // Google Drive / Slides / YouTube link via openDriveLink.
  source?: "bundled" | "link";
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
  const { nextSpelling, setNextSpelling, clearNextSpelling } = useTracker();

  // Teacher-set values — reset to defaults each session (not persisted).
  const [type, setType] = useState<BoardType>("Spelling");
  const [num, setNum] = useState("1");
  // Next sitting form (persisted per class via the store).
  const [nextDate, setNextDate] = useState(todayISO());
  const [nextType, setNextType] = useState<BoardType>("Spelling");
  const [nextNum, setNextNum] = useState("");

  // Prefill the form from the saved sitting when the class (or saved value) changes.
  useEffect(() => {
    if (nextSpelling) {
      setNextDate(nextSpelling.date);
      setNextType(nextSpelling.type);
      setNextNum(nextSpelling.number);
    } else {
      setNextDate(todayISO());
      setNextType("Spelling");
      setNextNum("");
    }
  }, [nextSpelling]);

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

  // Pan state — lets the teacher drag to reveal off-center content when zoomed in.
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState(false);
  const panGrabRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

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
    zoom,
    zoomIn,
    zoomOut,
    error,
    loading,
    loadingMessage,
    overlay,
    overlayPage,
    overlayPages,
    openFile,
    openOverlay,
    openUrl,
    openDriveLink,
    close,
    closeAudio,
    closeOverlay,
    overlayNext,
    overlayPrev,
    next,
    prev,
    goToPage,
    dismissError,
  } = useBoardDocument();
  // Read-aloud (text-to-speech) of the open PDF's current page. Destructured so
  // the stable callbacks can sit in effect dependency arrays.
  const {
    status: ttsStatus,
    supported: ttsSupported,
    speak: ttsSpeak,
    pause: ttsPause,
    resume: ttsResume,
    stop: ttsStop,
  } = useReadAloud();
  const [readMsg, setReadMsg] = useState<string | null>(null);
  // True while a scanned page is being OCR'd before it can be read.
  const [ocrBusy, setOcrBusy] = useState(false);

  // Reset pan when doc/page changes or zoom returns to 1.
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
    setIsPanMode(false);
  }, [doc?.id, page]);

  // Stop narration when the page/document changes or the board is hidden.
  useEffect(() => {
    ttsStop();
    setReadMsg(null);
  }, [doc?.id, page, ttsStop]);
  useEffect(() => {
    if (!active) ttsStop();
  }, [active, ttsStop]);

  const readCurrentPage = async () => {
    if (!doc || doc.kind !== "pdf" || ocrBusy) return;
    setReadMsg(null);
    try {
      // Fast path: a real text layer (typed PDFs).
      const text = await getPdfPageText(doc.pdf, page);
      if (text) {
        ttsSpeak(text);
        return;
      }
      // Scanned/image page (e.g. textbook scans) — OCR it with Gemini, then read.
      setOcrBusy(true);
      setReadMsg("Reading the page…");
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setReadMsg("Please sign in again to read this page aloud.");
        return;
      }
      const image = await renderPdfPageToImage(doc.pdf, page);
      const res = await fetch("/api/page-ocr", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ image }),
      });
      if (!res.ok) {
        setReadMsg("Couldn't read this page — please try again.");
        return;
      }
      const data = (await res.json()) as { text?: string };
      const ocrText = (data.text ?? "").trim();
      if (!ocrText) {
        setReadMsg("Couldn't find any words to read on this page.");
        return;
      }
      setReadMsg(null);
      ttsSpeak(ocrText);
    } catch {
      setReadMsg("Couldn't read this page.");
    } finally {
      setOcrBusy(false);
    }
  };

  useEffect(() => {
    if (zoom === 1) {
      setPanOffset({ x: 0, y: 0 });
      setIsPanMode(false);
    }
  }, [zoom]);

  const onPanPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    panGrabRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: panOffset.x,
      originY: panOffset.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPanPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = panGrabRef.current;
    if (!g) return;
    setPanOffset({ x: g.originX + e.clientX - g.startX, y: g.originY + e.clientY - g.startY });
  };
  const onPanPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    panGrabRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const overlayInputRef = useRef<HTMLInputElement | null>(null);
  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const [driveOpen, setDriveOpen] = useState(false);

  // A book queued from the Resources tab ("Teach on board") — open it once
  // the board mounts, then clear the request.
  useEffect(() => {
    if (!teachRequest) return;
    if (teachRequest.source === "link") {
      void openDriveLink(teachRequest.url);
    } else {
      void openUrl(teachRequest.url, teachRequest.name);
    }
    onTeachHandled?.();
  }, [teachRequest, openUrl, openDriveLink, onTeachHandled]);
  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void openFile(file);
    e.target.value = ""; // allow re-picking the same file
  };
  const onPickOverlay = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void openOverlay(file);
    e.target.value = "";
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

  // Weekday + date always show; the Type/Number label only makes sense
  // alongside its (visible) fields, i.e. outside Blank canvas mode.
  const dayDateItems = [weekday, date];
  // Two stacked lines so the round face stays readable from the front of
  // the room without clipping the top of the glyphs in Present mode.
  const headerLines = blank ? [weekday, date] : [`${weekday} ${label}`, date];

  return (
    <div className="space-y-4">
      <SectionCard title="Next spelling / dictation">
        <p className="mb-3 text-sm text-paper-600">
          Set the next sitting date and number — it shows on the Dashboard for
          this class.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Date" htmlFor="sb-next-date">
            <input
              id="sb-next-date"
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              className={`${fieldClassName} w-auto`}
            />
          </Field>
          <Field label="Type" htmlFor="sb-next-type">
            <select
              id="sb-next-type"
              value={nextType}
              onChange={(e) => setNextType(e.target.value as BoardType)}
              className={`${fieldClassName} w-auto`}
            >
              <option value="Spelling">Spelling</option>
              <option value="Dictation">Dictation</option>
            </select>
          </Field>
          <Field label="Number" htmlFor="sb-next-num">
            <input
              id="sb-next-num"
              type="number"
              min={1}
              value={nextNum}
              onChange={(e) => setNextNum(e.target.value)}
              placeholder="e.g. 3"
              className={`${fieldClassName} w-28`}
            />
          </Field>
          <Button
            onClick={() => setNextSpelling(nextDate, nextType, nextNum)}
            disabled={!nextDate || !nextNum.trim()}
          >
            Save
          </Button>
          {nextSpelling && (
            <Button variant="secondary" onClick={clearNextSpelling}>
              Clear
            </Button>
          )}
        </div>
        {nextSpelling && (
          <p className="mt-3 text-sm text-paper-700">
            Saved:{" "}
            <span className="font-semibold text-paper-900">
              {nextSpelling.type} ({nextSpelling.number})
            </span>{" "}
            on {formatDMY(nextSpelling.date)}
          </p>
        )}
      </SectionCard>

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
                // stop the audio, drop any pinned overlay and wipe the ink.
                close();
                closeAudio();
                closeOverlay();
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
          <Button
            variant="secondary"
            onClick={() => overlayInputRef.current?.click()}
            title="Open an image, PDF or video on top of the board — the textbook stays underneath"
          >
            <Layers className="h-4 w-4" /> On top
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
            accept="application/pdf,image/*,audio/*,video/*,.pdf,.ppt,.pptx,.mp3,.wav,.m4a,.ogg,.wma,.mp4,.webm"
            className="hidden"
            onChange={onPickFile}
          />
          <input
            ref={overlayInputRef}
            type="file"
            accept="application/pdf,image/*,video/*,.pdf,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm"
            className="hidden"
            onChange={onPickOverlay}
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
            {loadingMessage ??
              "Opening… large books can take a moment on slow connections."}
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

      {/* Type/paste any text and have it read aloud (independent of the board). */}
      <ReadAloudBox active={active} />

      {/* The board — a clean white canvas the pupils read & the teacher writes on. */}
      <div
        ref={boardRef}
        className="card relative min-h-[60vh] overflow-hidden [&:fullscreen]:min-h-screen [&:fullscreen]:rounded-none"
      >
        {readMsg && (
          <div className="absolute left-1/2 top-4 z-20 flex max-w-sm -translate-x-1/2 items-start gap-2 rounded-lg bg-warning-bg px-3 py-2 text-sm text-paper-700 shadow-float">
            <span className="flex-1">{readMsg}</span>
            <button
              type="button"
              onClick={() => setReadMsg(null)}
              aria-label="Dismiss"
              className="rounded p-0.5 text-paper-500 outline-none transition-colors hover:text-paper-700 focus-visible:shadow-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {/* Header pinned to the top; pointer-events-none so strokes reach the
            canvas beneath, z-10 so the printed header stays crisp over the ink.
            Stacked title + date (not a wrapping 8xl row) so Present mode on a
            classroom display doesn't clip the round face. While a file is open
            it shrinks to a compact top-center badge instead — centered (not a
            corner) so it clears the Exit button in Present/fullscreen mode
            (top-right, see below) as well as any doc/toolbar controls. */}
        {!doc && (
          <div className="pointer-events-none relative z-10 flex flex-col items-center gap-y-3 px-8 pt-10 text-center">
            {headerLines.map((text, i) => (
              <span
                key={i}
                className="inline-block max-w-[92%] border-b-4 border-mark-blue-ink/50 pb-1.5 font-round text-4xl font-normal leading-tight text-mark-blue-ink sm:text-5xl lg:text-6xl"
              >
                {text}
              </span>
            ))}
          </div>
        )}
        {doc && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-end gap-x-4 text-center">
            {dayDateItems.map((text, i) => (
              <span
                key={i}
                className="inline-block border-b-2 border-mark-blue-ink/50 pb-1 font-round text-2xl font-normal leading-tight text-mark-blue-ink sm:text-3xl"
              >
                {text}
              </span>
            ))}
          </div>
        )}

        {/* Teaching file rendered beneath the ink (earlier in DOM order, and
            pointer-events-none) so the pen annotates on top of the page. */}
        {doc && (
          <DocumentLayer doc={doc} page={page} zoom={zoom} panOffset={panOffset} videoRef={videoRef} active={active} />
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

        {/* Transparent pan overlay — sits above the ink canvas when pan mode is
            active so pointer drags scroll the zoomed PDF instead of drawing. */}
        {isPanMode && doc?.kind === "pdf" && (
          <div
            className="absolute inset-0 z-[11] touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={onPanPointerDown}
            onPointerMove={onPanPointerMove}
            onPointerUp={onPanPointerUp}
            onPointerCancel={onPanPointerUp}
          />
        )}

        {/* Second file pinned on top of the PDF (or blank board). Drag, resize
            or fade it; closing it leaves the textbook underneath. */}
        {overlay && (
          <OverlayWindow
            doc={overlay}
            page={overlayPage}
            pages={overlayPages}
            onPrev={overlayPrev}
            onNext={overlayNext}
            onClose={closeOverlay}
            active={active}
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
            zoom={doc.kind === "pdf" ? zoom : undefined}
            isPanMode={isPanMode}
            onPrev={prev}
            onNext={next}
            onGoToPage={goToPage}
            onClose={close}
            onZoomIn={doc.kind === "pdf" ? zoomIn : undefined}
            onZoomOut={doc.kind === "pdf" ? zoomOut : undefined}
            onTogglePan={doc.kind === "pdf" ? () => setIsPanMode((m) => !m) : undefined}
            mediaRef={doc.kind === "video" ? videoRef : undefined}
            ttsStatus={ttsStatus}
            ttsBusy={ocrBusy}
            onReadAloud={
              doc.kind === "pdf" && ttsSupported ? readCurrentPage : undefined
            }
            onReadPause={ttsPause}
            onReadResume={ttsResume}
            onReadStop={ttsStop}
          />
        )}

        {/* Mark pupils without leaving the board */}
        <BoardMarksDock />

        {/* AI word helper — collapsible panel on the right edge */}
        <WritingAssistantPanel active={active} />

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
            <Minimize className="h-4 w-4" /> Exit
          </button>
        )}

        {/* In Present (fullscreen) mode the global floating tools are outside
            this subtree and hidden, so render the full cluster here — timer,
            spinning wheel, monitors and class-control sounds stay usable. */}
        <button
          type="button"
          onClick={togglePresent}
          className="absolute bottom-32 left-4 z-40 flex items-center gap-2 rounded-card border border-paper-100 bg-surface/95 px-3 py-2 text-sm font-semibold text-paper-600 shadow-float outline-none backdrop-blur transition-colors hover:text-paper-900 focus-visible:shadow-ring"
        >
          {isFull ? (
            <><Minimize className="h-4 w-4" /> Exit</>
          ) : (
            <><Maximize className="h-4 w-4" /> Present</>
          )}
        </button>

        {isFull && (
          <div className="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-2">
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
        loadingMessage={loadingMessage}
        error={error}
      />
    </div>
  );
}
