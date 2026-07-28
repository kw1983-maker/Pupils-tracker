import { describe, expect, it } from "vitest";
import { applyReflectionTotals } from "@/lib/lesson-plan";
import { shortenName } from "@/lib/pupil-name";

const TOTALS = { enrichment: 9, engagement: 26, remedial: 3, total: 38 };

const ROSTER = [
  "CHONG MING XUAN",
  "LILADHARISHAN A/L SUNTARESAN",
  "YAN WAN NEE",
  "ADAM TAN ZHI HONG",
].map(shortenName);

/** Slash column on a typical English Reflection template. */
function slashColOf(line: string): number {
  return line.search(/[/／]/);
}

describe("applyReflectionTotals — not-able line", () => {
  it("clears last week's leftover names and writes only today's absentees", () => {
    const text = [
      "Enrichment :   / 9 pupils able to listen.",
      "Engagement :   / 26 pupils able to listen.",
      "Remedial   :   / 3 pupils able to listen.",
      "               / 38 pupils are not able to achieve their learning objectives. Ming Xuan, Liladharishan",
      "               / 38 absentee.",
    ].join("\n");

    const next = applyReflectionTotals(
      text,
      TOTALS,
      { absent: 1, total: 38, names: ["YAN WAN NEE"] },
      [],
      ROSTER
    );

    expect(next).toMatch(/not able to achieve[^\n]*Wan Nee/i);
    expect(next).not.toMatch(/not able to achieve[^\n]*Ming Xuan/i);
    expect(next).not.toMatch(/not able to achieve[^\n]*Liladharishan/i);
    expect(next).toMatch(/absentee\.[^\n]*Wan Nee/);
  });

  it("keeps only current absentees when the set shrinks", () => {
    const text = [
      "Enrichment :   / 9 pupils able to listen.",
      "               / 38 pupils are not able to achieve. Ming Xuan, Wan Nee",
      "              2 / 38 absentee. Ming Xuan, Wan Nee",
    ].join("\n");

    const next = applyReflectionTotals(
      text,
      TOTALS,
      { absent: 1, total: 38, names: ["YAN WAN NEE"] },
      ["Ming Xuan", "Wan Nee"],
      ROSTER
    );

    expect(next).toMatch(/not able to achieve[^\n]*Wan Nee/i);
    expect(next).not.toMatch(/Ming Xuan/);
  });

  it("keeps Enrichment / not-able / absentee slashes in one column", () => {
    const text = [
      "Enrichment :   / 9 pupils able to listen to and understand 13/14 story lines.",
      "Engagement :   / 26 pupils able to listen to and understand 10/14 story lines.",
      "Remedial   :   / 3 pupils able to listen to and understand 7/14 story lines.",
      "               / 38 pupils are not able to achieve their learning objectives. They will be coached respectively. Wan Nee",
      "1 /38  absentee. Wan Nee",
    ].join("\n");

    const next = applyReflectionTotals(
      text,
      TOTALS,
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
    expect(absentee).toMatch(/1 \/ 38 absentee\. Wan Nee$/);
    // Numerator sits in the padding; slash is not flush-left.
    expect(absentee.startsWith("1 ")).toBe(false);
  });

  it("formats zero absentees like the template (spaces then / N absentee.)", () => {
    const text = [
      "Enrichment :   / 6 pupils able to answer at least six questions correctly.",
      "Engagement :   / 28 pupils able to answer at least four questions correctly.",
      "Remedial   :   / 2 pupils able to answer at least two questions correctly.",
      "               / 36 pupils are not able to achieve their learning objectives. They will be coached respectively.",
      "               / 36 absentee.",
    ].join("\n");

    const next = applyReflectionTotals(
      text,
      { enrichment: 6, engagement: 28, remedial: 2, total: 36 },
      { absent: 0, total: 36, names: [] },
      [],
      ["Jin Rou"]
    );

    const lines = next.split("\n");
    const enrichment = lines.find((l) => /Enrichment/i.test(l))!;
    const absentee = lines.find((l) => /absentee/i.test(l))!;
    expect(slashColOf(absentee)).toBe(slashColOf(enrichment));
    expect(absentee).toMatch(/^\s+\/ 36 absentee\.$/);
  });
});
