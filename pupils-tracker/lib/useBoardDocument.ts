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
  "PowerPoint files can't be opened here — in PowerPoint use File → Export → PDF, then open that PDF instead.";

/** Owns the file shown on the board: open/close, current page, pdf.js lifecycle. */
export function useBoardDocument() {
  const [doc, setDoc] = useState<BoardDoc | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
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

  return { doc, page, pages, error, openFile, close, next, prev, dismissError };
}
