"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import {
  Class,
  Pupil,
  Assignment,
  Submissions,
  Attendance,
  AttendanceStatus,
  BehaviorRecord,
  BehaviorType,
  HomeworkReminder,
  CalendarEvent,
  BadgeAward,
  RemedialScore,
} from "./types";
import { ROSTERS } from "./rosters";
import {
  WEEKDAY_TABS,
  currentWeekDateForTab,
  type ParsedPlan,
  type AbsenteeInfo,
} from "./lesson-plan";
import { parseSpreadsheetId } from "./google-sheets-url";
import { behaviorDelta } from "./behaviors";
import { assignClassAvatars, avatarSrc } from "./avatars";
import { exportWeeklyAttendanceWorkbook } from "./attendance-export";
import { useAuth } from "./auth";
import {
  saveClassState,
  saveMetadata,
  loadFullStore,
  saveHistoryRecord,
  fetchHistoryRecords,
  deleteHistoryRecord,
} from "./firebase";

// Simple ID generator without needing crypto context
export const generateId = () => Math.random().toString(36).substring(2, 10);

export const todayISO = () => new Date().toISOString().split("T")[0];

// One reversible award: the record ids it created and a label for the Undo button.
type UndoAction = { kind: "behavior" | "badge"; ids: string[]; label: string };

// Status of the debounced auto-sync to the live lesson-plan Google Sheet
// (app/api/lesson-plan-sheet). "idle" means no valid sheet link is set yet.
export type LessonPlanSyncStatus =
  | { state: "idle" }
  | { state: "syncing" }
  | { state: "synced"; at: number; updatedCount: number }
  | { state: "error"; error: string; message: string; serviceAccountEmail?: string };

// Bump this key when the seeded shape changes so stale local data is replaced.
const STORE_KEY = "pupil-tracker-v4";
// Performance score: every pupil starts at PERFORMANCE_BASE and moves by the
// signed points of each behaviour entry (see `behaviorDelta`). Homework does not
// affect the score.
const PERFORMANCE_BASE = 80;
// Class order matches the sheets in docs/References/namelist.xlsx (see lib/rosters.ts).
const DEFAULT_CLASS_NAMES = ["2B", "2D", "2F", "1B", "1E"];

interface ClassData {
  pupils: Pupil[];
  assignments: Assignment[];
  submissions: Submissions;
  attendance: Attendance;
  behavior: BehaviorRecord[];
  // Pupil IDs the monitor/teacher has flagged to watch right now (behavior).
  watchList: string[];
  // Class-wide homework reminders flashing in "Needs attention" until deleted.
  homeworkReminders: HomeworkReminder[];
  // Dated calendar events; upcoming ones surface in "Needs attention".
  calendarEvents: CalendarEvent[];
  // Digital badges the teacher has awarded to pupils (Students tab).
  badges: BadgeAward[];
  // Recorded plays of Remedial-tab activities by band 1/2 pupils (Remedial tab).
  remedialScores: RemedialScore[];
}

interface StoreShape {
  classes: Class[];
  currentClassId: string;
  data: Record<string, ClassData>;
  teacherId?: string | null;
  // Lesson plan (Resources tab): the weekly Google-Sheet link, the parsed
  // structure of the uploaded .xlsx, and any teacher-set class-name aliases
  // (normalized sheet "Class" value -> app class id). The uploaded workbook
  // bytes live in IndexedDB, not here. lessonPlanUrl and classAliases also
  // sync to Firestore (see saveMetadata/loadFullStore); lessonPlan itself
  // stays local/derived — it's automatically refetched from the live sheet
  // whenever lessonPlanUrl is set (see the sync effect below).
  lessonPlanUrl?: string;
  lessonPlan?: ParsedPlan | null;
  classAliases?: Record<string, string>;
  // classId -> dateISO -> shortened absentee names this sync mechanism wrote
  // into that date's Reflection cell last time (see the sync effect below).
  // A pure diffing cache for appendNotAchievedNames, so it can tell "a pupil
  // I appended is no longer absent, remove them" apart from "the teacher
  // typed this name themselves, leave it." Local-only, like `lessonPlan` —
  // safely rebuildable, so not worth syncing to Firestore.
  lastSyncedAbsentees?: Record<string, Record<string, string[]>>;
  // classId -> that class's "Rekod Perkembangan Murid_BI" Google Sheet link
  // (one spreadsheet per class, unlike the single shared lessonPlanUrl).
  // Also synced to Firestore, same as classAliases.
  pbdSheetUrls?: Record<string, string>;
}

function emptyClassData(): ClassData {
  // Start blank: no assignment columns until the teacher adds them.
  return {
    pupils: [],
    assignments: [],
    submissions: {},
    attendance: {},
    behavior: [],
    watchList: [],
    homeworkReminders: [],
    calendarEvents: [],
    badges: [],
    remedialScores: [],
  };
}

// A class pre-filled with the exact roster from docs/References/namelist.xlsx
// (via lib/rosters.ts). Assignments/submissions/attendance/behavior start empty.
function rosterClassData(className: string): ClassData {
  const names = ROSTERS[className] ?? [];
  return {
    pupils: names.map((name) => ({ id: generateId(), name })),
    assignments: [],
    submissions: {},
    attendance: {},
    behavior: [],
    watchList: [],
    homeworkReminders: [],
    calendarEvents: [],
    badges: [],
    remedialScores: [],
  };
}

