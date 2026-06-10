"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

/** A file opened on the spelling board. Session-only — never persisted. */
export type BoardDoc =
  | { kind: "image"; id: number; name: string; url: string }
  | { kind: "pdf"; id: number; name: string; pdf: PDFDocumentProxy; pages: number };

// Lazy module-level singleton so the ~1 MB pdf.js bundle is only fetched the
// first time a teacher actually opens a PDF.
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
function getPdfjs() {
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    return pdfjs;
  });
  return pdfjsPromise;
}

function dispose(doc: BoardDoc) {
  if (doc.kind === "image") URL.revokeObjectURL(doc.url);
  // pdf.js v6: destroy() lives on the loading task, not the document proxy.
  else void doc.pdf.loadingTask.destroy();
}

const PPT_HINT =
  "PowerPoint files can't be opened here — in PowerPoint use File → Export → PDF, then open that PDF instead. Or upload the file to Google Drive and use \"Open from Google Drive\".";

const DRIVE_SHARE_HINT =
  "Couldn't fetch that file from Google Drive. In Drive, set the file's (or presentation's) sharing to \"Anyone with the link can view\", then try again.";

const PUBLISHED_LINK_HINT =
  "That's a \"publish to the web\" link — in Slides use Share → Copy link instead, with access set to \"Anyone with the link\".";

type DriveLinkKind = "file" | "slides";

/** Pull the file id out of any common Google Drive or Slides link (or a bare id). */
export function parseDriveLink(
  input: string
): { id: string; kind: DriveLinkKind } | { error: "published-link" } | null {
  const s = input.trim();
  if (!s) return null;
  // "Publish to the web" links (/presentation/d/e/2PACX-…) use a different
  // token that the export endpoint doesn't accept — needs a targeted error.
  if (/\/presentation\/d\/e\//.test(s)) return { error: "published-link" };
  // https://docs.google.com/presentation/d/<id>/edit (or /view, /preview)
  const slides = s.match(/\/presentation\/d\/([a-zA-Z0-9_-]{10,})/);
  if (slides) return { id: slides[1], kind: "slides" };
  // https://drive.google.com/file/d/<id>/view?usp=sharing
  const dMatch = s.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (dMatch) return { id: dMatch[1], kind: "file" };
  // https://drive.google.com/open?id=<id> or .../uc?export=download&id=<id>
  const idMatch = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (idMatch) return { id: idMatch[1], kind: "file" };
  // A bare file id pasted on its own.
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return { id: s, kind: "file" };
  return null;
}

/** Filename from a content-disposition header, if present. */
function filenameFromDisposition(disposition: string | null): string | null {
  if (!disposition) return null;
  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      /* fall through */
    }
  }
  const plain = disposition.match(/filename="([^"]+)"/i);
  return plain ? plain[1] : null;
}

/** Owns the file shown on the board: open/close, current page, pdf.js lifecycle. */
export function useBoardDocument() {
  const [doc, setDoc] = useState<BoardDoc | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const idRef = useRef(0);

  // Mirror of `doc` so replace/unmount can dispose the previous file without
  // making the state updater impure.
  const docRef = useRef<BoardDoc | null>(null);
  docRef.current = doc;
  useEffect(
    () => () => {
      if (docRef.current) dispose(docRef.current);
    },
    []
  );

  const replace = useCallback((next: BoardDoc | null) => {
    if (docRef.current) dispose(docRef.current);
    docRef.current = next;
    setDoc(next);
    setPage(1);
  }, []);

  const openFile = useCallback(
    async (file: File) => {
      setError(null);
      const name = file.name;
      const ext = name.toLowerCase().split(".").pop() ?? "";
      if (
        ["ppt", "pptx", "pps", "ppsx"].includes(ext) ||
        file.type.includes("powerpoint") ||
        file.type.includes("presentation")
      ) {
        setError(PPT_HINT);
        return;
      }
      if (file.type.startsWith("image/")) {
        replace({
          kind: "image",
          id: ++idRef.current,
          name,
          url: URL.createObjectURL(file),
        });
        return;
      }
      if (file.type === "application/pdf" || ext === "pdf") {
        try {
          const pdfjs = await getPdfjs();
          const pdf = await pdfjs.getDocument({
            data: new Uint8Array(await file.arrayBuffer()),
          }).promise;
          replace({
            kind: "pdf",
            id: ++idRef.current,
            name,
            pdf,
            pages: pdf.numPages,
          });
        } catch {
          setError(
            `Couldn't open "${name}" — the file may be corrupted or password-protected.`
          );
        }
        return;
      }
      setError("Only PDF and image files are supported.");
    },
    [replace]
  );

  /** Open a bundled PDF by same-origin URL (e.g. a Resources book under /books/). */
  const openUrl = useCallback(
    async (url: string, name: string) => {
      setError(null);
      try {
        const pdfjs = await getPdfjs();
        const pdf = await pdfjs.getDocument({ url }).promise;
        replace({
          kind: "pdf",
          id: ++idRef.current,
          name,
          pdf,
          pages: pdf.numPages,
        });
      } catch {
        setError(`Couldn't open "${name}".`);
      }
    },
    [replace]
  );

  /** Open a public Google Drive file or Slides presentation from a pasted share link (or bare id). */
  const openDriveLink = useCallback(
    async (link: string) => {
      setError(null);
      const parsed = parseDriveLink(link);
      if (!parsed) {
        setError("That doesn't look like a Google Drive or Google Slides link.");
        return false;
      }
      if ("error" in parsed) {
        setError(PUBLISHED_LINK_HINT);
        return false;
      }
      const { id: fileId, kind } = parsed;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/drive?id=${fileId}${kind === "slides" ? "&kind=slides" : ""}`
        );
        if (!res.ok) {
          setError(
            res.status === 403
              ? DRIVE_SHARE_HINT
              : "Couldn't fetch the file from Google Drive — please try again."
          );
          return false;
        }
        const type = res.headers.get("content-type") ?? "";
        const name =
          filenameFromDisposition(res.headers.get("content-disposition")) ??
          (kind === "slides" ? "Slides presentation" : "Drive file");
        if (type.includes("application/pdf") || /\.pdf$/i.test(name)) {
          const pdfjs = await getPdfjs();
          const pdf = await pdfjs.getDocument({
            data: new Uint8Array(await res.arrayBuffer()),
          }).promise;
          replace({
            kind: "pdf",
            id: ++idRef.current,
            name,
            pdf,
            pages: pdf.numPages,
          });
          return true;
        }
        if (type.startsWith("image/")) {
          replace({
            kind: "image",
            id: ++idRef.current,
            name,
            url: URL.createObjectURL(await res.blob()),
          });
          return true;
        }
        setError(
          `"${name}" isn't a PDF or image — only those can be shown on the board.`
        );
        return false;
      } catch {
        setError("Couldn't open that Google Drive file.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [replace]
  );

  const close = useCallback(() => {
    replace(null);
    setError(null);
  }, [replace]);

  const dismissError = useCallback(() => setError(null), []);

  const pages = doc?.kind === "pdf" ? doc.pages : doc ? 1 : 0;
  const next = useCallback(
    () => setPage((p) => Math.min(p + 1, Math.max(pages, 1))),
    [pages]
  );
  const prev = useCallback(() => setPage((p) => Math.max(p - 1, 1)), []);

  return {
    doc,
    page,
    pages,
    error,
    loading,
    openFile,
    openUrl,
    openDriveLink,
    close,
    next,
    prev,
    dismissError,
  };
}
