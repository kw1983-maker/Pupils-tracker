// Parse Google Drive's public "embedded folder view" HTML into a file/folder
// listing. Used by GET /api/drive?kind=folder so the Resources tab can browse
// a shared Drive folder in-app — Drive's own page often shows nested folders
// but does not open them (especially when the teacher isn't signed in).

export type DriveFolderItemKind = "folder" | "file" | "slides";

export type DriveFolderItem = {
  id: string;
  name: string;
  kind: DriveFolderItemKind;
  /** MIME from the listing icon when Drive exposes one (e.g. audio/x-ms-wma). */
  mimeHint?: string;
};

export type DriveFolderListing = {
  name: string;
  items: DriveFolderItem[];
};

const ENTRY_ID_RE = /id="entry-([a-zA-Z0-9_-]{10,})"/g;

/** Decode the handful of HTML entities Drive puts in folder/file titles. */
export function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, n: string) =>
      String.fromCharCode(Number.parseInt(n, 10))
    );
}

/** Board-openable URL for a listing item (folders are browsed, not opened). */
export function driveItemUrl(item: DriveFolderItem): string {
  if (item.kind === "folder") {
    return `https://drive.google.com/drive/folders/${item.id}`;
  }
  if (item.kind === "slides") {
    return `https://docs.google.com/presentation/d/${item.id}/view`;
  }
  return `https://drive.google.com/file/d/${item.id}/view`;
}

function itemKind(
  href: string,
  chunk: string,
  mimeHint: string | undefined
): DriveFolderItemKind {
  if (/\/folders\//.test(href) || /aria-label="Folder"/i.test(chunk)) {
    return "folder";
  }
  if (
    /\/presentation\/d\//.test(href) ||
    mimeHint?.includes("vnd.google-apps.presentation")
  ) {
    return "slides";
  }
  return "file";
}

/**
 * Turn Drive's embeddedfolderview HTML into a listing. Folders first, then
 * files, with numeric-aware names so "Lesson 2" sorts before "Lesson 10".
 */
export function parseEmbeddedFolderView(html: string): DriveFolderListing {
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const name = decodeHtmlEntities(titleMatch?.[1]?.trim() || "Google Drive");

  const matches = [...html.matchAll(ENTRY_ID_RE)];
  const items: DriveFolderItem[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < matches.length; i++) {
    const id = matches[i][1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const start = matches[i].index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? html.length) : html.length;
    const chunk = html.slice(start, end);

    const titleRaw = chunk.match(
      /class="flip-entry-title">([\s\S]*?)<\/div>/
    )?.[1];
    const itemName = decodeHtmlEntities(
      (titleRaw ?? "").replace(/<[^>]+>/g, "").trim()
    );
    if (!itemName) continue;

    const href = chunk.match(/href="([^"]+)"/)?.[1] ?? "";
    const mimeHint = chunk.match(/\/type\/([^"'?\s]+)/)?.[1];
    const kind = itemKind(href, chunk, mimeHint);

    items.push({
      id,
      name: itemName,
      kind,
      ...(mimeHint ? { mimeHint } : {}),
    });
  }

  items.sort((a, b) => {
    if (a.kind === "folder" && b.kind !== "folder") return -1;
    if (a.kind !== "folder" && b.kind === "folder") return 1;
    return a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  return { name, items };
}
