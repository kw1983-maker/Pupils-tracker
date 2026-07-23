"use client";

import { useState } from "react";
import { Presentation, Trash2, Plus, ExternalLink } from "lucide-react";
import { useTracker } from "@/lib/store";
import { parseDriveLink, parseYouTubeLink } from "@/lib/useBoardDocument";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";
import { Field, fieldClassName } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";

/** Does this link look like something the board can open (Drive / Slides / YouTube)? */
function linkLooksOpenable(url: string): boolean {
  if (!url.trim()) return false;
  if (parseYouTubeLink(url)) return true;
  const parsed = parseDriveLink(url);
  return !!parsed && !("error" in parsed);
}

/**
 * Resources tab: the teacher's own saved Google Drive / Slides / YouTube
 * lesson materials. Each opens with one tap straight on the Spelling/Dictation
 * board (via `onTeach`) — no download, no new browser tab. The list is saved to
 * the teacher's account and synced across devices (see store `lessonMaterials`).
 */
export function LessonMaterialsCard({
  onTeach,
}: {
  /** Open a saved link on the board (switches to the Spelling tab). */
  onTeach?: (url: string, name: string) => void;
} = {}) {
  const { lessonMaterials, addLessonMaterial, removeLessonMaterial } =
    useTracker();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  const trimmedTitle = title.trim();
  const trimmedUrl = url.trim();
  const canSave = trimmedTitle.length > 0 && trimmedUrl.length > 0;
  const urlWarn = trimmedUrl.length > 0 && !linkLooksOpenable(trimmedUrl);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    addLessonMaterial(trimmedTitle, trimmedUrl);
    setTitle("");
    setUrl("");
  };

  return (
    <SectionCard title="My Lesson Materials">
      <div className="space-y-5">
        {lessonMaterials.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {lessonMaterials.map((m) => (
              <li
                key={m.id}
                className="flex items-stretch gap-1 rounded-md border border-paper-100 transition hover:border-brand-300 hover:bg-brand-50"
              >
                {onTeach ? (
                  <button
                    type="button"
                    onClick={() => onTeach(m.url, m.title)}
                    title="Teach on board"
                    aria-label={`Teach ${m.title} on the board`}
                    className="group flex min-w-0 flex-1 items-center gap-3 rounded-md p-3 text-left outline-none focus-visible:shadow-ring"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mark-blue text-mark-blue-ink">
                      <Presentation className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-semibold text-paper-800">
                      {m.title}
                    </span>
                  </button>
                ) : (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-w-0 flex-1 items-center gap-3 rounded-md p-3 outline-none focus-visible:shadow-ring"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mark-blue text-mark-blue-ink">
                      <Presentation className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-semibold text-paper-800">
                      {m.title}
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-paper-300 transition group-hover:text-brand-600" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => removeLessonMaterial(m.id)}
                  title="Remove"
                  aria-label={`Remove ${m.title}`}
                  className="my-2 mr-2 flex w-9 shrink-0 items-center justify-center rounded-md text-paper-400 outline-none transition-colors hover:bg-danger/10 hover:text-danger focus-visible:shadow-ring"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<Presentation className="h-5 w-5" />}
            title="No lesson materials yet"
          >
            Paste a Google Drive, Slides or YouTube link below to open it on the
            board with one tap — no download needed.
          </EmptyState>
        )}

        <form
          onSubmit={submit}
          className="space-y-3 border-t border-paper-100 pt-4"
        >
          <div className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_1fr]">
            <Field label="Name" htmlFor="material-title">
              <input
                id="material-title"
                type="text"
                placeholder="e.g. Unit 3 Slides"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`${fieldClassName} w-full`}
              />
            </Field>
            <Field label="Drive, Slides or YouTube link" htmlFor="material-url">
              <input
                id="material-url"
                type="url"
                inputMode="url"
                placeholder="https://drive.google.com/… or https://youtu.be/…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={`${fieldClassName} w-full`}
              />
            </Field>
          </div>
          {urlWarn && (
            <p className="text-2xs text-paper-400">
              That doesn&apos;t look like a Google Drive, Slides or YouTube link
              — you can still save it, but it may not open on the board.
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <p className="text-2xs text-paper-400">
              Set the file&apos;s Drive sharing to &ldquo;Anyone with the link
              can view&rdquo; so it opens without signing in.
            </p>
            <Button type="submit" disabled={!canSave}>
              <Plus className="h-4 w-4" />
              Add material
            </Button>
          </div>
        </form>
      </div>
    </SectionCard>
  );
}
