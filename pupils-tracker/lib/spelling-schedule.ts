/**
 * Spelling & Dictation schedule
 * Source: docs/References/spelling and Dictation.xlsx
 *
 * Maps each class name → the JS weekday number (0 = Sun, 6 = Sat).
 */

export interface SpellingDay {
  className: string;
  /** JS Date.getDay() value: 0=Sun … 6=Sat */
  dayOfWeek: number;
  dayLabel: string;
}

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * Raw schedule from the spreadsheet:
 *   1B  → Monday
 *   2D  → Tuesday
 *   1E  → Tuesday
 *   2B  → Wednesday
 *   2F  → Friday
 */
export const SPELLING_SCHEDULE: SpellingDay[] = [
  { className: "1B", dayOfWeek: 1, dayLabel: "Monday" },
  { className: "2D", dayOfWeek: 2, dayLabel: "Tuesday" },
  { className: "1E", dayOfWeek: 2, dayLabel: "Tuesday" },
  { className: "2B", dayOfWeek: 3, dayLabel: "Wednesday" },
  { className: "2F", dayOfWeek: 5, dayLabel: "Friday" },
];

/** Quick lookup: className → SpellingDay */
export const SPELLING_BY_CLASS: Record<string, SpellingDay> = {};
SPELLING_SCHEDULE.forEach((s) => (SPELLING_BY_CLASS[s.className] = s));

/**
 * Returns a human-friendly status for the spelling/dictation day
 * relative to *today* (local time).
 *
 * Possible return values:
 *   "today"     – dictation is today
 *   "tomorrow"  – dictation is tomorrow (heads-up to prepare)
 *   null        – not scheduled / no special alert
 */
export function getSpellingStatus(
  className: string
): { status: "today" | "tomorrow"; dayLabel: string } | null {
  const entry = SPELLING_BY_CLASS[className];
  if (!entry) return null;

  const todayDow = new Date().getDay(); // 0-6
  if (entry.dayOfWeek === todayDow) {
    return { status: "today", dayLabel: entry.dayLabel };
  }
  // "tomorrow" means one calendar day ahead (wrapping Sat→Sun)
  const tomorrowDow = (todayDow + 1) % 7;
  if (entry.dayOfWeek === tomorrowDow) {
    return { status: "tomorrow", dayLabel: entry.dayLabel };
  }
  return null;
}

/** Returns the day label for the class, or null. */
export function getSpellingDayLabel(className: string): string | null {
  return SPELLING_BY_CLASS[className]?.dayLabel ?? null;
}