function freshStore(): StoreShape {
  const classes = DEFAULT_CLASS_NAMES.map((name) => ({ id: generateId(), name }));
  const data: Record<string, ClassData> = {};
  classes.forEach((c) => (data[c.id] = rosterClassData(c.name)));
  return { classes, currentClassId: classes[0].id, data, teacherId: null };
}

// Local cache only. The teacherId (cloud key) is NOT taken from localStorage —
// it is always the signed-in account's uid, set by the reconcile effect below.
function loadStore(): StoreShape {
  if (typeof window === "undefined") return freshStore();
  try {
    const saved = window.localStorage.getItem(STORE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as StoreShape;
      if (parsed?.classes?.length) {
        return { ...parsed, teacherId: null };
      }
    }
  } catch {
    /* ignore */
  }
  return freshStore();
}

interface TrackerContextValue {
  hydrated: boolean;
  // True once the initial cloud reconcile (if any) has settled — see
  // `cloudReconciled` state in TrackerProvider. Consumers that write
  // currentClassId on mount (e.g. the lesson-plan auto class-switch) should
  // wait for this so their write isn't clobbered by a later-resolving fetch.
  cloudReconciled: boolean;
  teacherId: string | null;
  syncStatus: "synced" | "saving" | "offline" | "error";

  // classes
  classes: Class[];
  currentClassId: string;
  currentClassName: string;
  setCurrentClass: (id: string) => void;
  addClass: (name: string) => void;
  renameClass: (id: string, name: string) => void;
  removeClass: (id: string) => void;
  loadSampleData: () => void;
  syncRoster: () => void;

  // lesson plan (Resources tab)
  lessonPlanUrl: string;
  lessonPlan: ParsedPlan | null;
  classAliases: Record<string, string>;
  setLessonPlanUrl: (url: string) => void;
  setLessonPlan: (plan: ParsedPlan | null) => void;
  setClassAlias: (normalizedRaw: string, classId: string) => void;
  // Absentee count/total/names for a class on a date, read from any class's
  // records (not just the current one) — used to write back into the plan.
  getAbsenteeInfo: (classId: string, dateISO: string) => AbsenteeInfo | null;
  // Any class's pupil roster (not just the current one) — used when
  // importing a past lesson-plan file spanning multiple classes.
  getClassPupils: (classId: string) => Pupil[];
  // Debounced auto-sync to the live Google Sheet (fires on attendance/link
  // changes); retry re-triggers it on demand, e.g. after sharing the sheet.
  lessonPlanSyncStatus: LessonPlanSyncStatus;
  retryLessonPlanSync: () => void;

  // PBD "Rekod Perkembangan Murid_BI" Google Sheet link, one per class.
  // pbdSheetUrl/setPbdSheetUrl are scoped to the current class, like the
  // current-class data slice below.
  pbdSheetUrl: string;
  setPbdSheetUrl: (url: string) => void;
  // Raw classId -> Sheet URL map for every class, not just the current one —
  // used when importing a past lesson-plan file spanning multiple classes.
  pbdSheetUrls: Record<string, string>;

  // current-class data (same shape the pages already consume)
  pupils: Pupil[];
  assignments: Assignment[];
  submissions: Submissions;
  attendance: Attendance;
  behavior: BehaviorRecord[];
  watchList: string[];
  homeworkReminders: HomeworkReminder[];
  calendarEvents: CalendarEvent[];
  badges: BadgeAward[];
  remedialScores: RemedialScore[];

  // Unique avatar URL for a pupil within the current class (collision-free);
  // falls back to the plain name-hash for non-pupil labels.
  avatarFor: (name: string) => string;

  // pupils
  addPupils: (names: string[]) => void;
  removePupil: (pupilId: string) => void;
  updatePupilNotes: (pupilId: string, notes: string) => void;

  // behavior watch list (monitor)
  addToWatch: (pupilId: string) => void;
  removeFromWatch: (pupilId: string) => void;

  // homework reminders (class-wide, shown in "Needs attention")
  addHomeworkReminder: (type: string, info: string) => void;
  removeHomeworkReminder: (id: string) => void;

  // calendar events (dated; upcoming ones shown in "Needs attention")
  addCalendarEvent: (date: string, title: string, note: string) => void;
  updateCalendarEvent: (
    id: string,
    fields: { date?: string; title?: string; note?: string }
  ) => void;
  removeCalendarEvent: (id: string) => void;

  // assignments
  addAssignment: (date: string, title: string) => void;
  removeAssignment: (assignmentId: string) => void;

  // submissions
  toggleSubmission: (assignmentId: string, pupilId: string) => void;
  toggleAllForAssignment: (assignmentId: string) => void;

  // attendance
  setAttendance: (date: string, pupilId: string, status: AttendanceStatus) => void;
  markAllPresent: (date: string) => void;
  unmarkAll: (date: string) => void;

  // behavior
  addBehavior: (
    pupilId: string,
    type: BehaviorType,
    points: number,
    note: string
  ) => void;
  // Award the same points/reason to several pupils (or the whole class) at once.
  addBehaviorToMany: (
    pupilIds: string[],
    type: BehaviorType,
    points: number,
    note: string
  ) => void;
  removeBehavior: (id: string) => void;
  // Edit a logged entry after the fact (points / type / note).
  updateBehavior: (
    id: string,
    patch: { type?: BehaviorType; points?: number; note?: string }
  ) => void;

  // badges (Students tab)
  awardBadge: (pupilId: string, badgeId: string, note: string) => void;
  removeBadge: (id: string) => void;

