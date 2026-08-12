// Fills a class's "Rekod Perkembangan Murid_BI" Google Sheet — one sheet per
// class, with a Listening/Speaking/Reading/Writing/Language Arts tab each —
// from the app's own attendance + PBD data. IO-agnostic like lib/lesson-plan.ts:
// everything here operates on a `GridSource` (see lib/google-sheets.ts for the
// Sheets API adapter) and returns plain cell updates; nothing here talks to
// the network.
//
// Sheet layout (confirmed against the teacher's real template): a header row
// carries "NO." / "LEARNING STANDARD" labels, then one value column + an
// adjacent date column per DSKP standard code (e.g. "1.2.1"). Three rows
// below the header, pupil rows begin: NO. in col A, NAME in col B, then a
// (band 1-6, date) pair under whichever standard columns have been assessed.
// The standard code's leading digit fixes which tab/skill it belongs to
// (1=Listening, 2=Speaking, 3=Reading, 4=Writing, 5=Language Arts — the
// national DSKP numbering for Bahasa Inggeris, not specific to any one class).

import type { GridSource } from "./lesson-plan";
import type { PbdSkill, PbdClassReport } from "./pbd-bi";

/** BI Rekod tab skills — the four scored PBD skills plus Language Arts (DSKP 5). */
export type BiSheetSkill = PbdSkill | "languageArts";

const SKILL_BY_PREFIX: Record<string, BiSheetSkill> = {
  "1": "listening",
  "2": "speaking",
  "3": "reading",
  "4": "writing",
  "5": "languageArts",
};

const SHEET_NAME_BY_SKILL: Record<BiSheetSkill, string> = {
  listening: "Listening",
  speaking: "Speaking",
  reading: "Reading",
  writing: "Writing",
  languageArts: "Language Arts",
};

/** Alternate tab titles teachers' Rekod templates actually use. Matching is
 *  case/space/punctuation-insensitive via `normalizeTabKey`. */
const TAB_ALIASES_BY_SKILL: Record<BiSheetSkill, string[]> = {
  listening: ["Listening", "Mendengar"],
  speaking: ["Speaking", "Bertutur"],
  reading: ["Reading", "Membaca"],
  writing: ["Writing", "Menulis"],
  languageArts: [
    "Language Arts",
    "LanguageArts",
    "Language Art",
    "LA",
    "L.A",
    "L.A.",
    "Seni Bahasa",
  ],
};

