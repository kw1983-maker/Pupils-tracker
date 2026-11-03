import { describe, expect, it } from "vitest";
import { buildToday, type TodayClassData } from "@/lib/today";
import type { SpellingDay } from "@/lib/spelling-schedule";

// Tuesday 3 Nov 2026, 7:30 local.
const now = new Date(2026, 10, 3, 7, 30);
const empty: TodayClassData = {
  pupils: [],
  nextSpelling: null,
  calendarEvents: [],
  homeworkReminders: [],
  watchList: [],
};
const schedule: SpellingDay[] = [
  { className: "2D", dayOfWeek: 2, dayLabel: "Tuesday" },
  { className: "2B", dayOfWeek: 3, dayLabel: "Wednesday" },
  { className: "2F", dayOfWeek: 5, dayLabel: "Friday" },
];

function run(data: Record<string, Partial<TodayClassData>>) {
  return buildToday({
    now,
    classes: Object.keys(data).map((name) => ({ id: `id-${name}`, name })),
    dataFor: (id) => ({ ...empty, ...data[id.slice(3)] }),
    schedule,
  });
}

describe("buildToday", () => {
  it("lists weekly spelling days for today and tomorrow across classes", () => {
    const out = run({ "2D": {}, "2B": {}, "2F": {} });
    expect(out.spelling.map((s) => [s.className, s.when])).toEqual([
      ["2D", "today"],
      ["2B", "tomorrow"],
    ]);
  });

  it("prefers the teacher-set sitting over the weekly day", () => {
    const out = run({ "2D": { nextSpelling: { date: "2026-11-03", type: "Dictation", number: "4" } } });
    expect(out.spelling).toEqual([
      expect.objectContaining({ className: "2D", title: "Dictation 4", when: "today" }),
    ]);
  });

  it("shows calendar events from today to a week ahead, soonest first", () => {
    const out = run({
      "1E": {
        calendarEvents: [
          { id: "c", date: "2026-11-09", title: "Assembly" },
          { id: "a", date: "2026-11-03", title: "Sports practice", note: "Field" },
          { id: "b", date: "2026-11-02", title: "Yesterday" },
          { id: "d", date: "2026-11-20", title: "Too far" },
        ],
      },
    });
    expect(out.events.map((e) => [e.title, e.when])).toEqual([
      ["Sports practice", "today"],
      ["Assembly", "later"],
    ]);
    expect(out.events[0].detail).toBe("Field");
  });

  it("collects open homework reminders and watch-list names from every class", () => {
    const out = run({
      "1B": {
        pupils: [
          { id: "p1", name: "Ali" },
          { id: "p2", name: "Mei" },
        ],
        watchList: ["p2", "gone"],
        homeworkReminders: [{ id: "h", type: "Workbook", info: "p. 12", createdDate: "2026-11-01" }],
      },
      "1E": { homeworkReminders: [{ id: "h2", type: "PBD", info: "", createdDate: "2026-11-02" }] },
    });
    expect(out.homework.map((h) => [h.className, h.title, h.detail])).toEqual([
      ["1B", "Workbook", "p. 12"],
      ["1E", "PBD", undefined],
    ]);
    expect(out.watch).toEqual([{ classId: "id-1B", className: "1B", names: ["Mei"] }]);
    expect(out.count).toBe(3);
  });

  it("is all clear when nothing needs attention", () => {
    expect(run({ "1B": {} }).count).toBe(0);
  });
});
