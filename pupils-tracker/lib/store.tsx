"use client";

import React, {
  createContext,
  useContext,
  useEffect,
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
} from "./types";
import { ROSTERS } from "./rosters";
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

// Bump this key when the seeded shape changes so stale local data is replaced.
const STORE_KEY = "pupil-tracker-v4";
// Performance score: every pupil starts at PERFORMANCE_BASE and moves by
// PERFORMANCE_STEP for each behavior entry (± per entry, points field ignored)
// and each missed recorded homework.
const PERFORMANCE_BASE = 80;
const PERFORMANCE_STEP = 2;
// Class order matches the sheets in docs/References/namelist.xlsx (see lib/rosters.ts).
const DEFAULT_CLASS_NAMES = ["2B", "2D", "2F", "1B", "1E"];

interface ClassData {
  pupils: Pupil[];
  assignments: Assignment[];
  submissions: Submissions;
  attendance: Attendance;
  behavior: BehaviorRecord[];
}

interface StoreShape {
  classes: Class[];
  currentClassId: string;
  data: Record<string, ClassData>;
  teacherId?: string | null;
}

function emptyClassData(): ClassData {
  // Start blank: no assignment columns until the teacher adds them.
  return {
    pupils: [],
    assignments: [],
    submissions: {},
    attendance: {},
    behavior: [],
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
  };
}

function generateRandomTeacherKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `TCHR-${part1}-${part2}`;
}

function freshStore(): StoreShape {
  const classes = DEFAULT_CLASS_NAMES.map((name) => ({ id: generateId(), name }));
  const data: Record<string, ClassData> = {};
  classes.forEach((c) => (data[c.id] = rosterClassData(c.name)));
  return { classes, currentClassId: classes[0].id, data, teacherId: null };
}

function loadStore(): StoreShape {
  if (typeof window === "undefined") return freshStore();
  try {
    const saved = window.localStorage.getItem(STORE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as StoreShape;
      if (parsed?.classes?.length) {
        return {
          ...parsed,
          teacherId: parsed.teacherId || generateRandomTeacherKey(),
        };
      }
    }
  } catch {
    /* ignore */
  }
  const fresh = freshStore();
  fresh.teacherId = generateRandomTeacherKey();
  return fresh;
}

interface TrackerContextValue {
  hydrated: boolean;
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

  // current-class data (same shape the pages already consume)
  pupils: Pupil[];
  assignments: Assignment[];
  submissions: Submissions;
  attendance: Attendance;
  behavior: BehaviorRecord[];

  // pupils
  addPupils: (names: string[]) => void;
  removePupil: (pupilId: string) => void;
  updatePupilNotes: (pupilId: string, notes: string) => void;

  // assignments
  addAssignment: (date: string, title: string) => void;
  removeAssignment: (assignmentId: string) => void;

  // submissions
  toggleSubmission: (assignmentId: string, pupilId: string) => void;
  toggleAllForAssignment: (assignmentId: string) => void;

  // attendance
  setAttendance: (date: string, pupilId: string, status: AttendanceStatus) => void;
  markAllPresent: (date: string) => void;

  // behavior
  addBehavior: (
    pupilId: string,
    type: BehaviorType,
    points: number,
    note: string
  ) => void;
  removeBehavior: (id: string) => void;

  // derived helpers
  getPupilScore: (pupilId: string) => { score: number; total: number };
  getPerformanceScore: (pupilId: string) => {
    score: number;
    missed: number;
    positives: number;
    negatives: number;
  };
  exportToCSV: () => void;

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
  const [hydrated, setHydrated] = useState(false);
  const [store, setStore] = useState<StoreShape>(() => freshStore());
  const [syncStatus, setSyncStatus] = useState<"synced" | "saving" | "offline" | "error">("synced");
  // Gates the auto-sync effect: stays false until the initial cloud reconciliation
  // finishes, so local data can't overwrite newer cloud data on first load.
  const cloudReady = useRef(false);

