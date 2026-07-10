// Fills a class's "Rekod Perkembangan Murid_BI" Google Sheet — one sheet per
// class, with a Listening/Speaking/Reading/Writing tab each — from the app's
// own attendance + PBD data. IO-agnostic like lib/lesson-plan.ts: everything
// here operates on a `GridSource` (see lib/google-sheets.ts for the Sheets
// API adapter) and returns plain cell updates; nothing here talks to the
// network.
//
// Sheet layout (confirmed against the teacher's real template): a header row
// carries "NO." / "LEARNING STANDARD" labels, then one value column + an
// adjacent date column per DSKP standard code (e.g. "1.2.1"). Three rows
// below the header, pupil rows begin: NO. in col A, NAME in col B, then a
// (band 1-6, date-serial) pair under whichever standard columns have been
// assessed. The standard code's leading digit fixes which tab/skill it
// belongs to (1=Listening, 2=Speaking, 3=Reading, 4=Writing — the national
// DSKP numbering for Bahasa Inggeris, not specific to any one class).

import type { GridSource } from "./lesson-plan";
import type { PbdSkill, PbdClassReport } from "./pbd-bi";

const SKILL_BY_PREFIX: Record<string, PbdSkill> = {
  "1": "listening",
  "2": "speaking",
  "3": "reading",
  "4": "writing",
};

const SHEET_NAME_BY_SKILL: Record<PbdSkill, string> = {
  listening: "Listening",
  speaking: "Speaking",
  reading: "Reading",
  writing: "Writing",
};

/** Which skill (and therefore which tab) a standard code like "1.2.1" belongs
 *  to, or null if it doesn't start with a recognised skill digit. */
export function standardCodeSkill(code: string): PbdSkill | null {
  const prefix = code.trim().charAt(0);
  return SKILL_BY_PREFIX[prefix] ?? null;
}

export function sheetNameForSkill(skill: PbdSkill): string {
  return SHEET_NAME_BY_SKILL[skill];
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

/** Days since 1899-12-30 — the Sheets/Excel date serial epoch — so a plain
 *  RAW-written number renders correctly under the cell's existing date format
 *  (matching the serials already found in the teacher's live sheet). */
export function excelSerial(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  const utcMs = Date.UTC(y, m - 1, d);
  const epochMs = Date.UTC(1899, 11, 30);
  return Math.round((utcMs - epochMs) / 86_400_000);
}

export type PupilFillStatus = "filled" | "filled-new-row" | "no-pbd-score" | "sheet-full";

export interface PupilFillResult {
  name: string;
  status: PupilFillStatus;
}

export interface CellUpdate {
  addr: string;
  value: string;
}

export interface BuildPbdSheetUpdatesParams {
  grid: GridSource;
  headerRow: number;
  standardCol: number;
  dateISO: string;
  presentNames: string[];
  classReport: PbdClassReport;
  skill: PbdSkill;
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
  const serial = String(excelSerial(dateISO));

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
    const band = record[skill];

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
      updates.push({ addr: grid.cellAddress(row, NAME_COL), value: name });
      status = "filled-new-row";
    }

    updates.push({ addr: grid.cellAddress(row, standardCol), value: String(band) });
    updates.push({ addr: grid.cellAddress(row, dateCol), value: serial });
    results.push({ name, status });
  }

  return { updates, results };
}