  // remedial activity scores (Remedial tab)
  addRemedialScore: (
    pupilName: string,
    activityId: string,
    activityTitle: string,
    score: number
  ) => void;
  updateRemedialScore: (id: string, score: number) => void;
  removeRemedialScore: (id: string) => void;

  // Undo the most recent award (behaviour single/batch, or badge). In-memory
  // only — resets on reload, since undo is for "oops, just now".
  undoLast: () => void;
  lastUndoLabel: string | null;

  // derived helpers
  getPupilScore: (pupilId: string) => { score: number; total: number };
  getPerformanceScore: (pupilId: string) => {
    score: number;
    positives: number;
    negatives: number;
  };
  exportToCSV: () => void;
  // Download one .xlsx with every class's Mon–Fri attendance for the week
  // containing weekDateISO (the chosen date snaps to that week's Monday).
  exportWeeklyAttendance: (weekDateISO: string) => void;

  // Firebase sync methods
  enableSync: (key: string) => Promise<boolean>;
  disableSync: () => void;
  saveToCloud: () => Promise<void>;
  createSnapshot: (name: string) => Promise<void>;
  getSnapshots: () => Promise<any[]>;
  restoreSnapshot: (snapshot: any) => Promise<void>;
  deleteSnapshot: (historyId: string) => Promise<void>;
}

const TrackerContext = createContext<TrackerContextValue | null>(null);