  useEffect(() => {
    const local = loadStore();
    // Paint from localStorage immediately — first render must never block on the
    // network (an unreachable/slow Firestore would otherwise hang on "Loading…").
    setStore(local);
    setHydrated(true);

    if (!local.teacherId) {
      cloudReady.current = true;
      return;
    }

    const key = local.teacherId;
    let cancelled = false;

    (async () => {
      setSyncStatus("saving");
      try {
        const cloudData = await loadFullStore(key);
        if (cancelled) return;
        if (cloudData) {
          setStore({
            classes: cloudData.classes,
            currentClassId: cloudData.currentClassId,
            data: cloudData.data,
            teacherId: key,
          });
        } else {
          // Key doesn't exist on the server yet — push local up to seed it.
          await saveMetadata(key, local.classes, local.currentClassId);
          for (const c of local.classes) {
            if (local.data[c.id]) {
              await saveClassState(key, c.id, local.data[c.id]);
            }
          }
        }
        if (!cancelled) setSyncStatus("synced");
      } catch (err) {
        console.error("Failed to automatically load from cloud:", err);
        if (!cancelled) setSyncStatus("error");
      } finally {
        cloudReady.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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

    setSyncStatus("saving");

    const timer = setTimeout(async () => {
      try {
        if (curData) {
          await saveClassState(teacherId, currentClassId, curData);
        }
        await saveMetadata(teacherId, classes, currentClassId);
        setSyncStatus("synced");
      } catch (err) {
        console.error("Firestore sync error:", err);
        setSyncStatus("error");
      }
    }, 1000); // 1-second debounce to prevent write spamming

    return () => clearTimeout(timer);
  }, [hydrated, store.classes, store.currentClassId, store.data, store.teacherId]);

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

  // Update the current class's data slice immutably.
  const updateCur = (fn: (d: ClassData) => ClassData) => {
    setStore((s) => ({
      ...s,
      data: { ...s.data, [s.currentClassId]: fn(s.data[s.currentClassId]) },
    }));
  };

  // ---- classes ----
  const setCurrentClass = (id: string) =>
    setStore((s) => ({ ...s, currentClassId: id }));

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
    updateCur((d) => ({ ...d, pupils: d.pupils.filter((p) => p.id !== pupilId) }));

  const updatePupilNotes = (pupilId: string, notes: string) =>
    updateCur((d) => ({
      ...d,
      pupils: d.pupils.map((p) => (p.id === pupilId ? { ...p, notes } : p)),
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

  // ---- behavior ----
  const addBehavior = (
    pupilId: string,
    type: BehaviorType,
    points: number,
    note: string
  ) =>
    updateCur((d) => ({
      ...d,
      behavior: [
        {
          id: generateId(),
          pupilId,
          date: todayISO(),
          type,
          points,
          note: note.trim(),
        },
        ...d.behavior,
      ],
    }));

  const removeBehavior = (id: string) =>
    updateCur((d) => ({ ...d, behavior: d.behavior.filter((b) => b.id !== id) }));

  // ---- derived ----
  const getPupilScore = (pupilId: string) => {
    if (cur.assignments.length === 0) return { score: 0, total: 0 };
    const score = cur.assignments.filter(
      (a) => !!cur.submissions[a.id]?.[pupilId]
    ).length;
    return { score, total: cur.assignments.length };
  };

  // All-time performance score: base 80, ±2 per behavior entry, −2 per missed
  // recorded homework. Only assignments the teacher has started recording (at
  // least one pupil ticked) count toward "missed".
  const getPerformanceScore = (pupilId: string) => {
    const markedIds = cur.assignments
      .filter((a) => cur.pupils.some((p) => cur.submissions[a.id]?.[p.id]))
      .map((a) => a.id);
    const missed = markedIds.filter((id) => !cur.submissions[id]?.[pupilId]).length;
    const recs = cur.behavior.filter((b) => b.pupilId === pupilId);
    const positives = recs.filter((b) => b.type === "positive").length;
    const negatives = recs.filter((b) => b.type === "negative").length;
    const score =
      PERFORMANCE_BASE +
      PERFORMANCE_STEP * (positives - negatives) -
      PERFORMANCE_STEP * missed;
    return { score, missed, positives, negatives };
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

  const enableSync = async (key: string): Promise<boolean> => {
    const cleanKey = key.trim().toUpperCase();
    if (!cleanKey) return false;
    
    setSyncStatus("saving");
    try {
      const cloudData = await loadFullStore(cleanKey);
      if (cloudData) {
        setStore({
          classes: cloudData.classes,
          currentClassId: cloudData.currentClassId,
          data: cloudData.data,
          teacherId: cleanKey,
        });
      } else {
        await saveMetadata(cleanKey, store.classes, store.currentClassId);
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
      await saveMetadata(teacherId, classes, currentClassId);
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
    pupils: cur.pupils,
    assignments: cur.assignments,
    submissions: cur.submissions,
    attendance: cur.attendance,
    behavior: cur.behavior,
    addPupils,
    removePupil,
    updatePupilNotes,
    addAssignment,
    removeAssignment,
    toggleSubmission,
    toggleAllForAssignment,
    setAttendance,
    markAllPresent,
    addBehavior,
    removeBehavior,
    getPupilScore,
    getPerformanceScore,
    exportToCSV,
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
