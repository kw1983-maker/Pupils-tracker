// Incremental cloud sync for one class's data.
//
// Every class used to be written as one whole Firestore doc on each change, so
// a single point in a busy class uploaded ~700 KB from the phone (slow), and
// the doc crept toward Firestore's hard 1 MiB limit. Now:
//   - writes send only what changed: new behaviour records via arrayUnion,
//     deleted/edited ones via arrayRemove, other fields only when they differ;
//   - older behaviour records are moved out of the live class doc into archive
//     docs `user_state/{teacherId}_{classId}_archive_{n}` once the live list
//     passes LIVE_MAX, so the live doc stays small and never hits the limit.
// Locally nothing changes: ClassData.behavior still holds every record, newest
// first — archives are merged back in on load.

import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  runTransaction,
  setDoc,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore";
import { db, loadMetadata, normalizeClassDoc } from "./firebase";
import type { ClassData } from "./store";
import type { BehaviorRecord } from "./types";

// Archive once the live doc holds more than LIVE_MAX records, keeping the
// newest LIVE_KEEP there. Each archive doc takes at most ARCHIVE_MAX records
// (~115 bytes each, so well under 1 MiB).
const LIVE_MAX = 2000;
const LIVE_KEEP = 1000;
const ARCHIVE_MAX = 3000;

// Firestore fields of a class doc other than `behavior`, with the defaults
// the old whole-doc save always wrote (Firestore rejects `undefined`).
const FIELD_DEFAULTS = {
  pupils: [],
  assignments: [],
  submissions: {},
  attendance: {},
  watchList: [],
  homeworkReminders: [],
  nextSpelling: null,
  calendarEvents: [],
  badges: [],
  remedialScores: [],
  petPurchases: [],
} as const;
type Field = keyof typeof FIELD_DEFAULTS;
const FIELDS = Object.keys(FIELD_DEFAULTS) as Field[];

function cloudField(data: ClassData, f: Field): unknown {
  return (data as unknown as Record<Field, unknown>)[f] ?? FIELD_DEFAULTS[f];
}

/** JSON with object keys sorted, so equal data compares equal regardless of
 *  the key order Firestore hands back. */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, (v as Record<string, unknown>)[k]])
        )
      : v
  );
}

/**
 * Newest first, one entry per id. Records carry `at` (ms) since this sync
 * landed; older ones don't, and they are all older than any stamped record,
 * so they keep their stored (already newest-first) order after the stamped
 * ones. arrayUnion appends to the cloud array, so order can't come from there.
 */
export function orderBehavior(records: BehaviorRecord[]): BehaviorRecord[] {
  const seen = new Set<string>();
  const unique = records.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
  return unique.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
}

// ---- diffs ----------------------------------------------------------------

export interface ClassDiff {
  fields: Partial<Record<Field, unknown>>;
  added: BehaviorRecord[];
  removed: BehaviorRecord[];
}

export function diffClass(prev: ClassData, next: ClassData): ClassDiff {
  const fields: ClassDiff["fields"] = {};
  for (const f of FIELDS) {
    const n = cloudField(next, f);
    if (stableJson(cloudField(prev, f)) !== stableJson(n)) fields[f] = n;
  }
  const prevById = new Map(prev.behavior.map((b) => [b.id, b]));
  const nextIds = new Set<string>();
  const added: BehaviorRecord[] = [];
  const removed: BehaviorRecord[] = [];
  for (const rec of next.behavior) {
    nextIds.add(rec.id);
    const old = prevById.get(rec.id);
    if (!old) added.push(rec);
    else if (old !== rec && stableJson(old) !== stableJson(rec)) {
      // Edited record: swap the stored copy for the new one.
      removed.push(old);
      added.push(rec);
    }
  }
  for (const old of prev.behavior) {
    if (!nextIds.has(old.id)) removed.push(old);
  }
  return { fields, added, removed };
}

export function isEmptyDiff(d: ClassDiff): boolean {
  return (
    !d.added.length && !d.removed.length && Object.keys(d.fields).length === 0
  );
}

/** Re-apply this device's not-yet-saved changes on top of fresh cloud data. */
export function applyClassDiff(base: ClassData, d: ClassDiff): ClassData {
  if (isEmptyDiff(d)) return base;
  const drop = new Set(d.removed.map((r) => r.id));
  return {
    ...base,
    ...(d.fields as Partial<ClassData>),
    behavior: orderBehavior([
      ...d.added,
      ...base.behavior.filter((b) => !drop.has(b.id)),
    ]),
  };
}

// ---- archives ---------------------------------------------------------------

