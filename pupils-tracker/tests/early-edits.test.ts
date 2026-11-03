import { describe, expect, it } from "vitest";
import { applyEarlyEdits, earlyEdits, hasEarlyEdits } from "@/lib/early-edits";
import type { Attendance, BehaviorRecord } from "@/lib/types";

const rec = (id: string, at: number, points = 1): BehaviorRecord => ({
  id,
  pupilId: `p-${id}`,
  date: "2026-11-03",
  type: "positive",
  points,
  note: "",
  at,
});
const slice = (behavior: BehaviorRecord[], attendance: Attendance = {}) => ({
  behavior,
  attendance,
});

describe("earlyEdits + applyEarlyEdits", () => {
  it("adds a point given while loading on top of newer cloud data", () => {
    const opened = slice([rec("a", 1)]);
    const now = slice([rec("new", 9), rec("a", 1)]);
    // The cloud already has a point from the board the phone never saw.
    const cloud = slice([rec("board", 5), rec("a", 1)]);
    const out = applyEarlyEdits(cloud, earlyEdits(opened, now));
    expect(out.behavior.map((r) => r.id)).toEqual(["new", "board", "a"]);
  });

  it("does not bring back records the cloud has dropped", () => {
    // "old" was deleted on another device; the phone's stale copy still has it
    // but the teacher didn't touch it, so it must stay deleted.
    const opened = slice([rec("old", 1)]);
    const now = slice([rec("new", 9), rec("old", 1)]);
    const out = applyEarlyEdits(slice([]), earlyEdits(opened, now));
    expect(out.behavior.map((r) => r.id)).toEqual(["new"]);
  });

  it("keeps an undo / edit made while loading", () => {
    const opened = slice([rec("a", 1), rec("b", 2)]);
    const now = slice([rec("b", 2, 3)]); // a undone, b edited to 3 points
    const out = applyEarlyEdits(
      slice([rec("a", 1), rec("b", 2), rec("c", 3)]),
      earlyEdits(opened, now)
    );
    expect(out.behavior.map((r) => [r.id, r.points])).toEqual([
      ["c", 1],
      ["b", 3],
    ]);
  });

  it("merges roll-call marks per pupil, keeping other devices' marks", () => {
    const opened = slice([], { "2026-11-03": { p1: "present", p2: "absent" } });
    const now = slice([], { "2026-11-03": { p1: "late", p3: "present" } });
    const cloud = slice([], {
      "2026-11-03": { p1: "present", p2: "absent", p4: "absent" },
      "2026-11-02": { p1: "present" },
    });
    const out = applyEarlyEdits(cloud, earlyEdits(opened, now));
    expect(out.attendance).toEqual({
      // p1 changed, p2 cleared, p3 added here; p4 came from another device.
      "2026-11-03": { p1: "late", p3: "present", p4: "absent" },
      "2026-11-02": { p1: "present" },
    });
  });

  it("returns cloud untouched when nothing was done while loading", () => {
    const same = slice([rec("a", 1)], { d: { p: "present" } });
    const e = earlyEdits(same, slice([rec("a", 1)], { d: { p: "present" } }));
    expect(hasEarlyEdits(e)).toBe(false);
    const cloud = slice([rec("z", 1)]);
    expect(applyEarlyEdits(cloud, e)).toBe(cloud);
  });
});
