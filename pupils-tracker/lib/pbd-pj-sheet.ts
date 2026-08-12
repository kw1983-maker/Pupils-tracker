// Fills a class's "Rekod Perkembangan Murid_PJ" Google Sheet. Layout differs
// from the BI Rekod (see lib/pbd-sheet.ts): three tabs (kemahiran1 /
// kemahiran2 / kecergasan), with row 11 listing DSKP standard codes under each
// (TP, date) column pair and pupil rows starting at row 13.
//
// Band / Tahap Penguasaan for each pupil is taken from that pupil's typical
// already-filled TP elsewhere in the same spreadsheet (rounded average of
// 1–6 values), not from lib/pbd-bi.ts.

import type { GridSource } from "./lesson-plan";
import {
  isAssessmentColumnUsed,
  type CellUpdate,
  type PupilFillResult,
} from "./pbd-sheet";

export const PJ_STANDARDS_ROW = 11;
export const PJ_NAME_COL = 2;
export const PJ_PUPIL_START_ROW = 13;
export const PJ_SCAN_MAX_COL = 60;

const PJ_TAB_ORDER = ["kemahiran1", "kemahiran2", "kecergasan"];

/** Tab titles of this PJ workbook that we know how to fill, in template order. */
export function pjTabTitles(allTabs: string[]): string[] {
  const lowerMap = new Map(allTabs.map((t) => [t.trim().toLowerCase(), t]));
  return PJ_TAB_ORDER.map((k) => lowerMap.get(k)).filter((t): t is string => !!t);
}

/** True when row-11 cell text mentions `code` as a whole DSKP token (not a
 *  prefix of a longer code like 1.2.10). */
export function cellHasStandard(cellText: string, code: string): boolean {
  const target = code.trim();
  if (!target) return false;
  const escaped = target.replace(/\./g, "\\.");
  return new RegExp(`(?:^|[^0-9.])${escaped}(?![0-9])`).test(cellText);
}

export interface PjColumnTarget {
  tabName: string;
  valueCol: number;
}

/** Every (tab, value-column) whose standards-row cell lists this code. */
export function findPjStandardColumns(
  grids: Record<string, GridSource>,
  code: string
): PjColumnTarget[] {
  const out: PjColumnTarget[] = [];
  for (const [tabName, grid] of Object.entries(grids)) {
    for (let col = 3; col <= PJ_SCAN_MAX_COL; col++) {
      const text = grid.cellText(PJ_STANDARDS_ROW, col);
      if (!text.trim()) continue;
      if (cellHasStandard(text, code)) {
        out.push({ tabName, valueCol: col });
      }
    }
  }
  return out;
}

function findPupilRow(grid: GridSource, nameKey: string): number | null {
  for (let row = PJ_PUPIL_START_ROW; row <= grid.maxRow; row++) {
    const name = grid.cellText(row, PJ_NAME_COL).trim();
    if (!name) continue;
    if (name.toLowerCase() === nameKey) return row;
  }
  return null;
}

function nextBlankNameRow(grid: GridSource): number | null {
  for (let row = PJ_PUPIL_START_ROW; row <= grid.maxRow; row++) {
    if (!grid.cellText(row, PJ_NAME_COL).trim()) return row;
  }
  return null;
}

/** Rounded average of existing TP (1–6) values for this pupil across the PJ
 *  tabs, or null when nothing has been entered yet. */
export function averageTpForPupil(
  grids: Record<string, GridSource>,
  pupilName: string
): number | null {
  const key = pupilName.trim().toLowerCase();
  const bands: number[] = [];
  for (const grid of Object.values(grids)) {
    const row = findPupilRow(grid, key);
    if (row == null) continue;
    for (let col = 3; col <= PJ_SCAN_MAX_COL; col += 2) {
      // Only count real assessment value columns (those with standards text).
      if (!grid.cellText(PJ_STANDARDS_ROW, col).trim()) continue;
      const raw = grid.cellText(row, col).trim();
      const n = Number(raw);
      if (Number.isInteger(n) && n >= 1 && n <= 6) bands.push(n);
    }
  }
  if (bands.length === 0) return null;
  return Math.round(bands.reduce((a, b) => a + b, 0) / bands.length);
}

/** First matching column whose TP cells are all blank across pupil rows.
 *  Returns null when every candidate column already has data. */
export function pickPjColumn(
  grids: Record<string, GridSource>,
  targets: PjColumnTarget[]
): PjColumnTarget | null {
  for (const t of targets) {
    const grid = grids[t.tabName];
    if (!grid) continue;
    if (!isAssessmentColumnUsed(grid, PJ_PUPIL_START_ROW, t.valueCol)) {
      return t;
    }
  }
  return null;
}

export interface BuildPjSheetUpdatesParams {
  grids: Record<string, GridSource>;
  target: PjColumnTarget;
  dateISO: string;
  presentNames: string[];
}

export interface BuildPjSheetUpdatesResult {
  tabName: string;
  updates: CellUpdate[];
  results: PupilFillResult[];
}

export function buildPjSheetUpdates({
  grids,
  target,
  dateISO,
  presentNames,
}: BuildPjSheetUpdatesParams): BuildPjSheetUpdatesResult {
  const grid = grids[target.tabName];
  if (!grid) {
    return { tabName: target.tabName, updates: [], results: [] };
  }

  const dateCol = target.valueCol + 1;
  const rowByName = new Map<string, number>();
  for (let row = PJ_PUPIL_START_ROW; row <= grid.maxRow; row++) {
    const name = grid.cellText(row, PJ_NAME_COL).trim();
    if (name) rowByName.set(name.toLowerCase(), row);
  }

  let nextBlank = nextBlankNameRow(grid);
  const updates: CellUpdate[] = [];
  const results: PupilFillResult[] = [];

  for (const name of presentNames) {
    const key = name.trim().toLowerCase();
    const band = averageTpForPupil(grids, name);
    if (band == null) {
      results.push({ name, status: "no-pbd-score" });
      continue;
    }

    let row = rowByName.get(key);
    let status: PupilFillResult["status"] = "filled";
    if (row === undefined) {
      if (nextBlank == null) {
        results.push({ name, status: "sheet-full" });
        continue;
      }
      row = nextBlank;
      rowByName.set(key, row);
      updates.push({
        addr: grid.cellAddress(row, PJ_NAME_COL),
        value: name,
        kind: "name",
      });
      status = "filled-new-row";
      nextBlank = null;
      for (let r = row + 1; r <= grid.maxRow; r++) {
        if (!grid.cellText(r, PJ_NAME_COL).trim()) {
          nextBlank = r;
          break;
        }
      }
    }

    updates.push({
      addr: grid.cellAddress(row, target.valueCol),
      value: String(band),
      kind: "value",
    });
    updates.push({
      addr: grid.cellAddress(row, dateCol),
      value: dateISO,
      kind: "date",
    });
    results.push({ name, status });
  }

  return { tabName: target.tabName, updates, results };
}
