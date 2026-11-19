"use client";

import { useCallback, useEffect, useState } from "react";
import {
  savePhotoSet,
  subscribeBoardPhoto,
  subscribePhotoSet,
  type BoardPhoto,
} from "./firebase";
import { clampIndex, SINGLE_PHOTO_SET, type PhotoSet } from "./photo-set";

/**
 * Follows the photo set (how many, which one is up) and every photo in it,
 * so flipping is instant. Photos older than the set's `setAt` are leftovers
 * from an earlier send and count as still loading.
 */
export function usePhotoSet(uid: string | null) {
  const [set, setSet] = useState<PhotoSet>(SINGLE_PHOTO_SET);
  const [photos, setPhotos] = useState<Record<number, BoardPhoto | null>>({});

  useEffect(() => {
    if (!uid) return;
    return subscribePhotoSet(uid, (s) => setSet(s ?? SINGLE_PHOTO_SET));
  }, [uid]);

  const { count, setAt } = set;
  useEffect(() => {
    if (!uid) return;
    const unsubs = Array.from({ length: count }, (_, slot) =>
      subscribeBoardPhoto(
        uid,
        (photo) => setPhotos((prev) => ({ ...prev, [slot]: photo })),
        slot
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [uid, count]);

  const photoAt = (slot: number): BoardPhoto | null => {
    const p = photos[slot];
    return p && p.at >= setAt ? p : null;
  };

  const go = useCallback(
    (index: number) => {
      if (!uid) return;
      const next = { ...set, index: clampIndex(index, set.count) };
      if (next.index === set.index) return;
      setSet(next);
      savePhotoSet(uid, next).catch((err) => console.error("Flip photo failed:", err));
    },
    [uid, set]
  );

  return { set, current: photoAt(set.index), go };
}