interface ArchiveState {
  count: number; // archive docs known: _archive_0 .. _archive_{count-1}
  where: Map<string, number>; // record id -> archive index
  records: BehaviorRecord[];
}
const archives = new Map<string, ArchiveState>();
// Set when the security rules refuse archive docs, so we stop retrying.
let archivingDisabled = false;

const classRef = (t: string, c: string) => doc(db, "user_state", `${t}_${c}`);
const archiveRef = (t: string, c: string, n: number) =>
  doc(db, "user_state", `${t}_${c}_archive_${n}`);

// Archive docs carry the empty pupils/assignments/submissions fields the
// security rules expect on every user_state doc (see saveMetadata).
const archiveDoc = (behavior: BehaviorRecord[]) => ({
  pupils: [],
  assignments: [],
  submissions: {},
  behavior,
});

/** Read (or re-read) every archive doc of a class. */
export async function loadArchives(t: string, c: string): Promise<ArchiveState> {
  const state: ArchiveState = { count: 0, where: new Map(), records: [] };
  for (;;) {
    const snap = await getDoc(archiveRef(t, c, state.count));
    if (!snap.exists()) break;
    const recs = (snap.data().behavior ?? []) as BehaviorRecord[];
    for (const r of recs) state.where.set(r.id, state.count);
    state.records.push(...recs);
    state.count++;
  }
  archives.set(`${t}_${c}`, state);
  return state;
}

export function knownArchiveCount(t: string, c: string): number {
  return archives.get(`${t}_${c}`)?.count ?? 0;
}

/** Live class doc data + its archived records, newest first. */
export function withArchives(t: string, c: string, live: ClassData): ClassData {
  const a = archives.get(`${t}_${c}`);
  if (!a?.records.length) {
    return { ...live, behavior: orderBehavior(live.behavior) };
  }
  // Archived records are older than every live one; newest archive first.
  const archived = [...a.records].reverse();
  return { ...live, behavior: orderBehavior([...live.behavior, ...archived]) };
}

/** Load one class (live doc + archives) as local ClassData, or null. */
export async function loadClass(t: string, c: string): Promise<ClassData | null> {
  const [snap] = await Promise.all([getDoc(classRef(t, c)), loadArchives(t, c)]);
  if (!snap.exists()) return null;
  return withArchives(t, c, normalizeClassDoc(snap.data()) as ClassData);
}

// ---- writes -------------------------------------------------------------------

function liveBehavior(t: string, c: string, data: ClassData): BehaviorRecord[] {
  const where = archives.get(`${t}_${c}`)?.where;
  return where?.size ? data.behavior.filter((b) => !where.has(b.id)) : data.behavior;
}

function fullDoc(t: string, c: string, data: ClassData) {
  const out: Record<string, unknown> = { behavior: liveBehavior(t, c, data) };
  for (const f of FIELDS) out[f] = cloudField(data, f);
  return out;
}

/**
 * Write a whole class, splitting old behaviour records into archive docs when
 * there are too many for one doc. For seeding a brand-new cloud account.
 */
export async function seedClass(t: string, c: string, data: ClassData) {
  const ordered = orderBehavior(data.behavior);
  if (ordered.length > LIVE_MAX && !archivingDisabled) {
    const old = ordered.slice(LIVE_KEEP).reverse(); // oldest first
    let n = 0;
    for (let i = 0; i < old.length; i += ARCHIVE_MAX, n++) {
      await setDoc(archiveRef(t, c, n), archiveDoc(old.slice(i, i + ARCHIVE_MAX).reverse()));
    }
    await loadArchives(t, c);
  }
  await setDoc(classRef(t, c), fullDoc(t, c, data));
}

/**
 * Push the changes between `prev` (what the cloud holds, as far as this
 * device knows) and `next`. Returns false when nothing was written.
 *
 * With no `prev` this device has never seen the cloud copy: a new class is
 * written whole, but an existing cloud doc is left alone — the live listener
 * delivers it and the next save diffs against it — so a class added on
 * another device can never be overwritten by an empty local copy.
 */
