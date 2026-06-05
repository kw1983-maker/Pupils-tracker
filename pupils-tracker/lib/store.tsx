"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  Pupil,
  Assignment,
  Submissions,
  Attendance,
  AttendanceStatus,
  BehaviorRecord,
  BehaviorType,
} from "./types";

// Simple ID generator without needing crypto context
export const generateId = () => Math.random().toString(36).substring(2, 10);

export const todayISO = () => new Date().toISOString().split("T")[0];

const KEYS = {
  pupils: "pupil-tracker-pupils",
  assignments: "pupil-tracker-assignments",
  submissions: "pupil-tracker-submissions",
  attendance: "pupil-tracker-attendance",
  behavior: "pupil-tracker-behavior",
};

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function defaultAssignments(): Assignment[] {
  const today = todayISO();
  return [
    { id: generateId(), date: today, title: "Spelling" },
    { id: generateId(), date: today, title: "Dictation" },
    { id: generateId(), date: today, title: "Workbook" },
    { id: generateId(), date: today, title: "PBD" },
  ];
}

interface TrackerContextValue {
  hydrated: boolean;
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
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submissions>({});
  const [attendance, setAttendance] = useState<Attendance>({});
  const [behavior, setBehavior] = useState<BehaviorRecord[]>([]);

  // Hydrate from localStorage on mount (client only) to avoid SSR mismatch.
  useEffect(() => {
    setPupils(load<Pupil[]>(KEYS.pupils, []));
    const savedAssignments = load<Assignment[]>(KEYS.assignments, []);
    setAssignments(savedAssignments.length > 0 ? savedAssignments : defaultAssignments());
    setSubmissions(load<Submissions>(KEYS.submissions, {}));
    setAttendance(load<Attendance>(KEYS.attendance, {}));
    setBehavior(load<BehaviorRecord[]>(KEYS.behavior, []));
    setHydrated(true);
  }, []);

  // Persist whenever data changes (only after hydration).
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEYS.pupils, JSON.stringify(pupils));
    localStorage.setItem(KEYS.assignments, JSON.stringify(assignments));
    localStorage.setItem(KEYS.submissions, JSON.stringify(submissions));
    localStorage.setItem(KEYS.attendance, JSON.stringify(attendance));
    localStorage.setItem(KEYS.behavior, JSON.stringify(behavior));
  }, [hydrated, pupils, assignments, submissions, attendance, behavior]);

  const addPupils = (names: string[]) => {
    const existing = new Set(pupils.map((p) => p.name.toLowerCase()));
    const toAdd = names
      .map((n) => n.trim())
      .filter((n) => n.length > 0 && !existing.has(n.toLowerCase()))
      .map((name) => ({ id: generateId(), name }));
    if (toAdd.length > 0) setPupils((prev) => [...prev, ...toAdd]);
  };

  const removePupil = (pupilId: string) => {
    setPupils((p) => p.filter((x) => x.id !== pupilId));
  };

  const updatePupilNotes = (pupilId: string, notes: string) => {
    setPupils((prev) =>
      prev.map((p) => (p.id === pupilId ? { ...p, notes } : p))
    );
  };

  const addAssignment = (date: string, title: string) => {
    if (!date || !title.trim()) return;
    setAssignments((prev) => [
      ...prev,
      { id: generateId(), date, title: title.trim() },
    ]);
  };

  const removeAssignment = (assignmentId: string) => {
    setAssignments((a) => a.filter((x) => x.id !== assignmentId));
    setSubmissions((s) => {
      const next = { ...s };
      delete next[assignmentId];
      return next;
    });
  };

  const toggleSubmission = (assignmentId: string, pupilId: string) => {
    setSubmissions((prev) => {
      const subs = prev[assignmentId] || {};
      return {
        ...prev,
        [assignmentId]: { ...subs, [pupilId]: !subs[pupilId] },
      };
    });
  };

  const toggleAllForAssignment = (assignmentId: string) => {
    setSubmissions((prev) => {
      const subs = prev[assignmentId] || {};
      const allChecked =
        pupils.length > 0 && pupils.every((p) => !!subs[p.id]);
      const next = { ...subs };
      pupils.forEach((p) => {
        next[p.id] = !allChecked;
      });
      return { ...prev, [assignmentId]: next };
    });
  };

  const setAttendanceStatus = (
    date: string,
    pupilId: string,
    status: AttendanceStatus
  ) => {
    setAttendance((prev) => ({
      ...prev,
      [date]: { ...(prev[date] || {}), [pupilId]: status },
    }));
  };

  const markAllPresent = (date: string) => {
    setAttendance((prev) => {
      const day = { ...(prev[date] || {}) };
      pupils.forEach((p) => {
        day[p.id] = "present";
      });
      return { ...prev, [date]: day };
    });
  };

  const addBehavior = (
    pupilId: string,
    type: BehaviorType,
    points: number,
    note: string
  ) => {
    setBehavior((prev) => [
      {
        id: generateId(),
        pupilId,
        date: todayISO(),
        type,
        points,
        note: note.trim(),
      },
      ...prev,
    ]);
  };

  const removeBehavior = (id: string) => {
    setBehavior((prev) => prev.filter((b) => b.id !== id));
  };

  const getPupilScore = (pupilId: string) => {
    if (assignments.length === 0) return { score: 0, total: 0 };
    const score = assignments.filter(
      (a) => !!submissions[a.id]?.[pupilId]
    ).length;
    return { score, total: assignments.length };
  };

  const exportToCSV = () => {
    if (pupils.length === 0) {
      alert("No data to export.");
      return;
    }
    const headers = [
      "Pupil Name",
      ...assignments.map((a) => `${a.title} (${a.date})`),
      "Total Score",
    ];
    const rows = [headers.map((h) => `"${h}"`).join(",")];
    pupils.forEach((pupil) => {
      const { score, total } = getPupilScore(pupil.id);
      rows.push(
        [
          `"${pupil.name}"`,
          ...assignments.map((a) =>
            submissions[a.id]?.[pupil.id] ? '"Checked"' : '"-"'
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
    link.setAttribute("download", `ClassTrack_Report_${todayISO()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const value: TrackerContextValue = {
    hydrated,
    pupils,
    assignments,
    submissions,
    attendance,
    behavior,
    addPupils,
    removePupil,
    updatePupilNotes,
    addAssignment,
    removeAssignment,
    toggleSubmission,
    toggleAllForAssignment,
    setAttendance: setAttendanceStatus,
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
