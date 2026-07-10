// Adapts a parsed `xlsx` worksheet into the same `GridSource` view
// lib/google-sheets.ts's toGridSource builds from the Sheets API's grid
// data, so lib/lesson-plan.ts's parseGridBlocks works unmodified regardless
// of whether the grid came from a live Google Sheet or an uploaded .xlsx
// snapshot of one (same RPH template either way).

import type { GridSource } from "./lesson-plan";

// Minimal shapes this needs from the `xlsx` package — avoids importing its
// types at module scope, matching this repo's `const XLSX = await
// import("xlsx")` dynamic-import convention (see lib/attendance-export.ts).
interface XlsxCell {
  w?: string;
  v?: string | number | boolean;
}
type XlsxWorksheet = Record<string, unknown> & {
  "!ref"?: string;
  "!merges"?: { s: { r: number; c: number }; e: { r: number; c: number } }[];
};
interface XlsxUtils {
  decode_range(ref: string): { s: { r: number; c: number }; e: { r: number; c: number } };
  encode_cell(addr: { r: number; c: number }): string;
}

export function xlsxSheetToGridSource(ws: XlsxWorksheet, utils: XlsxUtils): GridSource {
  const range = ws["!ref"] ? utils.decode_range(ws["!ref"]) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  const merges = ws["!merges"] ?? [];

  function findMerge(row0: number, col0: number) {
    // xlsx merge ranges are 0-based with an INCLUSIVE end (unlike the
    // Sheets API's exclusive endRowIndex/endColumnIndex).
    return merges.find(
      (m) => row0 >= m.s.r && row0 <= m.e.r && col0 >= m.s.c && col0 <= m.e.c
    );
  }

  function rawText(row0: number, col0: number): string {
    const cell = ws[utils.encode_cell({ r: row0, c: col0 })] as XlsxCell | undefined;
    if (!cell) return "";
    return cell.w ?? (cell.v != null ? String(cell.v) : "");
  }

  return {
    maxRow: range.e.r + 1,
    cellText(row: number, col: number): string {
      const merge = findMerge(row - 1, col - 1);
      if (merge) return rawText(merge.s.r, merge.s.c);
      return rawText(row - 1, col - 1);
    },
    cellAddress(row: number, col: number): string {
      const merge = findMerge(row - 1, col - 1);
      if (merge) return utils.encode_cell({ r: merge.s.r, c: merge.s.c });
      return utils.encode_cell({ r: row - 1, c: col - 1 });
    },
  };
}
