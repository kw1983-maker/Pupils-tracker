"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  ExternalLink,
  File,
  FileText,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Music,
  Presentation,
} from "lucide-react";
import { parseDriveLink } from "@/lib/useBoardDocument";
import {
  canTeachOnBoard,
  driveAssetEntries,
  driveItemUrl,
  isLessonPage,
  type DriveFolderItem,
  type DriveFolderListing,
} from "@/lib/drive-folder";
import type { DriveAssetMap } from "@/lib/drive-html";
import { EmptyState } from "@/components/ui/EmptyState";

type Crumb = { id: string; name: string };

/** Subfolders searched for a lesson page's assets (an `images` folder, say). */
const ASSET_SUBFOLDER_LIMIT = 4;

const FOLDER_HINT =
  "Couldn't list that Drive folder. In Drive, set the folder's sharing to \"Anyone with the link can view\", then try again.";

function itemVisual(item: DriveFolderItem): {
  Icon: typeof FolderOpen;
  wrap: string;
} {
  if (item.kind === "folder") {
    return { Icon: FolderOpen, wrap: "bg-mark-blue text-mark-blue-ink" };
  }
  if (item.kind === "slides") {
    return { Icon: Presentation, wrap: "bg-mark-amber text-mark-amber-ink" };
  }
  const mime = item.mimeHint ?? "";
  const name = item.name;
  if (mime.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|wma|asf)$/i.test(name)) {
    return { Icon: Music, wrap: "bg-mark-green text-mark-green-ink" };
  }
  if (mime.startsWith("video/") || /\.(mp4|m4v|webm|mov)$/i.test(name)) {
    return { Icon: Film, wrap: "bg-mark-orange text-mark-orange-ink" };
  }
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(name)) {
    return { Icon: ImageIcon, wrap: "bg-mark-purple text-mark-purple-ink" };
  }
  if (mime.includes("pdf") || /\.pdf$/i.test(name)) {
    return { Icon: FileText, wrap: "bg-mark-pink text-mark-pink-ink" };
  }
  if (/powerpoint|presentation|\.pp[st]x?$/i.test(`${mime} ${name}`)) {
    return { Icon: Presentation, wrap: "bg-mark-amber text-mark-amber-ink" };
  }
  return { Icon: File, wrap: "bg-paper-100 text-paper-600" };
}

/**
 * In-app browser for a public Google Drive folder. Nested folders open here
 * (Drive's own page often shows them but does nothing when they're clicked).
 * Files open on the spelling board via `onTeach`.
 */
