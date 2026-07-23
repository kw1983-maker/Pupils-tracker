export interface Class {
  id: string;
  name: string;
}

export interface Pupil {
  id: string;
  name: string;
  notes?: string;
  // The pupil's class pet (Pets tab). Optional so existing rosters upgrade
  // silently — a pupil with no pet yet is offered one in the UI. EXP is NOT
  // stored here: it's derived from the pupil's positive-behaviour points (see
  // lib/store.tsx getPupilExp and lib/pets.ts). Only the cosmetic choices live
  // on the record, and they ride the existing Firebase sync for free.
  pet?: PetState;
}

// The cosmetic state of a pupil's pet. `species` maps to a PET_SPECIES id in
// lib/pets.ts; `name` is the teacher/pupil-given pet name; `accessories` is a
// reserved list of unlocked cosmetic ids (dress-up), unused for now.
export interface PetState {
  species: string;
  name?: string;
  accessories?: string[];
}

export interface Assignment {
  id: string;
  date: string;
  title: string;
}

// Stores submissions mapping: assignmentId -> pupilId -> boolean
export type Submissions = Record<string, Record<string, boolean>>;

export type AttendanceStatus = "present" | "absent" | "late";

// date (YYYY-MM-DD) -> pupilId -> status
export type Attendance = Record<string, Record<string, AttendanceStatus>>;

export type BehaviorType = "positive" | "negative";

export interface BehaviorRecord {
  id: string;
  pupilId: string;
  date: string;
  type: BehaviorType;
  points: number;
  note: string;
}

// A lightweight, class-wide homework reminder shown flashing in the Dashboard
// "Needs attention" section until the teacher deletes it. Separate from the
// per-pupil assignment/submission tracking.
export interface HomeworkReminder {
  id: string;
  type: string; // one of HOMEWORK_TYPES (Spelling | Dictation | Workbook | PBD)
  info: string; // extra info free text (optional, may be "")
  createdDate: string; // YYYY-MM-DD (date of creation)
}

// A dated calendar event the teacher creates in the Calendar tab. Events whose
// date is today or upcoming surface in the Dashboard "Needs attention" section
// until they pass or the teacher deletes them.
export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  note?: string; // optional free-text detail
}

// A digital badge the teacher awards to a pupil (Star Reader, Speaking Champion…).
// `badgeId` references a BadgeDef in the fixed catalog (lib/badges.ts). A pupil may
// earn the same badge more than once — each award is its own record.
export interface BadgeAward {
  id: string;
  pupilId: string;
  badgeId: string;
  date: string; // YYYY-MM-DD
  note?: string; // optional teacher note ("for finishing the reading log")
}

// One recorded play of a Remedial-tab activity by a remedial pupil (band 1/2).
// Kept per-class alongside the band data. Every play is its own record so the
// Remedial progress panel can show a pupil's score history over time.
export interface RemedialScore {
  id: string;
  pupilName: string; // matches the PBD_BI record name (UPPERCASE full name)
  activityId: string; // e.g. "toy-words"
  activityTitle: string;
  score: number; // stars/points reported by the activity
  playedAt: string; // ISO date-time
}

export interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number; // 0–3
  explanation: string;
}

export type Tab =
  | "dashboard"
  | "homework"
  | "attendance"
  | "students"
  | "pets"
  | "analytics"
  | "rules"
  | "spelling"
  | "resources"
  | "games"
  | "calendar"
  | "tutor"
  | "remedial";

// A teacher-saved lesson material: a Google Drive / Slides / YouTube link the
// teacher can open with one tap on the Spelling/Dictation board (Resources tab).
// Teacher-wide (not per-class); synced to Firestore like pbdSheetUrls.
export interface LessonMaterial {
  id: string;
  title: string;
  url: string; // Google Drive / Slides / YouTube link
}
