import { describe, expect, it } from "vitest";
import {
  clampIndex,
  MAX_SET_PHOTOS,
  parsePhotoSet,
  photoDocId,
  photoViewDocId,
  stepIndex,
} from "@/lib/photo-set";

describe("doc ids", () => {
  it("keeps the original names for the first photo", () => {
    expect(photoDocId("u1", 0)).toBe("u1_photo");
    expect(photoViewDocId("u1", 0)).toBe("u1_photoview");
  });
  it("numbers the rest from 2", () => {
    expect(photoDocId("u1", 1)).toBe("u1_photo2");
    expect(photoViewDocId("u1", 5)).toBe("u1_photoview6");
  });
});

describe("parsePhotoSet", () => {
  it("accepts a valid set and clamps the index", () => {
    expect(parsePhotoSet({ setAt: 5, count: 3, index: 1 })).toEqual({ setAt: 5, count: 3, index: 1 });
    expect(parsePhotoSet({ setAt: 5, count: 3, index: 9 })?.index).toBe(2);
  });
  it.each([
    ["zero photos", { setAt: 5, count: 0, index: 0 }],
    ["too many", { setAt: 5, count: MAX_SET_PHOTOS + 1, index: 0 }],
    ["fractional index", { setAt: 5, count: 2, index: 0.5 }],
    ["no setAt", { count: 2, index: 0 }],
    ["not an object", "x"],
  ])("rejects %s", (_l, raw) => {
    expect(parsePhotoSet(raw)).toBeNull();
  });
});

describe("stepping", () => {
  it("stops at both ends", () => {
    const set = { setAt: 1, count: 3, index: 2 };
    expect(stepIndex(set, 1)).toBe(2);
    expect(stepIndex(set, -1)).toBe(1);
    expect(stepIndex({ ...set, index: 0 }, -1)).toBe(0);
    expect(clampIndex(-4, 3)).toBe(0);
  });
});
