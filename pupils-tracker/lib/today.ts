import type { CalendarEvent, Class, HomeworkReminder, NextSpelling, Pupil } from "./types";
import type { SpellingDay } from "./spelling-schedule";

/**
 * The phone's "Today" screen: what needs attention across ALL classes (the
 * web Dashboard shows one class at a time). Pure — the caller passes "now"
 * and each class's data — so it's easy to test.
 *
 * Dates the teacher types (spelling sittings, calendar events) are compared
 * as local calendar days, the same way the phone reminders do.
 */

export type When = "today" | "tomorrow" | "later";

export interface TodayItem {
  classId: string;
  className: string;
  title: string;
  detail?: string;
  when: When;
  /** YYYY-MM-DD, for items on a specific day. */
  date?: string;
}

export interface WatchGroup {
  classId: string;
  className: string;
  names: string[];
}

export interface TodaySummary {
  spelling: TodayItem[];
  events: TodayItem[];
  homework: TodayItem[];
  watch: WatchGroup[];
  /** Total number of things listed, for the "all clear" state. */
  count: number;
}

export interface TodayClassData {
  pupils: Pupil[];
  nextSpelling: NextSpelling | null;
  calendarEvents: CalendarEvent[];
  homeworkReminders: HomeworkReminder[];
  watchList: string[];
}

/** How far ahead calendar events are listed. */
export const EVENT_DAYS = 7;

function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function buildToday(input: {
  now: Date;
  classes: Class[];
  dataFor: (classId: string) => TodayClassData | undefined;
  schedule: SpellingDay[];
}): TodaySummary {
  const { now, classes, dataFor, schedule } = input;
  const today = localISO(now);
  const tomorrow = localISO(addDays(now, 1));
  const lastEventDay = localISO(addDays(now, EVENT_DAYS));
  const whenOf = (iso: string): When =>
    iso === today ? "today" : iso === tomorrow ? "tomorrow" : "later";

  const spelling: TodayItem[] = [];
  const events: TodayItem[] = [];
  const homework: TodayItem[] = [];
  const watch: WatchGroup[] = [];

  for (const cls of classes) {
    const data = dataFor(cls.id);
    const base = { classId: cls.id, className: cls.name };

    // Spelling: the teacher-set sitting wins; otherwise the weekly timetable.
    const next = data?.nextSpelling;
    if (next && (next.date === today || next.date === tomorrow)) {
      spelling.push({
        ...base,
        title: `${next.type}${next.number ? ` ${next.number}` : ""}`,
        when: whenOf(next.date),
        date: next.date,
      });
    } else {
      const weekly = schedule.find((s) => s.className === cls.name);
      if (weekly) {
        const dow = now.getDay();
        const when: When | null =
          weekly.dayOfWeek === dow
            ? "today"
            : weekly.dayOfWeek === (dow + 1) % 7
              ? "tomorrow"
              : null;
        if (when) {
          spelling.push({
            ...base,
            title: "Spelling / dictation day",
            detail: `Every ${weekly.dayLabel}`,
            when,
            date: when === "today" ? today : tomorrow,
          });
        }
      }
    }

    for (const ev of data?.calendarEvents ?? []) {
      if (ev.date < today || ev.date > lastEventDay) continue;
      events.push({ ...base, title: ev.title, detail: ev.note || undefined, when: whenOf(ev.date), date: ev.date });
    }

    for (const hw of data?.homeworkReminders ?? []) {
      homework.push({ ...base, title: hw.type, detail: hw.info || undefined, when: "today" });
    }

    const byId = new Map((data?.pupils ?? []).map((p) => [p.id, p.name]));
    const names = (data?.watchList ?? [])
      .map((id) => byId.get(id))
      .filter((n): n is string => !!n);
    if (names.length) watch.push({ ...base, names });
  }

  const order: Record<When, number> = { today: 0, tomorrow: 1, later: 2 };
  spelling.sort((a, b) => order[a.when] - order[b.when]);
  events.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  return {
    spelling,
    events,
    homework,
    watch,
    count:
      spelling.length +
      events.length +
      homework.length +
      watch.reduce((n, g) => n + g.names.length, 0),
  };
}
