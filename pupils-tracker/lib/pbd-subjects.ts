// PBD Rekod sheets are per-class and per-subject. BI stays on pbdSheetUrls;
// PJ (Pendidikan Jasmani) uses pbdPjSheetUrls. Lesson-plan subject text decides
// which sheet auto-fill / week-fill write to.

export type PbdSubject = "BI" | "PJ";

export const PBD_SUBJECTS: { id: PbdSubject; label: string }[] = [
  { id: "BI", label: "BI (English)" },
  { id: "PJ", label: "PJ (Physical Education)" },
];

/** Default PJ Rekod links seeded by class name when the teacher hasn't saved one. */
export const DEFAULT_PBD_PJ_BY_CLASS_NAME: Record<string, string> = {
  "2B":
    "https://docs.google.com/spreadsheets/d/1pSBhXkPeZLgga1JZTO7e3QkuPgdNy9yShiIfFt2o8-o/edit?usp=sharing",
};

// Same PE hint as lib/class-totals.ts — keep in sync if that regex grows.
const PE_SUBJECT = /体育|jasmani|physical|\bPE\b|\bPJK?\b/i;

/** True when a lesson-plan block's subject is Pendidikan Jasmani / PE. */
export function isPjSubject(subject: string): boolean {
  return PE_SUBJECT.test(subject || "");
}

export function pbdSubjectForLesson(subject: string): PbdSubject {
  return isPjSubject(subject) ? "PJ" : "BI";
}

/** Learning-standard codes look like "1.2.1" or "3.1.1" (one or more dotted digits). */
export function looksLikeStandardCode(code: string): boolean {
  return /^\d+(\.\d+)+$/.test(code.trim());
}

/** True when the spreadsheet's tab list matches the PJ Rekod template. */
export function isPjRekodTabs(tabTitles: string[]): boolean {
  const lower = new Set(tabTitles.map((t) => t.trim().toLowerCase()));
  return lower.has("kemahiran1") || lower.has("kecergasan");
}
