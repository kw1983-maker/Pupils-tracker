"use client";

import { useEffect, useState } from "react";
import { usePhotoAnnotations } from "@/lib/usePhotoAnnotations";
import {
  DEFAULT_VIEW,
  rotateBy,
  zoomCentered,
  type MarkColor,
} from "@/lib/photo-annotate";
import type { BoardPhoto } from "@/lib/firebase";
import { PhotoCanvas, type PenSize, type PhotoTool } from "./PhotoCanvas";
import { PhotoToolbar } from "./PhotoToolbar";

interface Props {
  uid: string;
  photo: BoardPhoto;
  /** Which photo of the set (each has its own markup). */
  slot?: number;
  alt: string;
  /** Board only: + / − zoom, R / Shift+R turn, Ctrl+Z undo, 0 fit. */
  keyboard?: boolean;
  stageClassName?: string;
  toolbarClassName?: string;
  className?: string;
}

/**
 * The board photo with live zoom / rotate / markup, synced to every open
 * device. Used full-screen on the board and inline on the phone. The chosen
 * tool, colour and size stay put when flipping to another photo.
 */
export function PhotoAnnotator(props: Props) {
  const [tool, setTool] = useState<PhotoTool>("move");
  const [color, setColor] = useState<MarkColor>("danger");
  const [size, setSize] = useState<PenSize>(1);
  const slot = props.slot ?? 0;
  return (
    <AnnotatedPhoto
      // A fresh markup state per photo, so a pending save can't land on the
      // next photo after a flip.
      key={`${slot}-${props.photo.at}`}
      {...props}
      slot={slot}
      tool={tool}
      onTool={setTool}
      color={color}
      onColor={setColor}
      size={size}
      onSize={setSize}
    />
  );
}

function AnnotatedPhoto({
  uid,
  photo,
  slot,
  alt,
  keyboard = false,
  stageClassName = "",
  toolbarClassName = "",
  className = "",
  tool,
  onTool,
  color,
  onColor,
  size,
  onSize,
}: Props & {
  slot: number;
  tool: PhotoTool;
  onTool: (t: PhotoTool) => void;
  color: MarkColor;
  onColor: (c: MarkColor) => void;
  size: PenSize;
  onSize: (s: PenSize) => void;
}) {
  const { view, marks, setView, addMark, undo, clear } = usePhotoAnnotations(
    uid,
    photo.at,
    slot
  );

  const rotate = (deg: 90 | -90) => setView(rotateBy(view, deg), true);
  const zoom = (factor: number) => setView(zoomCentered(view, factor), true);
  const fit = () => setView({ ...DEFAULT_VIEW, rotate: view.rotate }, true);

  useEffect(() => {
    if (!keyboard) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (e.key === "+" || e.key === "=") setView(zoomCentered(view, 1.4), true);
      else if (e.key === "-") setView(zoomCentered(view, 1 / 1.4), true);
      else if (e.key === "0") setView({ ...DEFAULT_VIEW, rotate: view.rotate }, true);
      else if (e.key.toLowerCase() === "r") setView(rotateBy(view, e.shiftKey ? -90 : 90), true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [keyboard, view, setView, undo]);

  return (
    <div className={className}>
      <PhotoCanvas
        src={photo.dataUrl}
        alt={alt}
        view={view}
        marks={marks}
        tool={tool}
        color={color}
        size={size}
        onView={setView}
        onMark={addMark}
        className={stageClassName}
      />
      <PhotoToolbar
        tool={tool}
        onTool={onTool}
        color={color}
        onColor={onColor}
        size={size}
        onSize={onSize}
        onRotate={rotate}
        onZoom={zoom}
        onFit={fit}
        onUndo={undo}
        onClear={clear}
        canUndo={marks.length > 0}
        className={toolbarClassName}
      />
    </div>
  );
}
