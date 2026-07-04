"use client";

import {
  FileText,
  ExternalLink,
  PlayCircle,
  FolderOpen,
  Presentation,
} from "lucide-react";
import { RESOURCES, RESOURCE_GROUPS } from "@/lib/resources";
import { SectionCard } from "@/components/ui/SectionCard";
import { LessonPlanCard } from "@/components/ui/LessonPlanCard";

export function Resources({
  onTeach,
}: {
  /** Open a bundled PDF on the Spelling/Dictation board (switches tab). */
  onTeach?: (url: string, name: string) => void;
} = {}) {
  return (
    <div className="space-y-4">
      <LessonPlanCard />
      {RESOURCE_GROUPS.map((group) => {
        const items = RESOURCES.filter((r) => r.group === group);
        const pdfs = items.filter((r) => r.kind === "pdf");
        const videos = items.filter((r) => r.kind === "video");
        const links = items.filter((r) => r.kind === "link");
        if (items.length === 0) return null;
        return (
          <SectionCard key={group} title={group}>
            <div className="space-y-5">
              {links.length > 0 && (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {links.map((r) => (
                    <li key={r.url}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 rounded-md border border-paper-100 p-3 outline-none transition hover:border-brand-300 hover:bg-brand-50 focus-visible:shadow-ring"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mark-blue text-mark-blue-ink">
                          <FolderOpen className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 font-display text-sm font-semibold text-paper-800">
                          {r.title}
                        </span>
                        <ExternalLink className="h-4 w-4 shrink-0 text-paper-300 transition group-hover:text-brand-600" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              {pdfs.length > 0 && (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {pdfs.map((r) => (
                    <li
                      key={r.file}
                      className="flex items-stretch gap-1 rounded-md border border-paper-100 transition hover:border-brand-300 hover:bg-brand-50"
                    >
                      <a
                        href={`/books/${r.file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex min-w-0 flex-1 items-center gap-3 rounded-md p-3 outline-none focus-visible:shadow-ring"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mark-pink text-mark-pink-ink">
                          <FileText className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 font-display text-sm font-semibold text-paper-800">
                          {r.title}
                        </span>
                        <ExternalLink className="h-4 w-4 shrink-0 text-paper-300 transition group-hover:text-brand-600" />
                      </a>
                      {onTeach && (
                        <button
                          type="button"
                          onClick={() => onTeach(`/books/${r.file}`, r.title)}
                          title="Teach on board"
                          aria-label={`Teach ${r.title} on the board`}
                          className="my-2 mr-2 flex w-9 shrink-0 items-center justify-center rounded-md text-paper-400 outline-none transition-colors hover:bg-brand-100 hover:text-brand-700 focus-visible:shadow-ring"
                        >
                          <Presentation className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {videos.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {videos.map((v) => (
                    <div key={v.youtubeId}>
                      <p className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-paper-800">
                        <PlayCircle className="h-4 w-4 shrink-0 text-danger" />
                        {v.title}
                      </p>
                      <div className="relative aspect-video w-full overflow-hidden rounded-md border border-paper-100">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${v.youtubeId}`}
                          title={v.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="absolute inset-0 h-full w-full"
                        />
                      </div>
                      <a
                        href={`https://www.youtube.com/watch?v=${v.youtubeId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-2xs font-semibold text-paper-400 outline-none hover:text-brand-600 hover:underline focus-visible:shadow-ring"
                      >
                        Watch on YouTube
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        );
      })}
    </div>
  );
}
