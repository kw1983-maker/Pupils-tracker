// Client-only helpers: fill the uploaded workbook (from IndexedDB) with the
// app's attendance records and download the result. Reused by the Resources
// card (manual) and the always-on sync component (auto after marking).

import {
  fillPlan,
  matchClassId,
  type ParsedPlan,
  type AbsenteeInfo,
} from "./lesson-plan";
import { loadWorkbook, saveWorkbook } from "./lesson-plan-idb";
import type { Class } from "./types";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function downloadBytes(bytes: ArrayBuffer, fileName: string): void {
  const blob = new Blob([bytes], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Load the pristine uploaded workbook, fill every resolvable block from the
 *  app's records, and download the result. Returns how many blocks were filled,
 *  or null if no workbook is stored. Always fills from the original bytes so it
 *  is idempotent — the teacher's manual edits in the file are preserved. */
export async function fillAndDownloadPlan(opts: {
  plan: ParsedPlan;
  classes: Class[];
  aliases: Record<string, string>;
  getAbsenteeInfo: (classId: string, dateISO: string) => AbsenteeInfo | null;
}): Promise<{ filled: number } | null> {
  const stored = await loadWorkbook();
  if (!stored) return null;
  const { bytes, filled } = await fillPlan(stored.bytes, opts.plan, {
    resolveClassId: (raw) => matchClassId(raw, opts.classes, opts.aliases),
    getAbsenteeInfo: opts.getAbsenteeInfo,
  });
  downloadBytes(bytes, opts.plan.fileName);
  return { filled };
}

/** Fill the stored workbook from the app's records and keep the filled copy in
 *  IndexedDB — but do NOT download. Used on upload/drop so the held file already
 *  has the numbers; the teacher downloads later with "Fill & download now". */
export async function fillAndStorePlan(opts: {
  plan: ParsedPlan;
  classes: Class[];
  aliases: Record<string, string>;
  getAbsenteeInfo: (classId: string, dateISO: string) => AbsenteeInfo | null;
}): Promise<{ filled: number } | null> {
  const stored = await loadWorkbook();
  if (!stored) return null;
  const { bytes, filled } = await fillPlan(stored.bytes, opts.plan, {
    resolveClassId: (raw) => matchClassId(raw, opts.classes, opts.aliases),
    getAbsenteeInfo: opts.getAbsenteeInfo,
  });
  await saveWorkbook(stored.fileName, bytes);
  return { filled };
}
