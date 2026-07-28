import { describe, expect, it } from "vitest";
import { applyReflectionTotals } from "@/lib/lesson-plan";
import { shortenName } from "@/lib/pupil-name";

const TOTALS = { enrichment: 7, engagement: 7, remedial: 7, total: 38 };

const ROSTER = [
  "CHONG MING XUAN",
  "LILADHARISHAN A/L SUNTARESAN",
  "YAN WAN NEE",
  "ADAM TAN ZHI HONG",
].map(shortenName);

describe("applyReflectionTotals — not-able line", () => {
  it("clears last week's leftover names and writes only today's absentees", () => {
    const text = [
      "Enrichment: 9/7",
      "Engagement: 26/7",
      "Remedial: 3/7",
      "38 pupils are not able to achieve their learning objectives. Ming Xuan, Liladharishan",
      "0 /38  absentee.",
    ].join("\n");

    const next = applyReflectionTotals(
      text,
      TOTALS,
      { absent: 1, total: 38, names: ["YAN WAN NEE"] },
      [],
      ROSTER
    );

    expect(next).toContain("1 /38  absentee. Wan Nee");
    expect(next).toMatch(/not able to achieve[^\n]*Wan Nee/i);
    expect(next).not.toMatch(/not able to achieve[^\n]*Ming Xuan/i);
    expect(next).not.toMatch(/not able to achieve[^\n]*Liladharishan/i);
  });

  it("keeps only current absentees when the set shrinks", () => {
    const text = [
      "Enrichment: 0/7",
      "2 pupils are not able to achieve. Ming Xuan, Wan Nee",
      "2 /38  absentee. Ming Xuan, Wan Nee",
    ].join("\n");

    const next = applyReflectionTotals(
      text,
      TOTALS,
      { absent: 1, total: 38, names: ["YAN WAN NEE"] },
      ["Ming Xuan", "Wan Nee"],
      ROSTER
    );

    expect(next).toContain("1 /38  absentee. Wan Nee");
    expect(next).toMatch(/not able to achieve[^\n]*Wan Nee/i);
    expect(next).not.toMatch(/Ming Xuan/);
  });

  it("strips leading indent on the absentee line", () => {
    const text = [
      "Enrichment: / 12 pupils able to read.",
      "/ 37 pupils are not able to achieve their learning objectives. They will be coached respectively. Jin Rou",
      "               1 /37 absentee. Jin Rou",
    ].join("\n");

    const next = applyReflectionTotals(
      text,
      { enrichment: 12, engagement: 21, remedial: 4, total: 37 },
      { absent: 1, total: 37, names: ["WONG JIN ROU"] },
      [],
      ["Jin Rou", "Ming Jia"]
    );

    const absenteeLine = next.split("\n").find((l) => /absentee/i.test(l)) ?? "";
    expect(absenteeLine).toBe("1 /37  absentee. Jin Rou");
    expect(absenteeLine).not.toMatch(/^\s/);
  });
});