export function TrackerProvider({ children }: { children: ReactNode }) {
  // The signed-in account drives which cloud document we sync to (uid), so the
  // same data follows the user across every browser and device.
  const { user } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [store, setStore] = useState<StoreShape>(() => freshStore());
  const [syncStatus, setSyncStatus] = useState<"synced" | "saving" | "offline" | "error">("synced");
  // In-memory undo stack for the most recent awards (not persisted).
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  // Live lesson-plan Sheet sync status (not persisted — recomputed on load).
  const [lessonPlanSyncStatus, setLessonPlanSyncStatus] = useState<LessonPlanSyncStatus>({
    state: "idle",
  });
  const [lessonPlanRetryNonce, setLessonPlanRetryNonce] = useState(0);
  // Gates the auto-sync effect: stays false until the initial cloud reconciliation
  // finishes, so local data can't overwrite newer cloud data on first load.
  const cloudReady = useRef(false);
  // Same signal as a reactive state (the ref alone can't be a hook dependency),
  // so other effects — e.g. the lesson-plan auto class-switch — can wait for
  // the cloud reconcile to finish before writing currentClassId, rather than
  // racing it and having their write clobbered when the cloud fetch resolves.
  const [cloudReconciled, setCloudReconciled] = useState(false);
  // Always-current store snapshot, so the reconcile effect can seed the cloud from
  // the latest local data without depending on `store` (which would re-run it).
  const storeRef = useRef(store);
  storeRef.current = store;

  // Paint from localStorage immediately — first render must never block on the
  // network (an unreachable/slow Firestore would otherwise hang on "Loading…").
  useEffect(() => {
    setStore(loadStore());
    setHydrated(true);
  }, []);

  // Reconcile with the cloud document keyed on the signed-in account's uid.
  // Re-runs if the account changes (sign out / switch account).
  useEffect(() => {
    if (!hydrated) return;
    const uid = user?.uid;
    if (!uid) {
      cloudReady.current = true;
      setCloudReconciled(true);
      return;
    }

    cloudReady.current = false;
    setCloudReconciled(false);
    let cancelled = false;

    (async () => {
      setSyncStatus("saving");
      try {
        const cloudData = await loadFullStore(uid);
        if (cancelled) return;
        if (cloudData && cloudData.classes?.length) {
          // Account already has data in the cloud — it wins. lessonPlanUrl/
          // classAliases fall back to the current local value when the cloud
          // doc predates syncing them (field absent, not just empty) so they
          // aren't wiped on a device that already had them; lessonPlan itself
          // stays local — it's re-derived from the live sheet once
          // lessonPlanUrl is set (see the sync effect below).
          setStore((s) => ({
            ...s,
            classes: cloudData.classes,
            currentClassId: cloudData.currentClassId,
            data: cloudData.data,
            teacherId: uid,
            lessonPlanUrl: cloudData.lessonPlanUrl ?? s.lessonPlanUrl ?? "",
            classAliases: cloudData.classAliases ?? s.classAliases ?? {},
            pbdSheetUrls: cloudData.pbdSheetUrls ?? s.pbdSheetUrls ?? {},
          }));
        } else {
          // First sign-in for this account — seed the cloud from local data.
          const local = storeRef.current;
          await saveMetadata(
            uid,
            local.classes,
            local.currentClassId,
            local.lessonPlanUrl,
            local.classAliases,
            local.pbdSheetUrls
          );
          for (const c of local.classes) {
            if (local.data[c.id]) await saveClassState(uid, c.id, local.data[c.id]);
          }
          if (!cancelled) setStore((s) => ({ ...s, teacherId: uid }));
        }
        if (!cancelled) setSyncStatus("synced");
      } catch (err) {
        console.error("Failed to automatically load from cloud:", err);
        if (!cancelled) setSyncStatus("error");
      } finally {
        cloudReady.current = true;
        if (!cancelled) setCloudReconciled(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, user?.uid]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }, [hydrated, store]);

  // Sync state changes to Firestore when sync is enabled
  useEffect(() => {
    // Wait for the initial cloud reconciliation so we never push stale local
    // data over newer cloud data on first load.
    if (!hydrated || !cloudReady.current || !store.teacherId) return;

    const teacherId = store.teacherId;
    const currentClassId = store.currentClassId;
    const curData = store.data[currentClassId];
    const classes = store.classes;
    const lessonPlanUrl = store.lessonPlanUrl;
    const classAliases = store.classAliases;
    const pbdSheetUrls = store.pbdSheetUrls;

    setSyncStatus("saving");

    const timer = setTimeout(async () => {
      try {
        if (curData) {
          await saveClassState(teacherId, currentClassId, curData);
        }
        await saveMetadata(
          teacherId,
          classes,
          currentClassId,
          lessonPlanUrl,
          classAliases,
          pbdSheetUrls
        );
        setSyncStatus("synced");
      } catch (err) {
        console.error("Firestore sync error:", err);
        setSyncStatus("error");
      }
    }, 1000); // 1-second debounce to prevent write spamming

    return () => clearTimeout(timer);
  }, [
    hydrated,
    store.classes,
    store.currentClassId,
    store.data,
    store.teacherId,
    store.lessonPlanUrl,
    store.classAliases,
    store.pbdSheetUrls,
  ]);

  // Sync online/offline indicators
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      if (store.teacherId) setSyncStatus("synced");
    };
    const handleOffline = () => {
      if (store.teacherId) setSyncStatus("offline");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [store.teacherId]);

  const cid = store.currentClassId;
  const cur = store.data[cid] ?? emptyClassData();
  const currentClassName =
    store.classes.find((c) => c.id === cid)?.name ?? "";

  // Collision-free avatar per pupil for the current class, rebuilt only when the
  // roster changes. Non-pupil labels (e.g. "Class") fall back to the name-hash.
  const avatarMap = useMemo(
    () => assignClassAvatars(cur.pupils.map((p) => p.name)),
    [cur.pupils]
  );
  const avatarFor = (name: string) => avatarMap.get(name) ?? avatarSrc(name);

  // Update the current class's data slice immutably.
  const updateCur = (fn: (d: ClassData) => ClassData) => {
    setStore((s) => ({
      ...s,
      data: { ...s.data, [s.currentClassId]: fn(s.data[s.currentClassId]) },
    }));
  };

  // ---- classes ----
  const setCurrentClass = (id: string) => {
    // The undo stack holds ids from the class that was current when awarded, so
    // it can't be reversed once a different class is showing — clear it.
    setUndoStack([]);
    setStore((s) => ({ ...s, currentClassId: id }));
  };

  const addClass = (name: string) => {
    const id = generateId();
    setStore((s) => ({
      ...s,
      classes: [...s.classes, { id, name: name.trim() }],
      data: { ...s.data, [id]: emptyClassData() },
      currentClassId: id,
    }));
  };

  const renameClass = (id: string, name: string) =>
    setStore((s) => ({
      ...s,
      classes: s.classes.map((c) => (c.id === id ? { ...c, name } : c)),
    }));

  const removeClass = (id: string) =>
    setStore((s) => {
      if (s.classes.length <= 1) return s; // keep at least one class
      const classes = s.classes.filter((c) => c.id !== id);
      const data = { ...s.data };
      delete data[id];
      const currentClassId =
        s.currentClassId === id ? classes[0].id : s.currentClassId;
      return { classes, data, currentClassId };
    });

  // Restore the official roster (from the namelist) into any empty class.
  const loadSampleData = () =>
    setStore((s) => {
      const data = { ...s.data };
      s.classes.forEach((c) => {
        if ((data[c.id]?.pupils.length ?? 0) === 0 && ROSTERS[c.name]) {
          data[c.id] = rosterClassData(c.name);
        }
      });
      return { ...s, data };
    });

  // Add any roster pupils missing from existing classes (safe for non-empty classes).
  const syncRoster = () =>
    setStore((s) => {
      const data = { ...s.data };
      s.classes.forEach((c) => {
        const roster = ROSTERS[c.name];
        if (!roster) return;
        const existing = new Set((data[c.id]?.pupils ?? []).map((p) => p.name.toLowerCase()));
        const toAdd = roster
          .filter((name) => !existing.has(name.toLowerCase()))
          .map((name) => ({ id: generateId(), name }));
        if (toAdd.length) {
          data[c.id] = { ...data[c.id], pupils: [...(data[c.id]?.pupils ?? []), ...toAdd] };
        }
      });
      return { ...s, data };
    });

  // ---- lesson plan (Resources tab) ----
  const setLessonPlanUrl = (url: string) =>
    setStore((s) => ({ ...s, lessonPlanUrl: url }));
  const setLessonPlan = (plan: ParsedPlan | null) =>
    setStore((s) => ({ ...s, lessonPlan: plan }));
  const setClassAlias = (normalizedRaw: string, classId: string) =>
    setStore((s) => ({
      ...s,
      classAliases: { ...(s.classAliases ?? {}), [normalizedRaw]: classId },
    }));

  // ---- PBD "Rekod Perkembangan Murid_BI" sheet link (per class) ----
  const setPbdSheetUrl = (url: string) =>
    setStore((s) => ({
      ...s,
      pbdSheetUrls: { ...(s.pbdSheetUrls ?? {}), [s.currentClassId]: url },
    }));

  // Absentees for a class on a date, from that class's recorded attendance.
  // Returns null when nothing was marked that day, so the plan cell is left
  // untouched rather than overwritten with "0 absent".
  const getAbsenteeInfo = (
    classId: string,
    dateISO: string
  ): AbsenteeInfo | null => {
    const cd = store.data[classId];
    if (!cd) return null;
    const day = cd.attendance[dateISO];
    if (!day || Object.keys(day).length === 0) return null;
    const names: string[] = [];
    for (const p of cd.pupils) {
      if (day[p.id] === "absent") names.push(p.name);
    }
    return { absent: names.length, total: cd.pupils.length, names };
  };

  // A class's pupil roster, from any class (not just the current one) —
  // used when importing a past lesson-plan file, which can cover classes
  // other than whichever one is currently selected.
  const getClassPupils = (classId: string): Pupil[] => store.data[classId]?.pupils ?? [];

  const retryLessonPlanSync = () => setLessonPlanRetryNonce((n) => n + 1);

  // Debounced auto-sync of the lesson-plan Reflection cells to the live
  // Google Sheet, mirroring the Firestore debounce above. Fires whenever the
  // sheet link, class aliases, class list, or any class's data (attendance,
  // most relevantly) changes.
  useEffect(() => {
    if (!hydrated) return;
    const url = store.lessonPlanUrl ?? "";
    const spreadsheetId = parseSpreadsheetId(url);
    // No valid link yet — nothing to sync. (The UI only shows the sync
    // banner once the URL looks valid, so a stale status here is never seen.)
    if (!spreadsheetId) return;
    if (!user) return;

    const classes = store.classes;
    const classAliases = store.classAliases ?? {};
    const data = store.data;
    const previousAttendance = store.lastSyncedAbsentees ?? {};

    const timer = setTimeout(async () => {
      setLessonPlanSyncStatus({ state: "syncing" });
      try {
        const attendance: Record<string, Record<string, AbsenteeInfo>> = {};
        for (const c of classes) {
          for (const tab of WEEKDAY_TABS) {
            const dateISO = currentWeekDateForTab(tab);
            if (!dateISO) continue;
            const day = data[c.id]?.attendance[dateISO];
            if (!day || Object.keys(day).length === 0) continue;
            const names = (data[c.id]?.pupils ?? [])
              .filter((p) => day[p.id] === "absent")
              .map((p) => p.name);
            attendance[c.id] = attendance[c.id] ?? {};
            attendance[c.id][dateISO] = {
              absent: names.length,
              total: data[c.id]?.pupils.length ?? 0,
              names,
            };
          }
        }

        const idToken = await user.getIdToken();
        const res = await fetch("/api/lesson-plan-sheet", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            lessonPlanUrl: url,
            classes,
            classAliases,
            attendance,
            previousAttendance,
          }),
        });
        const resData = await res.json();
        if (resData.ok) {
          setStore((s) => ({
            ...s,
            lessonPlan: {
              sourceUrl: url,
              updatedAt: resData.syncedAt,
              tabNames: resData.tabNames,
              blocks: resData.blocks,
            },
            lastSyncedAbsentees: resData.syncedAbsentees ?? s.lastSyncedAbsentees,
          }));
          setLessonPlanSyncStatus({
            state: "synced",
            at: resData.syncedAt,
            updatedCount: resData.updatedCount,
          });
        } else {
          setLessonPlanSyncStatus({
            state: "error",
            error: resData.error ?? "sheets-api-error",
            message: resData.message ?? "Sync failed.",
            serviceAccountEmail: resData.serviceAccountEmail,
          });
        }
      } catch {
        setLessonPlanSyncStatus({
          state: "error",
          error: "network",
          message: "Could not reach the server.",
        });
      }
    }, 1000); // 1-second debounce, matching the Firestore sync above.

    return () => clearTimeout(timer);
  }, [
    hydrated,
    store.lessonPlanUrl,
    store.classAliases,
    store.classes,
    store.data,
    user,
    lessonPlanRetryNonce,
  ]);

  // ---- pupils ----
  const addPupils = (names: string[]) =>
    updateCur((d) => {
      const existing = new Set(d.pupils.map((p) => p.name.toLowerCase()));
      const toAdd = names
        .map((n) => n.trim())
        .filter((n) => n.length > 0 && !existing.has(n.toLowerCase()))
        .map((name) => ({ id: generateId(), name }));
      return toAdd.length ? { ...d, pupils: [...d.pupils, ...toAdd] } : d;
    });

  const removePupil = (pupilId: string) =>
    updateCur((d) => ({
      ...d,
      pupils: d.pupils.filter((p) => p.id !== pupilId),
      watchList: (d.watchList ?? []).filter((id) => id !== pupilId),
    }));

  const updatePupilNotes = (pupilId: string, notes: string) =>
    updateCur((d) => ({
      ...d,
      pupils: d.pupils.map((p) => (p.id === pupilId ? { ...p, notes } : p)),
    }));

  // ---- behavior watch list (monitor) ----
  const addToWatch = (pupilId: string) =>
    updateCur((d) => {
      const list = d.watchList ?? [];
      return list.includes(pupilId) ? d : { ...d, watchList: [...list, pupilId] };
    });

  const removeFromWatch = (pupilId: string) =>
    updateCur((d) => ({
      ...d,
      watchList: (d.watchList ?? []).filter((id) => id !== pupilId),
    }));

  // ---- homework reminders (class-wide) ----
  const addHomeworkReminder = (type: string, info: string) => {
    if (!type.trim()) return;
    updateCur((d) => ({
      ...d,
      homeworkReminders: [
        {
          id: generateId(),
          type: type.trim(),
          info: info.trim(),
          createdDate: todayISO(),
        },
        ...(d.homeworkReminders ?? []),
      ],
    }));
  };

  const removeHomeworkReminder = (id: string) =>
    updateCur((d) => ({
      ...d,
      homeworkReminders: (d.homeworkReminders ?? []).filter((h) => h.id !== id),
    }));

  // ---- calendar events ----
  const addCalendarEvent = (date: string, title: string, note: string) => {
    if (!date || !title.trim()) return;
    updateCur((d) => ({
      ...d,
      calendarEvents: [
        ...(d.calendarEvents ?? []),
        { id: generateId(), date, title: title.trim(), note: note.trim() },
      ],
    }));
  };

  const updateCalendarEvent = (
    id: string,
    fields: { date?: string; title?: string; note?: string }
  ) =>
    updateCur((d) => ({
      ...d,
      calendarEvents: (d.calendarEvents ?? []).map((ev) =>
        ev.id === id
          ? {
              ...ev,
              ...(fields.date ? { date: fields.date } : {}),
              ...(fields.title !== undefined
                ? { title: fields.title.trim() }
                : {}),
              ...(fields.note !== undefined
                ? { note: fields.note.trim() }
                : {}),
            }
          : ev
      ),
    }));

  const removeCalendarEvent = (id: string) =>
    updateCur((d) => ({
      ...d,
      calendarEvents: (d.calendarEvents ?? []).filter((ev) => ev.id !== id),
    }));

  // ---- assignments ----
  const addAssignment = (date: string, title: string) => {
    if (!date || !title.trim()) return;
    updateCur((d) => ({
      ...d,
      assignments: [...d.assignments, { id: generateId(), date, title: title.trim() }],
    }));
  };

  const removeAssignment = (assignmentId: string) =>
    updateCur((d) => {
      const submissions = { ...d.submissions };
      delete submissions[assignmentId];
      return {
        ...d,
        assignments: d.assignments.filter((a) => a.id !== assignmentId),
        submissions,
      };
    });

  // ---- submissions ----
  const toggleSubmission = (assignmentId: string, pupilId: string) =>
    updateCur((d) => {
      const subs = d.submissions[assignmentId] || {};
      return {
        ...d,
        submissions: {
          ...d.submissions,
          [assignmentId]: { ...subs, [pupilId]: !subs[pupilId] },
        },
      };
    });

  const toggleAllForAssignment = (assignmentId: string) =>
    updateCur((d) => {
      const subs = d.submissions[assignmentId] || {};
      const allChecked =
        d.pupils.length > 0 && d.pupils.every((p) => !!subs[p.id]);
      const next = { ...subs };
      d.pupils.forEach((p) => (next[p.id] = !allChecked));
      return { ...d, submissions: { ...d.submissions, [assignmentId]: next } };
    });

  // ---- attendance ----
  const setAttendance = (
    date: string,
    pupilId: string,
    status: AttendanceStatus
  ) =>
    updateCur((d) => ({
      ...d,
      attendance: {
        ...d.attendance,
        [date]: { ...(d.attendance[date] || {}), [pupilId]: status },
      },
    }));

  const markAllPresent = (date: string) =>
    updateCur((d) => {
      const day = { ...(d.attendance[date] || {}) };
      d.pupils.forEach((p) => (day[p.id] = "present"));
      return { ...d, attendance: { ...d.attendance, [date]: day } };
    });

  const unmarkAll = (date: string) =>
    updateCur((d) => ({
      ...d,
      attendance: { ...d.attendance, [date]: {} },
    }));

  // ---- behavior ----
  // A short, human label for the Undo button tooltip.
  const undoLabel = (type: BehaviorType, points: number, count: number) => {
    const sign = type === "positive" ? "+" : "−";
    const mag = Math.abs(points);
    return count > 1
      ? `${sign}${mag} for ${count} pupils`
      : `${sign}${mag} points`;
  };
  const pushUndo = (action: UndoAction) =>
    setUndoStack((st) => [...st, action].slice(-20));

  const addBehavior = (
    pupilId: string,
    type: BehaviorType,
    points: number,
    note: string
  ) => {
    const id = generateId();
    updateCur((d) => ({
      ...d,
      behavior: [
        { id, pupilId, date: todayISO(), type, points, note: note.trim() },
        ...d.behavior,
      ],
    }));
    pushUndo({ kind: "behavior", ids: [id], label: undoLabel(type, points, 1) });
  };

  const addBehaviorToMany = (
    pupilIds: string[],
    type: BehaviorType,
    points: number,
    note: string
  ) => {
    if (pupilIds.length === 0) return;
    const date = todayISO();
    const trimmed = note.trim();
    const recs = pupilIds.map((pupilId) => ({
      id: generateId(),
      pupilId,
      date,
      type,
      points,
      note: trimmed,
    }));
    updateCur((d) => ({ ...d, behavior: [...recs, ...d.behavior] }));
    pushUndo({
      kind: "behavior",
      ids: recs.map((r) => r.id),
      label: undoLabel(type, points, recs.length),
    });
  };

  const removeBehavior = (id: string) =>
    updateCur((d) => ({ ...d, behavior: d.behavior.filter((b) => b.id !== id) }));

  const updateBehavior = (
    id: string,
    patch: { type?: BehaviorType; points?: number; note?: string }
  ) =>
    updateCur((d) => ({
      ...d,
      behavior: d.behavior.map((b) =>
        b.id === id
          ? {
              ...b,
              ...patch,
              note: patch.note !== undefined ? patch.note.trim() : b.note,
            }
          : b
      ),
    }));

  // Reverse the most recent award (single, batch, or badge) in one tap.
  const undoLast = () => {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    updateCur((d) =>
      last.kind === "behavior"
        ? { ...d, behavior: d.behavior.filter((b) => !last.ids.includes(b.id)) }
        : { ...d, badges: (d.badges ?? []).filter((b) => !last.ids.includes(b.id)) }
    );
    setUndoStack((st) => st.slice(0, -1));
  };
  const lastUndoLabel = undoStack.length
    ? undoStack[undoStack.length - 1].label
    : null;

  // ---- badges (Students tab) ----
  const awardBadge = (pupilId: string, badgeId: string, note: string) => {
    if (!pupilId || !badgeId) return;
    const id = generateId();
    updateCur((d) => ({
      ...d,
      badges: [
        { id, pupilId, badgeId, date: todayISO(), note: note.trim() },
        ...(d.badges ?? []),
      ],
    }));
    pushUndo({ kind: "badge", ids: [id], label: "badge" });
  };

  const removeBadge = (id: string) =>
    updateCur((d) => ({
      ...d,
      badges: (d.badges ?? []).filter((b) => b.id !== id),
    }));

  // ---- remedial activity scores (Remedial tab) ----
  const addRemedialScore = (
    pupilName: string,
    activityId: string,
    activityTitle: string,
    score: number
  ) => {
    if (!pupilName || !activityId) return;
    updateCur((d) => ({
      ...d,
      remedialScores: [
        {
          id: generateId(),
          pupilName,
          activityId,
          activityTitle,
          score,
          playedAt: new Date().toISOString(),
        },
        ...(d.remedialScores ?? []),
      ],
    }));
  };

  const updateRemedialScore = (id: string, score: number) =>
    updateCur((d) => ({
      ...d,
      remedialScores: (d.remedialScores ?? []).map((r) =>
        r.id === id ? { ...r, score } : r
      ),
    }));

  const removeRemedialScore = (id: string) =>
    updateCur((d) => ({
      ...d,
      remedialScores: (d.remedialScores ?? []).filter((r) => r.id !== id),
    }));

  // ---- derived ----
  const getPupilScore = (pupilId: string) => {
    if (cur.assignments.length === 0) return { score: 0, total: 0 };
    const score = cur.assignments.filter(
      (a) => !!cur.submissions[a.id]?.[pupilId]
    ).length;
    return { score, total: cur.assignments.length };
  };

  // All-time performance score: base 80, ±2 per behavior entry. Homework is
  // tracked separately and does not affect the score.
  const getPerformanceScore = (pupilId: string) => {
    const recs = cur.behavior.filter((b) => b.pupilId === pupilId);
    const positives = recs.filter((b) => b.type === "positive").length;
    const negatives = recs.filter((b) => b.type === "negative").length;
    const score =
      PERFORMANCE_BASE + recs.reduce((sum, b) => sum + behaviorDelta(b), 0);
    return { score, positives, negatives };
  };

  const exportToCSV = () => {
    if (cur.pupils.length === 0) {
      alert("No data to export.");
      return;
    }
    const headers = [
      "Pupil Name",
      ...cur.assignments.map((a) => `${a.title} (${a.date})`),
      "Total Score",
    ];
    const rows = [headers.map((h) => `"${h}"`).join(",")];
    cur.pupils.forEach((pupil) => {
      const { score, total } = getPupilScore(pupil.id);
      rows.push(
        [
          `"${pupil.name}"`,
          ...cur.assignments.map((a) =>
            cur.submissions[a.id]?.[pupil.id] ? '"Checked"' : '"-"'
          ),
          `"${score}/${total}"`,
        ].join(",")
      );
    });
    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `ClassTrack_${currentClassName || "Class"}_${todayISO()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Mon–Fri attendance for ALL classes in one workbook. Reads the full
  // multi-class store (not just the current slice), so it lives here.
  const exportWeeklyAttendance = (weekDateISO: string) => {
    const hasPupils = store.classes.some(
      (c) => (store.data[c.id]?.pupils.length ?? 0) > 0
    );
    if (!hasPupils) {
      alert("No pupils to export.");
      return;
    }
    exportWeeklyAttendanceWorkbook(store.classes, store.data, weekDateISO).catch(
      (err) => {
        console.error("Weekly attendance export failed:", err);
        alert("Could not generate the attendance file.");
      }
    );
  };

  const enableSync = async (key: string): Promise<boolean> => {
    const cleanKey = key.trim().toUpperCase();
    if (!cleanKey) return false;
    
    setSyncStatus("saving");
    try {
      const cloudData = await loadFullStore(cleanKey);
      if (cloudData) {
        setStore((s) => ({
          ...s,
          classes: cloudData.classes,
          currentClassId: cloudData.currentClassId,
          data: cloudData.data,
          teacherId: cleanKey,
          lessonPlanUrl: cloudData.lessonPlanUrl ?? s.lessonPlanUrl ?? "",
          classAliases: cloudData.classAliases ?? s.classAliases ?? {},
          pbdSheetUrls: cloudData.pbdSheetUrls ?? s.pbdSheetUrls ?? {},
        }));
      } else {
        await saveMetadata(
          cleanKey,
          store.classes,
          store.currentClassId,
          store.lessonPlanUrl,
          store.classAliases,
          store.pbdSheetUrls
        );
        for (const c of store.classes) {
          const classData = store.data[c.id];
          if (classData) {
            await saveClassState(cleanKey, c.id, classData);
          }
        }
        setStore((s) => ({ ...s, teacherId: cleanKey }));
      }
      setSyncStatus("synced");
      return true;
    } catch (err) {
      console.error("Failed to enable sync:", err);
      setSyncStatus("error");
      return false;
    }
  };

  const disableSync = () => {
    setStore((s) => ({ ...s, teacherId: null }));
    setSyncStatus("synced");
  };

  const saveToCloud = async () => {
    if (!store.teacherId) return;
    setSyncStatus("saving");
    try {
      const teacherId = store.teacherId;
      const currentClassId = store.currentClassId;
      const curData = store.data[currentClassId];
      const classes = store.classes;

      if (curData) {
        await saveClassState(teacherId, currentClassId, curData);
      }
      await saveMetadata(
        teacherId,
        classes,
        currentClassId,
        store.lessonPlanUrl,
        store.classAliases,
        store.pbdSheetUrls
      );
      setSyncStatus("synced");
    } catch (err) {
      console.error("Manual cloud save failed:", err);
      setSyncStatus("error");
    }
  };

  const createSnapshot = async (name: string) => {
    if (!store.teacherId) return;
    const currentClassId = store.currentClassId;
    const currentClass = store.classes.find((c) => c.id === currentClassId);
    const className = currentClass ? currentClass.name : "Class";
    const curData = store.data[currentClassId];
    if (!curData) return;

    await saveHistoryRecord(
      store.teacherId,
      currentClassId,
      className,
      name,
      curData
    );
  };

  const getSnapshots = async () => {
    if (!store.teacherId) return [];
    try {
      return await fetchHistoryRecords(store.teacherId);
    } catch (err) {
      console.error("Error fetching snapshots:", err);
      return [];
    }
  };

  const restoreSnapshot = async (snapshot: any) => {
    const currentClassId = store.currentClassId;
    setStore((s) => {
      const nextData = { ...s.data };
      nextData[currentClassId] = {
        pupils: snapshot.pupils || [],
        assignments: snapshot.assignments || [],
        submissions: snapshot.submissions || {},
        attendance: snapshot.attendance || {},
        behavior: snapshot.behavior || [],
        watchList: snapshot.watchList || [],
        homeworkReminders: snapshot.homeworkReminders || [],
        calendarEvents: snapshot.calendarEvents || [],
        badges: snapshot.badges || [],
        remedialScores: snapshot.remedialScores || [],
      };
      return {
        ...s,
        data: nextData,
      };
    });
  };

  const deleteSnapshot = async (historyId: string) => {
    await deleteHistoryRecord(historyId);
  };

  const value: TrackerContextValue = {
    hydrated,
    cloudReconciled,
    teacherId: store.teacherId || null,
    syncStatus,
    classes: store.classes,
    currentClassId: cid,
    currentClassName,
    setCurrentClass,
    addClass,
    renameClass,
    removeClass,
    loadSampleData,
    syncRoster,
    lessonPlanUrl: store.lessonPlanUrl ?? "",
    lessonPlan: store.lessonPlan ?? null,
    classAliases: store.classAliases ?? {},
    setLessonPlanUrl,
    setLessonPlan,
    setClassAlias,
    getAbsenteeInfo,
    getClassPupils,
    lessonPlanSyncStatus,
    retryLessonPlanSync,
    pbdSheetUrl: store.pbdSheetUrls?.[cid] ?? "",
    setPbdSheetUrl,
    pbdSheetUrls: store.pbdSheetUrls ?? {},
    pupils: cur.pupils,
    assignments: cur.assignments,
    submissions: cur.submissions,
    attendance: cur.attendance,
    behavior: cur.behavior,
    watchList: cur.watchList ?? [],
    homeworkReminders: cur.homeworkReminders ?? [],
    calendarEvents: cur.calendarEvents ?? [],
    badges: cur.badges ?? [],
    remedialScores: cur.remedialScores ?? [],
    avatarFor,
    addPupils,
    removePupil,
    updatePupilNotes,
    addToWatch,
    removeFromWatch,
    addHomeworkReminder,
    removeHomeworkReminder,
    addCalendarEvent,
    updateCalendarEvent,
    removeCalendarEvent,
    addAssignment,
    removeAssignment,
    toggleSubmission,
    toggleAllForAssignment,
    setAttendance,
    markAllPresent,
    unmarkAll,
    addBehavior,
    addBehaviorToMany,
    removeBehavior,
    updateBehavior,
    awardBadge,
    removeBadge,
    addRemedialScore,
    updateRemedialScore,
    removeRemedialScore,
    undoLast,
    lastUndoLabel,
    getPupilScore,
    getPerformanceScore,
    exportToCSV,
    exportWeeklyAttendance,
    enableSync,
    disableSync,
    saveToCloud,
    createSnapshot,
    getSnapshots,
    restoreSnapshot,
    deleteSnapshot,
  };

  return (
    <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>
  );
}

export function useTracker() {
  const ctx = useContext(TrackerContext);
  if (!ctx) throw new Error("useTracker must be used within TrackerProvider");
  return ctx;
}
