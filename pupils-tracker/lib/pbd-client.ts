// Thin client for POST /api/pbd-sheet — shared by the manual Resources
// buttons and the attendance auto-fill watcher.

import type { PbdFillSkipReason, PupilFillStatus } from "./pbd-sheet";

export interface PupilFillResult {
  name: string;
  status: PupilFillStatus;
}

export interface FillPbdOneDayResult {
  ok: boolean;
  updatedCount?: number;
  results?: PupilFillResult[];
  skipReason?: PbdFillSkipReason;
  message?: string;
  serviceAccountEmail?: string;
}

export async function fillPbdOneDay(
  idToken: string,
  spreadsheetUrl: string,
  className: string,
  standardCode: string,
  dateISO: string,
  presentNames: string[]
): Promise<FillPbdOneDayResult> {
  const res = await fetch("/api/pbd-sheet", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ spreadsheetUrl, className, standardCode, dateISO, presentNames }),
  });
  const data = await res.json();
  if (data.ok) {
    return {
      ok: true,
      updatedCount: data.updatedCount,
      results: data.results ?? [],
      skipReason: data.skipReason,
    };
  }
  return {
    ok: false,
    message: data.message ?? "Fill failed.",
    serviceAccountEmail: data.serviceAccountEmail,
  };
}
