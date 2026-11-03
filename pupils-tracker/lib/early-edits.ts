import type { Attendance, AttendanceStatus, BehaviorRecord } from "./types";
import { orderBehavior } from "./class-sync";

/**
 * Points and roll-call marks made after the app opened but before its first
 * cloud load finished. The app paints from the phone's saved copy at once, so
 * the teacher can already tap — but that copy may be days old, and the cloud
 * copy replaces it when it arrives. These are the teacher's own edits since
 * opening, worked out record by record and mark by mark, so they can be laid
 * on top of the cloud data without bringing back anything stale.
 */
export interface EarlyEdits {
  /** New or edited behaviour records (whole record, by id). */
  upserts: BehaviorRecord[];
  /** Ids of behaviour records deleted (e.g. undo). */
  removedIds: string[];
  /** date -> pupilId -> new status, or null when the mark was cleared. */
  marks: Record<string, Record<string, AttendanceStatus | null>>;
}

type Slice = { behavior: BehaviorRecord[]; attendance: Attendance };

const same = (a: BehaviorRecord, b: BehaviorRecord) =>
  a === b || JSON.stringify(a) === JSON.stringify(b);

/** What changed from `opened` (the saved copy at app open) to `now`. */
export function earlyEdits(opened: Slice, now: Slice): EarlyEdits {
  const before = new Map(opened.behavior.map((r) => [r.id, r]));
  const nowIds = new Set<string>();
  const upserts: BehaviorRecord[] = [];
  for (const r of now.behavior) {
    nowIds.add(r.id);
    const old = before.get(r.id);
    if (!old || !same(old, r)) upserts.push(r);
  }
  const removedIds = opened.behavior
    .filter((r) => !nowIds.has(r.id))
    .map((r) => r.id);

  const marks: EarlyEdits["marks"] = {};
  const dates = new Set([
    ...Object.keys(opened.attendance),
    ...Object.keys(now.attendance),
  ]);
  for (const date of dates) {
    const a = opened.attendance[date] ?? {};
    const b = now.attendance[date] ?? {};
    for (const pupilId of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (a[pupilId] === b[pupilId]) continue;
      (marks[date] ??= {})[pupilId] = b[pupilId] ?? null;
    }
  }
  return { upserts, removedIds, marks };
}

export function hasEarlyEdits(e: EarlyEdits): boolean {
  return (
    e.upserts.length > 0 ||
    e.removedIds.length > 0 ||
    Object.keys(e.marks).length > 0
  );
}

/** Lay early edits on top of freshly loaded cloud data. */
export function applyEarlyEdits<T extends Slice>(cloud: T, e: EarlyEdits): T {
  if (!hasEarlyEdits(e)) return cloud;
  const drop = new Set([...e.removedIds, ...e.upserts.map((r) => r.id)]);
  const behavior = orderBehavior([
    ...e.upserts,
    ...cloud.behavior.filter((r) => !drop.has(r.id)),
  ]);
  const attendance: Attendance = { ...cloud.attendance };
  for (const [date, pupils] of Object.entries(e.marks)) {
    const day = { ...(attendance[date] ?? {}) };
    for (const [pupilId, status] of Object.entries(pupils)) {
      if (status === null) delete day[pupilId];
      else day[pupilId] = status;
    }
    attendance[date] = day;
  }
  return { ...cloud, behavior, attendance };
}
