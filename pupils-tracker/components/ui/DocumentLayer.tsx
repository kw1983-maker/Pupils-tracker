"use client";

import { useEffect, useRef, useState } from "react";
import type { RenderTask } from "pdfjs-dist";
import type { BoardDoc } from "@/lib/useBoardDocument";

/**
 * Renders the opened file (image or one PDF page) contained & centred on the
 * board. Sits beneath the InkCanvas (same z-level, earlier in DOM order) and
 * is pointer-events-none so pen strokes pass straight through to the ink.
 */
export function DocumentLayer({
  doc,
  page,
  videoRef,
  active = true,
}: {
  doc: BoardDoc;
  page: number;
  /** Bound to the <video> for "video" docs so the toolbar can control it. */
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  /** False while the board is hidden behind another tab — pause YouTube
      playback (the <video> pause is handled by the board via videoRef). */
  active?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Pause an embedded YouTube video when the board is hidden. Needs
  // enablejsapi=1 on the embed URL; position is kept for resuming.
  useEffect(() => {
    if (active || doc.kind !== "youtube") return;
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "pauseVideo", args: "" }),
      "https://www.youtube-nocookie.com"
    );
  }, [active, doc.kind]);

  // A media element removed from the DOM keeps playing — stop the video when
  // the doc changes or the layer unmounts.
  useEffect(() => {
    const el = videoRef?.current;
    return () => el?.pause();
  }, [doc.id, videoRef]);

  // Track the board's size so the page re-renders crisply when it changes
  // (fullscreen toggle, window resize) — same pattern as InkCanvas.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() =>
      setSize({ w: root.clientWidth, h: root.clientHeight })
    );
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (doc.kind !== "pdf" || size.w === 0 || size.h === 0) return;
    let stale = false;
    (async () => {
      // pdf.js refuses overlapping renders on one canvas — cancel and drain
      // the previous task before starting (rapid page flips / resizes).
      const prevTask = renderTaskRef.current;
      if (prevTask) {
        prevTask.cancel();
        await prevTask.promise.catch(() => {});
      }
      const p = await doc.pdf.getPage(page);
      if (stale) return;
      const base = p.getViewport({ scale: 1 });
      const fit = Math.min(size.w / base.width, size.h / base.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const viewport = p.getViewport({ scale: fit * dpr });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
      const task = p.render({ canvas, viewport });
      renderTaskRef.current = task;
      await task.promise.catch(() => {}); // RenderingCancelledException — superseded
    })();
    return () => {
      stale = true;
    };
  }, [doc, page, size]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0 flex select-none items-center justify-center"
    >
      {doc.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob object URL; next/image can't optimize it
        <img
          src={doc.url}
          alt=""
          draggable={false}
          className="max-h-full max-w-full object-contain"
        />
      ) : doc.kind === "video" ? (
        // No native controls: the ink canvas sits on top so the teacher can
        // annotate a paused frame; playback runs from the floating toolbar.
        <video
          ref={videoRef}
          src={doc.url}
          playsInline
          preload="metadata"
          className="max-h-full max-w-full object-contain"
        />
      ) : doc.kind === "youtube" ? (
        // The layer root is pointer-events-none — re-enable on the iframe so
        // YouTube's own controls stay clickable (no ink over YouTube).
        <iframe
          ref={iframeRef}
          src={`https://www.youtube-nocookie.com/embed/${doc.videoId}?enablejsapi=1`}
          title={doc.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="pointer-events-auto h-full w-full"
        />
      ) : (
        <canvas ref={canvasRef} />
      )}
    </div>
  );
}
