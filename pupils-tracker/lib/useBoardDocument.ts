"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

/** A file opened on the spelling board. Session-only — never persisted. */
export type BoardDoc =
  | { kind: "image"; id: number; name: string; url: string }
  | { kind: "pdf"; id: number; name: string; pdf: PDFDocumentProxy; pages: number }
  | { kind: "video"; id: number; name: string; url: string; isObjectUrl: boolean }
  | { kind: "youtube"; id: number; name: string; videoId: string };

/** Background audio playing alongside the document (dictation tracks etc.). */
export type BoardAudio = {
  id: number;
  name: string;
  url: string;
  isObjectUrl: boolean;
};

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
  else if (doc.kind === "video") {
    if (doc.isObjectUrl) URL.revokeObjectURL(doc.url);
  } else if (doc.kind === "pdf") {
    // pdf.js v6: destroy() lives on the loading task, not the document proxy.
    void doc.pdf.loadingTask.destroy();
  }
  // youtube: nothing to release.
}

const AUDIO_EXT = /\.(mp3|wav|m4a|ogg|oga|aac|flac)$/i;
const VIDEO_EXT = /\.(mp4|m4v|webm|mov)$/i;

/** Pull the video id out of any common YouTube link shape. */
export function parseYouTubeLink(input: string): string | null {
  const s = input.trim();
  const m =
    s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ??
    s.match(
      /youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/)([a-zA-Z0-9_-]{11})/
    );
  return m ? m[1] : null;
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

/**
 * Extract the text layer of one PDF page, normalised to a single spaced string.
 * Empty for scanned/image-only PDFs (no text layer) — callers should handle "".
 */
export async function getPdfPageText(
  pdf: PDFDocumentProxy,
  page: number
): Promise<string> {
  const p = await pdf.getPage(page);
  const content = await p.getTextContent();
  return content.items
    .map((it) => ("str" in it ? it.str : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Render one PDF page to a JPEG for OCR. Used to read scanned/image-only pages
 * aloud, where getPdfPageText returns "". Mirrors DocumentLayer's render call.
 */
export async function renderPdfPageToImage(
  pdf: PDFDocumentProxy,
  page: number,
  maxWidth = 1500
): Promise<{ mimeType: string; base64: string }> {
  const p = await pdf.getPage(page);
  const base = p.getViewport({ scale: 1 });
  const scale = Math.min(2, maxWidth / base.width);
  const viewport = p.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await p.render({ canvas, viewport }).promise;
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { mimeType: "image/jpeg", base64: dataUrl.split(",")[1] ?? "" };
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
  const [zoom, setZoom] = useState(1);
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
    setZoom(1);
  }, []);

  // Background audio is deliberately independent of `doc` — a dictation track
  // keeps playing while the PDF is flipped, swapped, or closed.
  const [audio, setAudio] = useState<BoardAudio | null>(null);
  const audioMirror = useRef<BoardAudio | null>(null);
  audioMirror.current = audio;
  useEffect(
    () => () => {
      if (audioMirror.current?.isObjectUrl)
        URL.revokeObjectURL(audioMirror.current.url);
    },
    []
  );
  const replaceAudio = useCallback((next: BoardAudio | null) => {
    if (audioMirror.current?.isObjectUrl)
      URL.revokeObjectURL(audioMirror.current.url);
    audioMirror.current = next;
    setAudio(next);
  }, []);
  const closeAudio = useCallback(() => replaceAudio(null), [replaceAudio]);

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
      if (file.type.startsWith("audio/") || AUDIO_EXT.test(name)) {
        replaceAudio({
          id: ++idRef.current,
          name,
          url: URL.createObjectURL(file),
          isObjectUrl: true,
        });
        return;
      }
      if (file.type.startsWith("video/") || VIDEO_EXT.test(name)) {
        replace({
          kind: "video",
          id: ++idRef.current,
          name,
          url: URL.createObjectURL(file),
          isObjectUrl: true,
        });
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
      setError("Only PDF, image, audio and video files are supported.");
    },
    [replace, replaceAudio]
  );

  /** Open a bundled PDF by same-origin URL (e.g. a Resources book under /books/). */
  const openUrl = useCallback(
    async (url: string, name: string) => {
      setError(null);
      setLoading(true);
      // Download the whole file with one plain GET and hand pdf.js the bytes
      // (same as openFile). Letting pdf.js fetch the URL itself uses HTTP
      // range requests, which school proxies/filters often break — and the
      // old blanket catch hid the real reason from the teacher.
      try {
        let data: Uint8Array;
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          data = new Uint8Array(await res.arrayBuffer());
        } catch (err) {
          console.error(`Book download failed for ${url}:`, err);
          const reason = err instanceof Error ? err.message : "network error";
          setError(
            `Couldn't download "${name}" (${reason}) — check the internet connection or firewall on this computer.`
          );
          return;
        }
        const pdfjs = await getPdfjs();
        const pdf = await pdfjs.getDocument({ data }).promise;
        replace({
          kind: "pdf",
          id: ++idRef.current,
          name,
          pdf,
          pages: pdf.numPages,
        });
      } catch (err) {
        console.error(`pdf.js failed to open ${url}:`, err);
        const reason = err instanceof Error ? ` — ${err.message}` : "";
        setError(`Couldn't open "${name}"${reason}.`);
      } finally {
        setLoading(false);
      }
    },
    [replace]
  );

  /** Open a Drive file, Slides presentation, or YouTube video from a pasted link. */
  const openDriveLink = useCallback(
    async (link: string) => {
      setError(null);
      const videoId = parseYouTubeLink(link);
      if (videoId) {
        replace({
          kind: "youtube",
          id: ++idRef.current,
          name: "YouTube video",
          videoId,
        });
        return true;
      }
      const parsed = parseDriveLink(link);
      if (!parsed) {
        setError(
          "That doesn't look like a Google Drive, Google Slides or YouTube link."
        );
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
        // Audio/video stream straight from the proxy URL via the media
        // element's own request — the headers were all we needed here.
        const driveUrl = `/api/drive?id=${fileId}`;
        if (type.startsWith("audio/") || AUDIO_EXT.test(name)) {
          void res.body?.cancel();
          replaceAudio({
            id: ++idRef.current,
            name,
            url: driveUrl,
            isObjectUrl: false,
          });
          return true;
        }
        if (type.startsWith("video/") || VIDEO_EXT.test(name)) {
          void res.body?.cancel();
          replace({
            kind: "video",
            id: ++idRef.current,
            name,
            url: driveUrl,
            isObjectUrl: false,
          });
          return true;
        }
        setError(
          `"${name}" isn't a PDF, image, audio or video file — only those can be opened on the board.`
        );
        return false;
      } catch {
        setError("Couldn't open that Google Drive file.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [replace, replaceAudio]
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

  const zoomIn = useCallback(
    () => setZoom((z) => Math.min(+(z + 0.25).toFixed(2), 3)),
    []
  );
  const zoomOut = useCallback(
    () => setZoom((z) => Math.max(+(z - 0.25).toFixed(2), 0.5)),
    []
  );

  return {
    doc,
    audio,
    page,
    pages,
    zoom,
    zoomIn,
    zoomOut,
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
  };
}
