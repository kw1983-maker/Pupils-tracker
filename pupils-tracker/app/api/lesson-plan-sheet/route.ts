import type { Class } from "@/lib/types";
import {
  WEEKDAY_TABS,
  parseGridBlocks,
  matchClassId,
  currentWeekDateForTab,
  applyReflectionTotals,
  type PlanBlock,
  type AbsenteeInfo,
} from "@/lib/lesson-plan";
import { shortenName } from "@/lib/pupil-name";
import { totalsFor } from "@/lib/class-totals";
import { parseSpreadsheetId } from "@/lib/google-sheets-url";
import {
  getTabTitles,
  getWeekdayTabGrids,
  batchUpdateCells,
  serviceAccountEmail,
  GoogleSheetsError,
} from "@/lib/google-sheets";

// Reads the teacher's live lesson-plan Google Sheet, recomputes each RPH
// block's Reflection text from the app's attendance records (the same logic
// that used to run against an uploaded .xlsx — see lib/lesson-plan.ts), and
// writes back only the cells that changed. Auth follows the same
// Firebase-ID-token + per-uid rate limit pattern as app/api/quiz-generate.

export const runtime = "nodejs";

const FIREBASE_API_KEY = "AIzaSyC4wnHVQQ7NMmGOjHSBzii4hNZB9wJPPx0";

async function verifyIdToken(idToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: Array<{ localId?: string }> };
    return data.users?.[0]?.localId ?? null;
  } catch {
    return null;
  }
}

const RL_LIMIT = 20;
const RL_WINDOW_MS = 60_000;
const recent = new Map<string, number[]>();
function rateLimited(uid: string): boolean {
  const now = Date.now();
  const hits = (recent.get(uid) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  if (hits.length >= RL_LIMIT) {
    recent.set(uid, hits);
    return true;
  }
  hits.push(now);
  recent.set(uid, hits);
  return false;
}

interface SyncRequestBody {
  lessonPlanUrl?: string;
  classes?: Class[];
  classAliases?: Record<string, string>;
  // classId -> dateISO -> absentee info for that class/date.
  attendance?: Record<string, Record<string, AbsenteeInfo>>;
  // classId -> dateISO -> shortened absentee names this same sync mechanism
  // wrote into that date's Reflection cell last time, so a pupil who's no
  // longer absent can be removed instead of lingering forever.
  previousAttendance?: Record<string, Record<string, string[]>>;
}

type BlockStatus = "updated" | "unchanged" | "skipped-no-rule" | "skipped-no-reflection";

interface SyncResult {
  tabName: string;
  classRaw: string;
  reflectionAddr: string | null;
  status: BlockStatus;
}

export async function POST(request: Request) {
  const authz = request.headers.get("authorization") ?? "";
  const idToken = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!idToken) {
    return Response.json(
      { ok: false, error: "unauthenticated", message: "Please sign in to sync." },
      { status: 401 }
    );
  }
  const uid = await verifyIdToken(idToken);
  if (!uid) {
    return Response.json(
      {
        ok: false,
        error: "unauthenticated",
        message: "Your session has expired — please sign in again.",
      },
      { status: 401 }
    );
  }
  if (rateLimited(uid)) {
    return Response.json(
      { ok: false, error: "rate-limited", message: "Too many sync requests. Wait a minute and try again." },
      { status: 429 }
    );
  }

  const body = (await request.json()) as SyncRequestBody;
  const spreadsheetId = parseSpreadsheetId(body.lessonPlanUrl ?? "");
  if (!spreadsheetId) {
    return Response.json(
      { ok: false, error: "bad-url", message: "Paste a valid Google Sheets link." },
      { status: 400 }
    );
  }

  const classes = body.classes ?? [];
  const classAliases = body.classAliases ?? {};
  const attendance = body.attendance ?? {};
  const previousAttendance = body.previousAttendance ?? {};

  try {
    const allTabs = await getTabTitles(spreadsheetId);
    const tabNames = WEEKDAY_TABS.filter((t) => allTabs.includes(t));
    if (tabNames.length === 0) {
      return Response.json({
        ok: true,
        tabNames: [],
        blocks: [],
        results: [],
        updatedCount: 0,
        syncedAt: Date.now(),
        syncedAbsentees: {},
      });
    }

    const grids = await getWeekdayTabGrids(spreadsheetId, tabNames);
    const blocks: PlanBlock[] = [];
    for (const tab of tabNames) {
      const grid = grids[tab];
      if (!grid) continue;
      blocks.push(...parseGridBlocks(grid, tab));
    }

    const results: SyncResult[] = [];
    const updates: { tabName: string; addr: string; value: string }[] = [];
    // classId -> dateISO -> shortened absentee names actually applied this
    // sync, echoed back so the client can diff against it next time (see
    // previousAttendance above) and remove pupils once they're no longer absent.
    const syncedAbsentees: Record<string, Record<string, string[]>> = {};

    for (const block of blocks) {
      if (!block.reflectionAddr) {
        results.push({
          tabName: block.tabName,
          classRaw: block.classRaw,
          reflectionAddr: null,
          status: "skipped-no-reflection",
        });
        continue;
      }
      const match = totalsFor(block.classRaw, block.subject);
      if (!match) {
        results.push({
          tabName: block.tabName,
          classRaw: block.classRaw,
          reflectionAddr: block.reflectionAddr,
          status: "skipped-no-rule",
        });
        continue;
      }

      const classId = match.fillAbsentee
        ? matchClassId(block.classRaw, classes, classAliases)
        : null;
      const dateISO = classId ? currentWeekDateForTab(block.tabName) : null;
      const info = classId && dateISO ? attendance[classId]?.[dateISO] ?? null : null;
      const previousShortNames =
        classId && dateISO ? previousAttendance[classId]?.[dateISO] ?? [] : [];

      if (classId && dateISO && info) {
        syncedAbsentees[classId] = syncedAbsentees[classId] ?? {};
        syncedAbsentees[classId][dateISO] = info.names.map(shortenName);
      }

      const next = applyReflectionTotals(block.reflectionText, match.totals, info, previousShortNames);
      if (next === block.reflectionText) {
        results.push({
          tabName: block.tabName,
          classRaw: block.classRaw,
          reflectionAddr: block.reflectionAddr,
          status: "unchanged",
        });
        continue;
      }
      updates.push({ tabName: block.tabName, addr: block.reflectionAddr, value: next });
      results.push({
        tabName: block.tabName,
        classRaw: block.classRaw,
        reflectionAddr: block.reflectionAddr,
        status: "updated",
      });
    }

    await batchUpdateCells(spreadsheetId, updates);

    return Response.json({
      ok: true,
      tabNames,
      blocks,
      results,
      updatedCount: updates.length,
      syncedAt: Date.now(),
      syncedAbsentees,
    });
  } catch (err) {
    if (err instanceof GoogleSheetsError) {
      const errorCode =
        err.kind === "not-shared"
          ? "not-shared"
          : err.kind === "not-found"
            ? "spreadsheet-not-found"
            : err.kind === "server-config"
              ? "server-config"
              : "sheets-api-error";
      return Response.json(
        {
          ok: false,
          error: errorCode,
          message: err.message,
          ...(err.kind === "not-shared"
            ? { serviceAccountEmail: serviceAccountEmail() ?? undefined }
            : {}),
        },
        { status: err.status }
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ ok: false, error: "sheets-api-error", message }, { status: 500 });
  }
}
