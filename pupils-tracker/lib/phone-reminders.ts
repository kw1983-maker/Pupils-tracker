import type { CalendarEvent, Class, HomeworkReminder, NextSpelling } from "./types";
import type { SpellingDay } from "./spelling-schedule";

/**
 * Turns the tracker's dated items into phone notifications (Android app,
 * Reminders tab). Pure: the caller passes "now" and the data, and schedules
 * whatever comes back — so it's easy to test and to re-run on every change.
 */

export interface ReminderSettings {
  spelling: boolean;
  events: boolean;
  homework: boolean;
  /** "HH:MM" — the evening-before nudge. */
  eveningTime: string;
  /** "HH:MM" — the on-the-day nudge. */
  morningTime: string;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  spelling: true,
  events: true,
  homework: true,
  eveningTime: "20:00",
  morningTime: "07:00",
};

export interface ClassReminderData {
  nextSpelling: NextSpelling | null;
  calendarEvents: CalendarEvent[];
  homeworkReminders: HomeworkReminder[];
}

export interface PlannedNotification {
  id: number;
  title: string;
  body: string;
  at: Date;
}

/** How far ahead reminders are scheduled (re-planned every time the app opens). */
export const WINDOW_DAYS = 14;

/** "2026-11-04" → local midnight on that day (not UTC). */
function localDay(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function at(day: Date, hhmm: string, dayOffset = 0): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate() + dayOffset,
    Number.isFinite(h) ? h : 0,
    Number.isFinite(m) ? m : 0
  );
}

/** Stable positive 31-bit id from a key, as Android notification ids must be ints. */
export function notificationId(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 1 || 1;
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function planReminders(input: {
  now: Date;
  classes: Class[];
  dataFor: (classId: string) => ClassReminderData | undefined;
  schedule: SpellingDay[];
  settings: ReminderSettings;
}): PlannedNotification[] {
  const { now, classes, dataFor, schedule, settings } = input;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + WINDOW_DAYS);
  const inWindow = (d: Date) => d >= today && d <= lastDay;
  const out: PlannedNotification[] = [];

  // Evening-before and morning-of pair for one dated item.
  const pair = (
    key: string,
    day: Date,
    title: string,
    eveningBody: string,
    morningBody: string
  ) => {
    out.push({
      id: notificationId(`${key}:eve`),
      title,
      body: eveningBody,
      at: at(day, settings.eveningTime, -1),
    });
    out.push({
      id: notificationId(`${key}:morn`),
      title,
      body: morningBody,
      at: at(day, settings.morningTime),
    });
  };

  for (const cls of classes) {
    const data = dataFor(cls.id);

    if (settings.spelling) {
      // Days already covered by an explicit "next spelling" so the weekly
      // schedule doesn't add a duplicate for the same class and day.
      const covered = new Set<string>();
      const next = data?.nextSpelling;
      const nextDay = next ? localDay(next.date) : null;
      if (next && nextDay && inWindow(nextDay)) {
        covered.add(next.date);
        const what = `${next.type}${next.number ? ` ${next.number}` : ""}`;
        pair(
          `spell:${cls.id}:${next.date}`,
          nextDay,
          `${cls.name}: ${what}`,
          `${what} for ${cls.name} is tomorrow.`,
          `${what} for ${cls.name} is today.`
        );
      }
      for (const s of schedule.filter((x) => x.className === cls.name)) {
        for (let d = 0; d <= WINDOW_DAYS; d++) {
          const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d);
          if (day.getDay() !== s.dayOfWeek || covered.has(isoOf(day))) continue;
          pair(
            `spellweek:${cls.id}:${isoOf(day)}`,
            day,
            `${cls.name}: spelling/dictation day`,
            `${cls.name} has spelling/dictation tomorrow (${s.dayLabel}).`,
            `${cls.name} has spelling/dictation today.`
          );
        }
      }
    }

    if (settings.events) {
      for (const ev of data?.calendarEvents ?? []) {
        const day = localDay(ev.date);
        if (!day || !inWindow(day)) continue;
        const detail = ev.note ? ` — ${ev.note}` : "";
        pair(
          `event:${cls.id}:${ev.id}:${ev.date}`,
          day,
          `${cls.name}: ${ev.title}`,
          `Tomorrow (${WEEKDAY[day.getDay()]})${detail}`,
          `Today${detail}`
        );
      }
    }

    if (settings.homework) {
      // Open homework reminders have no due date: one nudge, next morning.
      const nextMorning = at(today, settings.morningTime, 1);
      for (const hw of data?.homeworkReminders ?? []) {
        out.push({
          id: notificationId(`hw:${cls.id}:${hw.id}`),
          title: `${cls.name}: ${hw.type} reminder`,
          body: hw.info ? hw.info : `${hw.type} is still on the "Needs attention" list.`,
          at: nextMorning,
        });
      }
    }
  }

  return out
    .filter((n) => n.at.getTime() > now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}
