"use client";

import React, {
  createContext,
  useContext,
  useEffect,
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

// Simple ID generator without needing crypto context
export const generateId = () => Math.random().toString(36).substring(2, 10);

export const todayISO = () => new Date().toISOString().split("T")[0];

// Bump this key when the seeded shape changes so stale local data is replaced.
const STORE_KEY = "pupil-tracker-v3";
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
}

function defaultAssignments(): Assignment[] {
  const t = todayISO();
  return [
    { id: generateId(), date: t, title: "Spelling" },
    { id: generateId(), date: t, title: "Dictation" },
    { id: generateId(), date: t, title: "Workbook" },
    { id: generateId(), date: t, title: "PBD" },
  ];
}

function emptyClassData(): ClassData {
  return {
    pupils: [],
    assignments: defaultAssignments(),
    submissions: {},
    attendance: {},
    behavior: [],
  };
}

// A class pre-filled with the exact roster from docs/References/namelist.xlsx
// (via lib/rosters.ts). Submissions/attendance/behavior start empty.
function rosterClassData(className: string): ClassData {
  const names = ROSTERS[className] ?? [];
  if (names.length === 0) return emptyClassData();
  return {
    pupils: names.map((name) => ({ id: generateId(), name })),
    assignments: defaultAssignments(),
    submissions: {},
    attendance: {},
    behavior: [],
  };
}

function freshStore(): StoreShape {
  const classes = DEFAULT_CLASS_NAMES.map((name) => ({ id: generateId(), name }));
  const data: Record<string, ClassData> = {};
  classes.forEach((c) => (data[c.id] = rosterClassData(c.name)));
  return { classes, currentClassId: classes[0].id, data };
}

function loadStore(): StoreShape {
  if (typeof window === "undefined") return freshStore();
  try {
    const saved = window.localStorage.getItem(STORE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as StoreShape;
      if (parsed?.classes?.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return freshStore();
}

interface TrackerContextValue {
  hydrated: boolean;

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
  exportToCSV: () => void;
}

const TrackerContext = createContext<TrackerContextValue | null>(null);

export function TrackerProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [store, setStore] = useState<StoreShape>(() => freshStore());

  useEffect(() => {
    setStore(loadStore());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }, [hydrated, store]);

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

  const value: TrackerContextValue = {
    hydrated,
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
    exportToCSV,
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
