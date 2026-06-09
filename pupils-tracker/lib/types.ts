export interface Class {
  id: string;
  name: string;
}

export interface Pupil {
  id: string;
  name: string;
  notes?: string;
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

export type Tab =
  | "dashboard"
  | "homework"
  | "attendance"
  | "behavior"
  | "students"
  | "analytics"
  | "rules"
  | "spelling"
  | "resources"
  | "rewards"
  | "calendar";
