/**
 * A set of up to MAX_SET_PHOTOS photos sent from the phone, shown one at a
 * time on the board. Each photo has its own doc (a phone photo is up to
 * ~1 MB as a data URL, so they can't share one) and its own markup doc.
 * The small user_state/{uid}_photoset doc says how many there are and which
 * one is showing, so flipping is instant on every device.
 */

export const MAX_SET_PHOTOS = 6;

export interface PhotoSet {
  /** When the set was sent. */
  setAt: number;
  count: number;
  index: number;
}

/** Slot 0 keeps the original doc name, so a single photo works as before. */
export function photoDocId(uid: string, slot: number): string {
  return slot === 0 ? `${uid}_photo` : `${uid}_photo${slot + 1}`;
}

export function photoViewDocId(uid: string, slot: number): string {
  return slot === 0 ? `${uid}_photoview` : `${uid}_photoview${slot + 1}`;
}

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);

export function parsePhotoSet(raw: unknown): PhotoSet | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.setAt !== "number" || !Number.isFinite(r.setAt)) return null;
  if (!isInt(r.count) || r.count < 1 || r.count > MAX_SET_PHOTOS) return null;
  if (!isInt(r.index)) return null;
  return { setAt: r.setAt, count: r.count, index: clampIndex(r.index, r.count) };
}

/** Before any set was ever sent there is just the one photo doc. */
export const SINGLE_PHOTO_SET: PhotoSet = { setAt: 0, count: 1, index: 0 };

export function clampIndex(index: number, count: number): number {
  return Math.min(Math.max(0, index), Math.max(0, count - 1));
}

/** Next / previous photo; stops at the ends rather than wrapping. */
export function stepIndex(set: PhotoSet, delta: number): number {
  return clampIndex(set.index + delta, set.count);
}
