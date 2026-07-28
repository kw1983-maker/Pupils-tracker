import { describe, expect, it } from "vitest";
import { applyReflectionTotals } from "@/lib/lesson-plan";
import { shortenName } from "@/lib/pupil-name";

const TOTALS = { enrichment: 9, engagement: 23, remedial: 3, total: 35 };

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
      "Engagement : / 23 pupils able to blend 5/7 words with i sounds.",
      "Remedial   : / 3 pupils able to blend 4/7 words with i sounds.",
      "             / 35 pupils are not able to achieve their learning objectives. They will be coached respectively.",
      "             / 35 absentee.",
    ].join("\n");

    const next = applyReflectionTotals(
      text,
      TOTALS,
      { absent: 0, total: 35, names: [] },
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
    expect(engagement).toMatch(/^Engagement : \/ 23 /);
    expect(remedial).toMatch(/^Remedial\s+: \/ 3 /);
    expect(slashColOf(engagement)).toBe(col);
    expect(slashColOf(remedial)).toBe(col);
    expect(slashColOf(notAble)).toBe(col);
    expect(slashColOf(absentee)).toBe(col);
    expect(notAble).toMatch(/^\s+\/ 35 pupils are not able to achieve/);
    expect(absentee).toMatch(/0 \/ 35 absentee\.$/);
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
});
