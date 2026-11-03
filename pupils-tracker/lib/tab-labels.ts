import type { Tab } from "./types";

/** Human names for every top-level tab (web Shell + phone board remote). */
export const TAB_LABELS: Record<Tab, string> = {
  dashboard: "Dashboard",
  homework: "Homework",
  attendance: "Attendance",
  calendar: "Calendar",
  students: "Students",
  pets: "Pets",
  analytics: "Analytics",
  tutor: "Tutor",
  spelling: "Spelling",
  resources: "Resources",
  games: "Games",
  rules: "Rule Wheel",
  remedial: "Remedial",
};

export const TAB_OPTIONS = (Object.keys(TAB_LABELS) as Tab[]).map((id) => ({
  id,
  label: TAB_LABELS[id],
}));