function normalizeTabKey(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Which skill (and therefore which tab) a standard code like "1.2.1" belongs
 *  to, or null if it doesn't start with a recognised skill digit (1–5). */
export function standardCodeSkill(code: string): BiSheetSkill | null {
  const prefix = code.trim().charAt(0);
  return SKILL_BY_PREFIX[prefix] ?? null;
}

export function sheetNameForSkill(skill: BiSheetSkill): string {
  return SHEET_NAME_BY_SKILL[skill];
}

/** Pick the spreadsheet's real tab title for a skill, tolerating common
 *  renames (e.g. "LA" or "5. Language Arts" instead of "Language Arts").
 *  Returns null when nothing close enough appears in `allTabs`. */
export function resolveBiTabName(
  allTabs: string[],
  skill: BiSheetSkill
): string | null {
  const aliases = new Set(
    [sheetNameForSkill(skill), ...TAB_ALIASES_BY_SKILL[skill]].map(normalizeTabKey)
  );
  for (const tab of allTabs) {
    if (aliases.has(normalizeTabKey(tab))) return tab;
  }
  // Loose match: "5 Language Arts", "Language Arts (Y2)", etc.
  if (skill === "languageArts") {
    for (const tab of allTabs) {
      const key = normalizeTabKey(tab);
      if (
        key.includes("languageart") ||
        key.includes("senibahasa") ||
        key === "la"
      ) {
        return tab;
      }
    }
  }
  return null;
}

/** Prefer the skill's own tab (any alias), then the other known BI skill
 *  tabs — so a 5.x.x column under an oddly named LA sheet still gets found
 *  without fetching unrelated cover/instruction tabs. */
export function biTabSearchOrder(
  allTabs: string[],
  skill: BiSheetSkill
): string[] {
  const preferred = resolveBiTabName(allTabs, skill);
  const biTabs: string[] = [];
  const seen = new Set<string>();
  const push = (tab: string | null) => {
    if (!tab || seen.has(tab)) return;
    seen.add(tab);
    biTabs.push(tab);
  };
  push(preferred);
  for (const other of Object.keys(SHEET_NAME_BY_SKILL) as BiSheetSkill[]) {
    push(resolveBiTabName(allTabs, other));
  }
  // Last resort: any remaining tab (covers templates that rename skills
  // outside our alias list).
  for (const tab of allTabs) push(tab);
  return biTabs;
}

/** Locate the header row + value column for a standard code across candidate
 *  tabs. Pure — takes already-fetched grids. */
export function findBiStandardLocation(
  grids: Record<string, GridSource>,
  tabOrder: string[],
  standardCode: string
): { tabName: string; headerRow: number; standardCol: number } | null {
  for (const tabName of tabOrder) {
    const grid = grids[tabName];
    if (!grid) continue;
    const headerRow = findHeaderRow(grid);
    if (headerRow === null) continue;
    const standardCol = findStandardColumn(grid, headerRow, standardCode);
    if (standardCol === null) continue;
    return { tabName, headerRow, standardCol };
  }
  return null;
}

/** Band written into the Rekod for this skill. Language Arts isn't scored
 *  separately in the PBD workbook, so we use the pupil's overall TP. */
export function bandForSheetSkill(
  record: { listening: number; speaking: number; reading: number; writing: number; overall: number },
  skill: BiSheetSkill
): number {
  return skill === "languageArts" ? record.overall : record[skill];
}

const NAME_COL = 2;
const HEADER_SCAN_MAX_ROW = 15;
const HEADER_SCAN_MAX_COL = 40;

/** Locate the header row (the one whose NAME-column cell reads "LEARNING
 *  STANDARD"), scanning the first few rows rather than assuming row 9 — the
 *  Year 1 vs Year 2 templates aren't guaranteed to line up exactly. */
export function findHeaderRow(grid: GridSource): number | null {
  for (let row = 1; row <= Math.min(HEADER_SCAN_MAX_ROW, grid.maxRow); row++) {
    const text = grid.cellText(row, NAME_COL).trim().toUpperCase();
    if (text === "LEARNING STANDARD") return row;
  }
  return null;
}

/** The value column for a given standard code within the header row, or null
 *  if that code isn't in this sheet. The date lives one column to the right. */
export function findStandardColumn(
  grid: GridSource,
  headerRow: number,
  code: string
): number | null {
  const target = code.trim();
  for (let col = NAME_COL + 1; col <= HEADER_SCAN_MAX_COL; col++) {
    if (grid.cellText(headerRow, col).trim() === target) return col;
  }
  return null;
}

export type PupilFillStatus = "filled" | "filled-new-row" | "no-pbd-score" | "sheet-full";

export interface PupilFillResult {
  name: string;
  status: PupilFillStatus;
}

export interface CellUpdate {
  addr: string;
  value: string;
  // "date" cells need the number-format-forcing write path (see
  // lib/google-sheets.ts's setDateCells) — a plain values:batchUpdate write
  // can't override a cell already locked to "Plain text" formatting.
  kind: "name" | "value" | "date";
}

export interface BuildPbdSheetUpdatesParams {
  grid: GridSource;
  headerRow: number;
  standardCol: number;
  dateISO: string;
  presentNames: string[];
  classReport: PbdClassReport;
  skill: BiSheetSkill;
}

export interface BuildPbdSheetUpdatesResult {
  updates: CellUpdate[];
  results: PupilFillResult[];
}

/** For each present pupil: find their row (matching an existing name, or
 *  claiming the next blank-name row for a pupil not listed yet), look up
 *  their Band for this skill from the already-regenerated PBD data, and emit
 *  the (value, date) cell writes. Pure — takes/returns plain data so it's
 *  easy to test without a live Sheets connection. */
export function buildPbdSheetUpdates({
  grid,
  headerRow,
  standardCol,
  dateISO,
  presentNames,
  classReport,
  skill,
}: BuildPbdSheetUpdatesParams): BuildPbdSheetUpdatesResult {
  const pupilStartRow = headerRow + 3;
  const dateCol = standardCol + 1;

  const rowByName = new Map<string, number>();
  let nextBlankRow: number | null = null;
  for (let row = pupilStartRow; row <= grid.maxRow; row++) {
    const name = grid.cellText(row, NAME_COL).trim();
    if (name) {
      rowByName.set(name.toLowerCase(), row);
    } else if (nextBlankRow === null) {
      nextBlankRow = row;
    }
  }

  const recordByName = new Map(
    classReport.records.map((r) => [r.name.trim().toLowerCase(), r])
  );

  const updates: CellUpdate[] = [];
  const results: PupilFillResult[] = [];

  for (const name of presentNames) {
    const key = name.trim().toLowerCase();
    const record = recordByName.get(key);
    if (!record) {
      results.push({ name, status: "no-pbd-score" });
      continue;
    }
    const band = bandForSheetSkill(record, skill);

    let row = rowByName.get(key);
    let status: PupilFillStatus = "filled";
    if (row === undefined) {
      if (nextBlankRow === null) {
        results.push({ name, status: "sheet-full" });
        continue;
      }
      row = nextBlankRow;
      rowByName.set(key, row);
      // Find the row after the one just claimed for the next new pupil.
      nextBlankRow = null;
      for (let r = row + 1; r <= grid.maxRow; r++) {
        if (!grid.cellText(r, NAME_COL).trim()) {
          nextBlankRow = r;
          break;
        }
      }
      updates.push({ addr: grid.cellAddress(row, NAME_COL), value: name, kind: "name" });
      status = "filled-new-row";
    }

    updates.push({ addr: grid.cellAddress(row, standardCol), value: String(band), kind: "value" });
    updates.push({ addr: grid.cellAddress(row, dateCol), value: dateISO, kind: "date" });
    results.push({ name, status });
  }

  return { updates, results };
}