export async function writeClassChanges(
  t: string,
  c: string,
  prev: ClassData | undefined,
  next: ClassData
): Promise<boolean> {
  if (!prev) {
    if ((await getDoc(classRef(t, c))).exists()) return false;
    await setDoc(classRef(t, c), fullDoc(t, c, next));
    return true;
  }
  const d = diffClass(prev, next);
  if (isEmptyDiff(d)) return false;

  const where = archives.get(`${t}_${c}`)?.where ?? new Map<string, number>();
  // Removed from the live doc too even when archived: an old app version may
  // have written a copy back there (arrayRemove of a missing item is a no-op).
  const liveRemoved = d.removed;
  const archivedRemoved = new Map<number, BehaviorRecord[]>();
  for (const r of d.removed) {
    const n = where.get(r.id);
    if (n !== undefined) archivedRemoved.set(n, [...(archivedRemoved.get(n) ?? []), r]);
  }

  // One atomic batch. arrayRemove and arrayUnion can't share an update of the
  // same field, hence two updates on the class doc.
  const batch = writeBatch(db);
  const ref = classRef(t, c);
  const first: Record<string, unknown> = { ...d.fields };
  if (liveRemoved.length) first.behavior = arrayRemove(...liveRemoved);
  if (Object.keys(first).length) batch.update(ref, first);
  if (d.added.length) batch.update(ref, { behavior: arrayUnion(...d.added) });
  for (const [n, recs] of archivedRemoved) {
    batch.update(archiveRef(t, c, n), { behavior: arrayRemove(...recs) });
  }
  try {
    await batch.commit();
  } catch (err) {
    // The class doc vanished (or never existed) — write it whole instead.
    if ((err as { code?: string }).code === "not-found") {
      await setDoc(ref, fullDoc(t, c, next));
      return true;
    }
    throw err;
  }
  const a = archives.get(`${t}_${c}`);
  if (a && archivedRemoved.size) {
    const gone = new Set(d.removed.map((r) => r.id));
    a.records = a.records.filter((r) => !gone.has(r.id));
    for (const id of gone) a.where.delete(id);
  }
  return true;
}

// Classes with an archive run in flight on this device.
const archiving = new Set<string>();

/**
 * If the live doc has grown past LIVE_MAX records, move its oldest records
 * into new archive doc(s). Runs in a transaction that also checks the target
 * archive slots are still empty, so two devices can't archive over each other.
 */
export async function archiveIfNeeded(t: string, c: string, data: ClassData) {
  if (archivingDisabled || archiving.has(`${t}_${c}`)) return;
  if (liveBehavior(t, c, data).length <= LIVE_MAX) return;
  archiving.add(`${t}_${c}`);
  try {
    await archiveOldest(t, c);
  } finally {
    archiving.delete(`${t}_${c}`);
  }
}

async function archiveOldest(t: string, c: string) {
  const ref = classRef(t, c);
  const known = archives.get(`${t}_${c}`) ?? (await loadArchives(t, c));
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const live = (snap.data().behavior ?? []) as BehaviorRecord[];
      // Drop copies of already-archived records (an old app version can
      // write them back), then archive everything past the newest LIVE_KEEP.
      const fresh = orderBehavior(live).filter((r) => !known.where.has(r.id));
      if (fresh.length <= LIVE_MAX) return;
      const keep = new Set(fresh.slice(0, LIVE_KEEP).map((r) => r.id));
      const old = fresh.slice(LIVE_KEEP).reverse(); // oldest first
      const chunks: BehaviorRecord[][] = [];
      for (let i = 0; i < old.length; i += ARCHIVE_MAX) {
        chunks.push(old.slice(i, i + ARCHIVE_MAX).reverse());
      }
      const refs: DocumentReference[] = chunks.map((_, i) =>
        archiveRef(t, c, known.count + i)
      );
      for (const r of refs) {
        if ((await tx.get(r)).exists()) {
          throw new Error("archive slot taken — another device archived first");
        }
      }
      refs.forEach((r, i) => tx.set(r, archiveDoc(chunks[i])));
      tx.update(ref, {
        behavior: live.filter((r) => keep.has(r.id)),
        archiveCount: known.count + chunks.length,
      });
    });
  } catch (err) {
    if ((err as { code?: string }).code === "permission-denied") {
      archivingDisabled = true;
    }
    console.warn("Behaviour archiving skipped:", err);
  }
  // Refresh from the cloud either way (another device may have archived).
  await loadArchives(t, c);
}

// ---- whole-account load -------------------------------------------------------

/**
 * Metadata plus every class (live doc + archives), loaded in parallel.
 * Returns null for a brand-new account. `cloudData[id]` is exactly what the
 * cloud holds, for use as the sync baseline; a class with no doc yet comes
 * back empty.
 */
export async function loadFullStore(t: string) {
  const meta = await loadMetadata(t);
  if (!meta) return null;
  const loaded = await Promise.all(
    meta.classes.map((c: { id: string }) => loadClass(t, c.id))
  );
  const data: Record<string, ClassData> = {};
  meta.classes.forEach((c: { id: string }, i: number) => {
    data[c.id] = loaded[i] ?? emptyCloudClass();
  });
  return { ...meta, data };
}

function emptyCloudClass(): ClassData {
  return {
    behavior: [],
    // Fresh copies: the defaults must never be shared between classes.
    ...(structuredClone(FIELD_DEFAULTS) as unknown as Omit<ClassData, "behavior">),
  };
}
