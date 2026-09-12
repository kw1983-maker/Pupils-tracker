import { describe, expect, it } from "vitest";
import { applyReflectionTotals, parseAbsenteeShortNames } from "@/lib/lesson-plan";
import { shortenName } from "@/lib/pupil-name";

const TOTALS = { enrichment: 9, engagement: 25, remedial: 3, total: 37 };

const ROSTER = [
  "CHONG MING XUAN",
  "YAN WAN NEE",
  "ADAM TAN ZHI HONG",
].map(shortenName);

function slashColOf(line: string): number {
  return line.search(/[/／]/);
}

describe("applyReflectionTotals — template layout", () => {
  it("matches Enrichment : / N with padded not-able and absentee slashes", () => {
    const text = [
      "Enrichment : / 9 pupils able to blend 6/7 words with i sounds.",
      "Engagement : / 25 pupils able to blend 5/7 words with i sounds.",
      "Remedial   : / 3 pupils able to blend 4/7 words with i sounds.",
      "             / 37 pupils are not able to achieve their learning objectives. They will be coached respectively.",
      "             / 37 absentee.",
    ].join("\n");

    const next = applyReflectionTotals(
      text,
      TOTALS,
      { absent: 0, total: 37, names: [] },
      [],
      ROSTER
    );

    const lines = next.split("\n");
    const enrichment = lines.find((l) => /Enrichment/i.test(l))!;
    const engagement = lines.find((l) => /Engagement/i.test(l))!;
    const remedial = lines.find((l) => /Remedial/i.test(l))!;
    const notAble = lines.find((l) => /not able to achieve/i.test(l))!;
    const absentee = lines.find((l) => /absentee/i.test(l))!;
    const col = slashColOf(enrichment);

    expect(enrichment).toMatch(/^Enrichment : \/ 9 /);
    expect(engagement).toMatch(/^Engagement : \/ 25 /);
    expect(remedial).toMatch(/^Remedial\s+: \/ 3 /);
    expect(slashColOf(engagement)).toBe(col);
    expect(slashColOf(remedial)).toBe(col);
    expect(slashColOf(notAble)).toBe(col);
    expect(slashColOf(absentee)).toBe(col);
    expect(notAble).toMatch(/^\s+\/ 37 pupils are not able to achieve/);
    expect(absentee).toMatch(/0 \/ 37 absentee\.$/);
    expect(absentee.startsWith("0")).toBe(false);
  });

  it("puts the absent count before the aligned slash", () => {
    const text = [
      "Enrichment : / 9 pupils able to listen.",
      "Engagement : / 26 pupils able to listen.",
      "Remedial   : / 3 pupils able to listen.",
      "             / 38 pupils are not able to achieve their learning objectives. Ming Xuan",
      "             / 38 absentee.",
    ].join("\n");

    const next = applyReflectionTotals(
      text,
      { enrichment: 9, engagement: 26, remedial: 3, total: 38 },
      { absent: 1, total: 38, names: ["YAN WAN NEE"] },
      [],
      ROSTER
    );

    const lines = next.split("\n");
    const enrichment = lines.find((l) => /Enrichment/i.test(l))!;
    const notAble = lines.find((l) => /not able to achieve/i.test(l))!;
    const absentee = lines.find((l) => /absentee/i.test(l))!;
    const col = slashColOf(enrichment);

    expect(slashColOf(notAble)).toBe(col);
    expect(slashColOf(absentee)).toBe(col);
    expect(notAble).toMatch(/Wan Nee$/);
    expect(notAble).not.toMatch(/Ming Xuan/);
    expect(absentee).toMatch(/1 \/ 38 absentee\. Wan Nee$/);
    expect(absentee.startsWith("1")).toBe(false);
  });

  it("normalizes messy Enrichment spacing to : / N", () => {
    const text = [
      "Enrichment :   /    9 pupils able to listen to and understand 13/14 story lines.",
      "Engagement :   /    26 pupils able to listen.",
      "Remedial   :   /    3 pupils able to listen.",
      "/ 38 pupils are not able to achieve their learning objectives. Wan Nee",
      "1 /38  absentee. Wan Nee",
    ].join("\n");

    const next = applyReflectionTotals(
      text,
      { enrichment: 9, engagement: 26, remedial: 3, total: 38 },
      { absent: 1, total: 38, names: ["YAN WAN NEE"] },
      [],
      ROSTER
    );

    const lines = next.split("\n");
    const enrichment = lines.find((l) => /Enrichment/i.test(l))!;
    const notAble = lines.find((l) => /not able to achieve/i.test(l))!;
    const absentee = lines.find((l) => /absentee/i.test(l))!;
    const col = slashColOf(enrichment);

    expect(enrichment).toMatch(/^Enrichment : \/ 9 /);
    expect(slashColOf(notAble)).toBe(col);
    expect(slashColOf(absentee)).toBe(col);
  });

  // The real 2D cell on M31/SELASA: the teacher reworded the template by hand
  // and wrote "absentees", which used to slip past the `absentee\b` matcher —
  // the line got aligned and its denominator fixed, but the count stayed 0.
  it("fills the count on a pluralised 'absentees' line, keeping the wording", () => {
    const text = [
      "Enrichment: / 6 pupils can understand a picture story without guidance.",
      "Engagement: / 28 pupils can understand a picture story with some guidance.",
      "Remedial: / 2 pupils can  understand a picture story with lots of guidance.",
      "        / 36 pupils are not able to achieve the objectives. They are being guided consistently.",
      "   0 / 36 absentees.",
    ].join("\n");

    const next = applyReflectionTotals(
      text,
      { enrichment: 6, engagement: 28, remedial: 2, total: 36 },
      { absent: 1, total: 36, names: ["NG MING LIANG"] },
      [],
      ["NG MING LIANG", "TAN WEI XIANG"].map(shortenName)
    );

    const lines = next.split("\n");
    const enrichment = lines.find((l) => /Enrichment/i.test(l))!;
    const notAble = lines.find((l) => /not able to achieve/i.test(l))!;
    const absentee = lines.find((l) => /absentee/i.test(l))!;

    expect(absentee).toMatch(/1 \/ 36 absentees\. Ming Liang$/);
    expect(absentee.startsWith("1")).toBe(false);
    expect(slashColOf(absentee)).toBe(slashColOf(enrichment));
    expect(slashColOf(notAble)).toBe(slashColOf(enrichment));
    expect(notAble).toMatch(/Ming Liang$/);
    expect(notAble.match(/Ming Liang/g)).toHaveLength(1);
  });
});

describe("parseAbsenteeShortNames", () => {
  it("reads names off a pluralised 'absentees' line", () => {
    expect(parseAbsenteeShortNames("   1 / 36 absentees. Ming Liang")).toEqual([
      "Ming Liang",
    ]);
  });

  it("still reads the singular template wording", () => {
    expect(parseAbsenteeShortNames("   0 / 37 absentee.")).toEqual([]);
  });

  it("returns null when there is no absentee line at all", () => {
    expect(parseAbsenteeShortNames("Enrichment : / 9 pupils able to blend.")).toBeNull();
  });
});
