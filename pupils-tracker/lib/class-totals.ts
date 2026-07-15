// Correct per-class reflection totals (the denominators), taken from
// docs/References/Lesson plan info.xlsx. Teachers sometimes type the wrong
// totals in the RPH; when the app fills a lesson plan it checks each block's
// Reflection against these and corrects the denominators (keeping the teacher's
// own numerators). `total` is the class size, used for both the
// "…not able to achieve…" and "…absentee" lines.
//
// Some classes are taught more than one subject (e.g. 2B English vs 2B PE) with
// different totals, so rules are matched by class AND subject. Most also get
// their absentee count filled from attendance; a few PE/PK rules remain
// denominator-only where the app doesn't track attendance for that class.
//
// Regenerate this when docs/References/Lesson plan info.xlsx changes.

export interface ClassTotals {
  enrichment: number;
  engagement: number;
  remedial: number;
  total: number;
}

interface TotalsRule {
  cls: string; // normalized class name (uppercase, no spaces)
  subject?: RegExp; // when present, only applies if the block's subject matches
  totals: ClassTotals;
  fillAbsentee: boolean; // fill the absentee count from attendance?
}

const PE = /体育|jasmani|physical|\bPE\b|\bPJK?\b/i;
const PK = /体健|健康|health|kesihatan|\bPK\b/i;

const RULES: TotalsRule[] = [
  // English (default for each class — no subject constraint).
  { cls: "2B", totals: { enrichment: 12, engagement: 21, remedial: 4, total: 37 }, fillAbsentee: true },
  { cls: "1B", totals: { enrichment: 5, engagement: 29, remedial: 3, total: 37 }, fillAbsentee: true },
  { cls: "2D", totals: { enrichment: 6, engagement: 28, remedial: 2, total: 36 }, fillAbsentee: true },
  { cls: "1E", totals: { enrichment: 9, engagement: 23, remedial: 3, total: 35 }, fillAbsentee: true },
  { cls: "2F", totals: { enrichment: 6, engagement: 26, remedial: 4, total: 37 }, fillAbsentee: true },
  // PE / PK (Chinese reflections).
  { cls: "2B", subject: PE, totals: { enrichment: 13, engagement: 24, remedial: 0, total: 37 }, fillAbsentee: true },
  { cls: "2G", subject: PE, totals: { enrichment: 10, engagement: 24, remedial: 0, total: 34 }, fillAbsentee: false },
  { cls: "2G", subject: PK, totals: { enrichment: 10, engagement: 24, remedial: 0, total: 34 }, fillAbsentee: false },
];

function normalizeClass(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export interface TotalsMatch {
  totals: ClassTotals;
  fillAbsentee: boolean;
}

/** Reference totals for a block, matched by class and (for multi-subject
 *  classes) subject. Returns null for classes not in the reference. */
export function totalsFor(classRaw: string, subject: string): TotalsMatch | null {
  const c = normalizeClass(classRaw);
  const matches = RULES.filter((r) => normalizeClass(r.cls) === c);
  if (matches.length === 0) return null;
  const bySubject = matches.find((r) => r.subject && r.subject.test(subject || ""));
  const chosen = bySubject ?? matches.find((r) => !r.subject) ?? matches[0];
  return { totals: chosen.totals, fillAbsentee: chosen.fillAbsentee };
}
