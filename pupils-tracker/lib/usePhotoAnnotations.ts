"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { savePhotoAnnotations, subscribePhotoAnnotations } from "./firebase";
import {
  addMark as addMarkTo,
  DEFAULT_VIEW,
  type Mark,
  type PhotoView,
} from "./photo-annotate";

// One id per open page (not per browser), so a board tab and a phone tab in
// the same browser still see each other's changes.
const PAGE_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const VIEW_THROTTLE_MS = 120;

type Local = { photoAt: number; view: PhotoView; marks: Mark[] };

/**
 * Live zoom/rotate/markup state for the board photo, shared by every open
 * device through user_state/{uid}_photoview. Annotations saved for a
 * different photo (`photoAt`) are treated as blank.
 */
export function usePhotoAnnotations(
  uid: string | null,
  photoAt: number | null,
  slot = 0
) {
  const [state, setState] = useState<Local | null>(null);
  const latest = useRef<Local | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const target = useRef({ uid, slot });
  useEffect(() => {
    target.current = { uid, slot };
  }, [uid, slot]);

  useEffect(() => {
    if (!uid) return;
    return subscribePhotoAnnotations(uid, (data) => {
      if (!data) return;
      // Our own echoes are skipped; anyone else's change wins.
      if (data.by === PAGE_ID) return;
      const next = { photoAt: data.photoAt, view: data.view, marks: data.marks };
      latest.current = next;
      setState(next);
    }, slot);
  }, [uid, slot]);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const data = latest.current;
    const { uid: id, slot: s } = target.current;
    if (!data || !id) return;
    savePhotoAnnotations(id, { ...data, by: PAGE_ID }, s).catch((err) =>
      console.error("Saving photo markup failed:", err)
    );
  }, []);

  // Send any last throttled pan/zoom before this photo goes away (a flip).
  useEffect(
    () => () => {
      if (timer.current) flush();
    },
    [flush]
  );

  const current: Local | null =
    photoAt === null
      ? null
      : state && state.photoAt === photoAt
        ? state
        : { photoAt, view: DEFAULT_VIEW, marks: [] };

  const update = useCallback(
    (fn: (cur: Local) => Local, immediate: boolean) => {
      if (photoAt === null) return;
      const base =
        latest.current && latest.current.photoAt === photoAt
          ? latest.current
          : { photoAt, view: DEFAULT_VIEW, marks: [] };
      const next = fn(base);
      latest.current = next;
      setState(next);
      if (immediate) flush();
      else if (!timer.current) timer.current = setTimeout(flush, VIEW_THROTTLE_MS);
    },
    [photoAt, flush]
  );

  const setView = useCallback(
    (view: PhotoView, final = false) => update((c) => ({ ...c, view }), final),
    [update]
  );
  const addMark = useCallback(
    (mark: Mark) => update((c) => ({ ...c, marks: addMarkTo(c.marks, mark) }), true),
    [update]
  );
  const undo = useCallback(
    () => update((c) => ({ ...c, marks: c.marks.slice(0, -1) }), true),
    [update]
  );
  const clear = useCallback(() => update((c) => ({ ...c, marks: [] }), true), [update]);

  return {
    view: current?.view ?? DEFAULT_VIEW,
    marks: current?.marks ?? [],
    setView,
    addMark,
    undo,
    clear,
  };
}

/** Write a blank state for a freshly sent photo, so every device starts clean. */
export function resetPhotoAnnotations(uid: string, photoAt: number, slot = 0) {
  return savePhotoAnnotations(
    uid,
    { photoAt, view: DEFAULT_VIEW, marks: [], by: PAGE_ID },
    slot
  );
}
