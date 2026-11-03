import { describe, expect, it } from "vitest";
import {
  DEFAULT_REMINDER_SETTINGS,
  notificationId,
  planReminders,
  type ClassReminderData,
} from "@/lib/phone-reminders";
import type { SpellingDay } from "@/lib/spelling-schedule";

const empty: ClassReminderData = { nextSpelling: null, calendarEvents: [], homeworkReminders: [] };
// Monday 2 Nov 2026, 9:00 local.
const now = new Date(2026, 10, 2, 9, 0);

function plan(
  data: ClassReminderData | Partial<ClassReminderData>,
  schedule: SpellingDay[] = [],
  settings = DEFAULT_REMINDER_SETTINGS
) {
  return planReminders({
    now,
    classes: [{ id: "c1", name: "2B" }],
    dataFor: () => ({ ...empty, ...data }),
    schedule,
    settings,
  });
}

describe("planReminders", () => {
  it("nudges the evening before and the morning of a spelling sitting", () => {
    const out = plan({ nextSpelling: { date: "2026-11-04", type: "Spelling", number: "3" } });
    expect(out.map((n) => n.at)).toEqual([
      new Date(2026, 10, 3, 20, 0),
      new Date(2026, 10, 4, 7, 0),
    ]);
    expect(out[0].title).toBe("2B: Spelling 3");
    expect(out[0].body).toContain("tomorrow");
    expect(out[1].body).toContain("today");
  });

  it("drops times that have already passed (today's 7am)", () => {
    const out = plan({ nextSpelling: { date: "2026-11-02", type: "Dictation", number: "" } });
    expect(out).toHaveLength(0);
  });

  it("only schedules events in the next 14 days", () => {
    const out = plan({
      calendarEvents: [
        { id: "a", date: "2026-11-10", title: "Sports day" },
        { id: "b", date: "2026-12-25", title: "Too far" },
        { id: "c", date: "2026-10-01", title: "Past" },
      ],
    });
    expect(out.map((n) => n.title)).toEqual(["2B: Sports day", "2B: Sports day"]);
  });

  it("adds weekly spelling days without doubling an explicit sitting", () => {
    const out = plan(
      { nextSpelling: { date: "2026-11-04", type: "Spelling", number: "3" } },
      [{ className: "2B", dayOfWeek: 3, dayLabel: "Wednesday" }]
    );
    // Window is Mon 2 → Mon 16 Nov: Wed 4 (explicit sitting) and Wed 11 (weekly).
    expect(out.filter((n) => n.title === "2B: Spelling 3")).toHaveLength(2);
    expect(out.filter((n) => n.title === "2B: spelling/dictation day")).toHaveLength(2);
  });

  it("gives open homework one nudge next morning", () => {
    const out = plan({
      homeworkReminders: [{ id: "h1", type: "Workbook", info: "p. 12", createdDate: "2026-11-01" }],
    });
    expect(out).toEqual([
      expect.objectContaining({
        title: "2B: Workbook reminder",
        body: "p. 12",
        at: new Date(2026, 10, 3, 7, 0),
      }),
    ]);
  });

  it("respects switched-off types and custom times", () => {
    const events = { calendarEvents: [{ id: "a", date: "2026-11-05", title: "Trip" }] };
    expect(plan(events, [], { ...DEFAULT_REMINDER_SETTINGS, events: false })).toHaveLength(0);
    const out = plan(events, [], {
      ...DEFAULT_REMINDER_SETTINGS,
      eveningTime: "18:30",
      morningTime: "06:15",
    });
    expect(out.map((n) => n.at)).toEqual([
      new Date(2026, 10, 4, 18, 30),
      new Date(2026, 10, 5, 6, 15),
    ]);
  });
});

describe("notificationId", () => {
  it("is a stable positive int", () => {
    const id = notificationId("event:c1:a:2026-11-05:eve");
    expect(id).toBe(notificationId("event:c1:a:2026-11-05:eve"));
    expect(Number.isInteger(id) && id > 0 && id < 2 ** 31).toBe(true);
    expect(id).not.toBe(notificationId("event:c1:a:2026-11-05:morn"));
  });
});
