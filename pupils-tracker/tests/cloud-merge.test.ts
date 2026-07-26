import { describe, expect, it } from "vitest";
import { mergeCloudClassData } from "@/lib/store";
import type { Pupil, PetPurchase } from "@/lib/types";

// A class document as Firestore hands it back, with only the bits these rules
// touch filled in.
function classData(pupils: Pupil[], petPurchases?: PetPurchase[]) {
  const base = {
    pupils,
    assignments: [],
    submissions: {},
    attendance: {},
    behavior: [],
    watchList: [],
    homeworkReminders: [],
    calendarEvents: [],
    badges: [],
    remedialScores: [],
  };
  return (petPurchases === undefined
    ? base
    : { ...base, petPurchases }) as unknown as Parameters<
    typeof mergeCloudClassData
  >[0];
}

const buy: PetPurchase = {
  id: "buy1",
  pupilId: "p1",
  powerId: "fire",
  cost: 20,
  date: "2026-07-01",
};

describe("folding a cloud class document over local data", () => {
  it("keeps a pupil's unlocked pets when the cloud doc predates the field", () => {
    // The bug: a document written before locked species existed has no
    // unlockedSpecies at all, and used to overwrite the local pupil outright —
    // re-locking a pet the child had already answered five questions for.
    const merged = mergeCloudClassData(
      classData([{ id: "p1", name: "Aiman" }], []),
      classData([{ id: "p1", name: "Aiman", unlockedSpecies: ["robot"] }], [])
    );
    expect(merged.pupils[0].unlockedSpecies).toEqual(["robot"]);
  });

  it("lets a genuine reset on another device win", () => {
    // An explicit empty array is a decision, not a gap.
    const merged = mergeCloudClassData(
      classData([{ id: "p1", name: "Aiman", unlockedSpecies: [] }], []),
      classData([{ id: "p1", name: "Aiman", unlockedSpecies: ["robot"] }], [])
    );
    expect(merged.pupils[0].unlockedSpecies).toEqual([]);
  });

  it("prefers the cloud's list when both have one", () => {
    const merged = mergeCloudClassData(
      classData([{ id: "p1", name: "Aiman", unlockedSpecies: ["robot"] }], []),
      classData([{ id: "p1", name: "Aiman", unlockedSpecies: [] }], [])
    );
    expect(merged.pupils[0].unlockedSpecies).toEqual(["robot"]);
  });

  it("matches pupils by id, not by position", () => {
    const merged = mergeCloudClassData(
      classData([
        { id: "p2", name: "Bella" },
        { id: "p1", name: "Aiman" },
      ], []),
      classData([
        { id: "p1", name: "Aiman", unlockedSpecies: ["robot"] },
        { id: "p2", name: "Bella" },
      ], [])
    );
    expect(merged.pupils.find((p) => p.id === "p1")?.unlockedSpecies).toEqual([
      "robot",
    ]);
    expect(
      merged.pupils.find((p) => p.id === "p2")?.unlockedSpecies
    ).toBeUndefined();
  });

  it("does not invent the field for a pupil who never unlocked anything", () => {
    const merged = mergeCloudClassData(
      classData([{ id: "p1", name: "Aiman" }], []),
      classData([{ id: "p1", name: "Aiman" }], [])
    );
    expect(merged.pupils[0].unlockedSpecies).toBeUndefined();
  });

  it("drops a pupil the cloud no longer has", () => {
    const merged = mergeCloudClassData(
      classData([{ id: "p1", name: "Aiman" }], []),
      classData([
        { id: "p1", name: "Aiman" },
        { id: "gone", name: "Removed", unlockedSpecies: ["robot"] },
      ], [])
    );
    expect(merged.pupils).toHaveLength(1);
  });

  // The rule this one is modelled on, kept so the two stay in step.
  it("keeps local purchases when the cloud doc predates petPurchases", () => {
    const merged = mergeCloudClassData(
      classData([{ id: "p1", name: "Aiman" }]),
      classData([{ id: "p1", name: "Aiman" }], [buy])
    );
    expect(merged.petPurchases).toEqual([buy]);
  });

  it("lets an explicit empty purchase list from cloud win", () => {
    const merged = mergeCloudClassData(
      classData([{ id: "p1", name: "Aiman" }], []),
      classData([{ id: "p1", name: "Aiman" }], [buy])
    );
    expect(merged.petPurchases).toEqual([]);
  });

  it("survives a class that is not on this device yet", () => {
    const merged = mergeCloudClassData(
      classData([{ id: "p1", name: "Aiman", unlockedSpecies: ["robot"] }], []),
      undefined
    );
    expect(merged.pupils[0].unlockedSpecies).toEqual(["robot"]);
    expect(merged.petPurchases).toEqual([]);
  });
});
