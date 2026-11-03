import { describe, expect, it } from "vitest";
import { diffClass, newRemoteRecords } from "@/lib/class-sync";
import type { ClassData } from "@/lib/store";
import type { BehaviorRecord } from "@/lib/types";

const rec = (id: string): BehaviorRecord => ({
  id,
  pupilId: "p1",
  date: "2026-11-03",
  type: "positive",
  points: 2,
  note: "",
  at: 1,
});

function classData(behavior: BehaviorRecord[], extra: Partial<ClassData> = {}): ClassData {
  return {
    pupils: [],
    assignments: [],
    submissions: {},
    attendance: {},
    behavior,
    watchList: [],
    homeworkReminders: [],
    calendarEvents: [],
    badges: [],
    remedialScores: [],
    ...extra,
  } as unknown as ClassData;
}

describe("spotting points awarded on another device", () => {
  it("returns records neither this device nor its last cloud copy has", () => {
    const local = classData([rec("a")]);
    const synced = classData([rec("a")]);
    const cloud = [rec("b"), rec("a")];
    expect(newRemoteRecords(cloud, local, synced, new Set()).map((r) => r.id)).toEqual(["b"]);
  });

  it("ignores this device's own awards echoed back", () => {
    const local = classData([rec("mine"), rec("a")]);
    const synced = classData([rec("a")]);
    expect(newRemoteRecords([rec("mine"), rec("a")], local, synced, new Set())).toEqual([]);
  });

  it("does not mistake a local undo that hasn't synced yet for a new award", () => {
    // Undone here, but the cloud (and the last copy this device saw) still has it.
    const local = classData([]);
    const synced = classData([rec("undone")]);
    expect(newRemoteRecords([rec("undone")], local, synced, new Set())).toEqual([]);
  });

  it("skips records already announced from an earlier snapshot", () => {
    const local = classData([]);
    const synced = classData([]);
    expect(newRemoteRecords([rec("b")], local, synced, new Set(["b"]))).toEqual([]);
  });

  it("announces nothing before this device has the class", () => {
    expect(newRemoteRecords([rec("b")], undefined, undefined, new Set())).toEqual([]);
  });
});

describe("diffing a class for upload", () => {
  it("skips fields that are the same object", () => {
    const attendance = { "2026-11-03": { p1: "present" } };
    const prev = classData([rec("a")], { attendance } as Partial<ClassData>);
    const next = { ...prev, behavior: [rec("b"), rec("a")] };
    const d = diffClass(prev, next);
    expect(d.fields).toEqual({});
    expect(d.added.map((r) => r.id)).toEqual(["b"]);
  });

  it("still sends a field that was replaced with equal-looking but different data", () => {
    const prev = classData([], {
      attendance: { "2026-11-03": { p1: "present" } },
    } as Partial<ClassData>);
    const next = classData([], {
      attendance: { "2026-11-03": { p1: "absent" } },
    } as Partial<ClassData>);
    expect(diffClass(prev, next).fields).toEqual({
      attendance: { "2026-11-03": { p1: "absent" } },
    });
  });

  it("treats a rebuilt but identical field as unchanged", () => {
    const prev = classData([], { attendance: { d: { p1: "late" } } } as Partial<ClassData>);
    const next = classData([], { attendance: { d: { p1: "late" } } } as Partial<ClassData>);
    expect(diffClass(prev, next).fields).toEqual({});
  });
});