export function DriveFolderBrowser({
  url,
  title,
  onTeach,
  onTeachLesson,
}: {
  url: string;
  title: string;
  onTeach?: (url: string, name: string) => void;
  /** Interactive HTML lesson: needs the file id plus its sibling assets. */
  onTeachLesson?: (fileId: string, name: string, assets: DriveAssetMap) => void;
}) {
  const parsed = parseDriveLink(url);
  const rootId =
    parsed && !("error" in parsed) && parsed.kind === "folder" ? parsed.id : null;

  const [open, setOpen] = useState(false);
  const [path, setPath] = useState<Crumb[]>([]);
  const [listing, setListing] = useState<DriveFolderListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, DriveFolderListing>>(new Map());
  // Item id whose sibling assets are being gathered, so the row can say so.
  const [assetsFor, setAssetsFor] = useState<string | null>(null);

  const current = path[path.length - 1];
  const currentId = current?.id;
  const currentName = current?.name;

  /** Listing for one folder, memoised for the life of the card. Returns null
   *  when Drive won't list it; `status` distinguishes not-shared from flaky. */
  const fetchListing = useCallback(
    async (
      folderId: string,
      folderName: string
    ): Promise<{ listing: DriveFolderListing | null; status: number }> => {
      const cached = cacheRef.current.get(folderId);
      if (cached) return { listing: cached, status: 200 };
      const res = await fetch(
        `/api/drive?id=${encodeURIComponent(folderId)}&kind=folder`
      );
      if (!res.ok) return { listing: null, status: res.status };
      const data = (await res.json()) as {
        name?: string;
        items?: DriveFolderItem[];
      };
      const next: DriveFolderListing = {
        name: data.name || folderName,
        items: Array.isArray(data.items) ? data.items : [],
      };
      cacheRef.current.set(folderId, next);
      return { listing: next, status: res.status };
    },
    []
  );

  const load = useCallback(
    async (folderId: string, folderName: string) => {
      if (cacheRef.current.has(folderId)) {
        setListing(cacheRef.current.get(folderId)!);
        setError(null);
        return;
      }
      setListing(null);
      setLoading(true);
      setError(null);
      try {
        const { listing: next, status } = await fetchListing(
          folderId,
          folderName
        );
        if (!next) {
          setError(
            status === 403
              ? FOLDER_HINT
              : "Couldn't list that Drive folder — please try again."
          );
          return;
        }
        setListing(next);
      } catch {
        setListing(null);
        setError("Couldn't list that Drive folder — please try again.");
      } finally {
        setLoading(false);
      }
    },
    [fetchListing]
  );

  useEffect(() => {
    if (!open || !currentId || !currentName) return;
    void load(currentId, currentName);
  }, [open, currentId, currentName, load]);

  /**
   * Every file beside the lesson page, keyed by the path the page would use.
   * Drive serves each file by opaque id with no notion of a directory, so the
   * page's "images/page.png" can only be resolved by name from these listings.
   * One level deep is enough for the lesson layout (an `images` folder next to
   * index.html); generated build folders like __pycache__ are skipped.
   */
  const collectAssets = useCallback(
    async (folder: DriveFolderListing): Promise<DriveAssetMap> => {
      const entries = driveAssetEntries(folder);
      const subfolders = folder.items
        .filter((i) => i.kind === "folder" && !i.name.startsWith("__"))
        .slice(0, ASSET_SUBFOLDER_LIMIT);
      const nested = await Promise.all(
        subfolders.map(async (sub) => {
          try {
            const { listing: subListing } = await fetchListing(sub.id, sub.name);
            return subListing ? driveAssetEntries(subListing, sub.name) : [];
          } catch {
            return [];
          }
        })
      );
      const map: DriveAssetMap = {};
      for (const [path, id] of [...entries, ...nested.flat()]) {
        map[path] = `/api/drive?id=${encodeURIComponent(id)}`;
      }
      return map;
    },
    [fetchListing]
  );

  if (!rootId) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 rounded-md border border-paper-100 p-3 outline-none transition hover:border-brand-300 hover:bg-brand-50 focus-visible:shadow-ring"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mark-blue text-mark-blue-ink">
          <FolderOpen className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold text-paper-800">
          {title}
        </span>
        <ExternalLink className="h-4 w-4 shrink-0 text-paper-300 transition group-hover:text-brand-600" />
      </a>
    );
  }

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setPath([{ id: rootId, name: title }]);
    setOpen(true);
  };

  const enterFolder = (item: DriveFolderItem) => {
    setPath((p) => [...p, { id: item.id, name: item.name }]);
  };

  const goTo = (index: number) => {
    setPath((p) => p.slice(0, index + 1));
  };

  /** Whether tapping this row sends it to the board rather than out to Drive. */
  const goesToBoard = (item: DriveFolderItem) =>
    isLessonPage(item)
      ? Boolean(onTeachLesson)
      : Boolean(onTeach) && canTeachOnBoard(item);

  const openFile = async (item: DriveFolderItem) => {
    const fileUrl = driveItemUrl(item);
    if (onTeachLesson && isLessonPage(item)) {
      // Gather the siblings first: the board needs them to rewrite the page.
      let assets: DriveAssetMap = {};
      if (listing) {
        setAssetsFor(item.id);
        try {
          assets = await collectAssets(listing);
        } catch {
          assets = {};
        } finally {
          setAssetsFor(null);
        }
      }
      onTeachLesson(item.id, item.name, assets);
      return;
    }
    if (onTeach && canTeachOnBoard(item)) onTeach(fileUrl, item.name);
    else window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="overflow-hidden rounded-md border border-paper-100">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="group flex min-w-0 flex-1 items-center gap-3 p-3 text-left outline-none transition hover:bg-brand-50 focus-visible:shadow-ring"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mark-blue text-mark-blue-ink">
            <FolderOpen className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold text-paper-800">
            {title}
          </span>
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-paper-300 transition ${
              open ? "rotate-90 text-brand-600" : ""
            }`}
          />
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in Google Drive"
          aria-label={`Open ${title} in Google Drive`}
          className="my-2 mr-2 flex w-9 shrink-0 items-center justify-center rounded-md text-paper-400 outline-none transition-colors hover:bg-brand-100 hover:text-brand-700 focus-visible:shadow-ring"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {open && (
        <div className="space-y-3 border-t border-paper-100 px-3 py-3">
          {path.length > 1 && (
            <nav aria-label="Folder path" className="flex flex-wrap items-center gap-1 text-xs">
              {path.map((crumb, i) => {
                const last = i === path.length - 1;
                return (
                  <span key={crumb.id} className="flex items-center gap-1">
                    {i > 0 && (
                      <ChevronRight className="h-3 w-3 text-paper-300" />
                    )}
                    {last ? (
                      <span className="font-semibold text-paper-700">
                        {crumb.name}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => goTo(i)}
                        className="rounded-sm font-semibold text-brand-700 outline-none hover:underline focus-visible:shadow-ring"
                      >
                        {crumb.name}
                      </button>
                    )}
                  </span>
                );
              })}
            </nav>
          )}

          {error && (
            <p className="text-sm font-medium text-danger" role="alert">
              {error}
            </p>
          )}
          {loading && !listing && (
            <p className="text-sm text-paper-400 motion-reduce:animate-none animate-pulse">
              Loading folder…
            </p>
          )}
          {listing && listing.items.length === 0 && !loading && !error && (
            <EmptyState
              icon={<FolderOpen className="h-5 w-5" />}
              title="This folder is empty"
            />
          )}
          {listing && listing.items.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {listing.items.map((item) => {
                const { Icon, wrap } = itemVisual(item);
                const isFolder = item.kind === "folder";
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() =>
                        isFolder ? enterFolder(item) : void openFile(item)
                      }
                      disabled={assetsFor !== null}
                      title={
                        isFolder
                          ? `Open ${item.name}`
                          : goesToBoard(item)
                            ? `Teach ${item.name} on the board`
                            : `Open ${item.name} in Drive`
                      }
                      aria-label={
                        isFolder
                          ? `Open folder ${item.name}`
                          : goesToBoard(item)
                            ? `Teach ${item.name} on the board`
                            : `Open ${item.name} in Drive`
                      }
                      className="group flex w-full items-center gap-3 rounded-md border border-paper-100 p-3 text-left outline-none transition hover:border-brand-300 hover:bg-brand-50 focus-visible:shadow-ring"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${wrap}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold text-paper-800">
                        {item.name}
                      </span>
                      {assetsFor === item.id ? (
                        <span className="shrink-0 text-2xs font-bold text-brand-600">
                          Preparing…
                        </span>
                      ) : isFolder ? (
                        <ChevronRight className="h-4 w-4 shrink-0 text-paper-300 transition group-hover:text-brand-600" />
                      ) : goesToBoard(item) ? (
                        <Presentation className="h-4 w-4 shrink-0 text-paper-300 transition group-hover:text-brand-600" />
                      ) : (
                        <ExternalLink className="h-4 w-4 shrink-0 text-paper-300" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-2xs text-paper-400">
            Tap a folder to open it here — Drive&apos;s own page often shows
            folders but doesn&apos;t open them. Tap a file to show it on the
            board.
          </p>
        </div>
      )}
    </div>
  );
}
