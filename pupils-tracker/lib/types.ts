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

export type Tab =
  | "dashboard"
  | "homework"
  | "attendance"
  | "behavior"
  | "students"
  | "analytics";
