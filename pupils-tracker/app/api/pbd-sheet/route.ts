import { PBD_BI } from "@/lib/pbd-bi";
import {
  standardCodeSkill,
  sheetNameForSkill,
  findHeaderRow,
  findStandardColumn,
  buildPbdSheetUpdates,
} from "@/lib/pbd-sheet";
import { parseSpreadsheetId } from "@/lib/google-sheets-url";
import {
  getTabTitles,
  getWeekdayTabGrids,
  batchUpdateCells,
  serviceAccountEmail,
  GoogleSheetsError,
} from "@/lib/google-sheets";

// Fills one class's "Rekod Perkembangan Murid_BI" Google Sheet — a Band
// (Tahap Penguasaan, looked up from lib/pbd-bi.ts) for each present pupil,
// under whichever Listening/Speaking/Reading/Writing tab the given DSKP
// standard code belongs to. Manual, on-demand (triggered by the "Fill
// today's Band" button), not a background sync — see lib/pbd-sheet.ts.
// Auth follows the same Firebase-ID-token + per-uid rate limit pattern as
// app/api/lesson-plan-sheet.

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

interface FillRequestBody {
  spreadsheetUrl?: string;
  className?: string;
  standardCode?: string;
  dateISO?: string;
  presentNames?: string[];
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

  const body = (await request.json()) as FillRequestBody;
  const spreadsheetId = parseSpreadsheetId(body.spreadsheetUrl ?? "");
  if (!spreadsheetId) {
    return Response.json(
      { ok: false, error: "bad-url", message: "Paste a valid Google Sheets link." },
      { status: 400 }
    );
  }

  const className = (body.className ?? "").trim();
  const standardCode = (body.standardCode ?? "").trim();
  const dateISO = body.dateISO ?? "";
  const presentNames = body.presentNames ?? [];

  const skill = standardCodeSkill(standardCode);
  if (!skill) {
    return Response.json(
      {
        ok: false,
        error: "bad-standard",
        message: `"${standardCode}" doesn't look like a learning standard code (should start with 1-4, e.g. "1.2.1").`,
      },
      { status: 400 }
    );
  }

  const classReport = PBD_BI[className];
  if (!classReport) {
    return Response.json(
      { ok: false, error: "no-pbd-data", message: `No PBD data found for class "${className}".` },
      { status: 400 }
    );
  }

  const tabName = sheetNameForSkill(skill);

  try {
    const allTabs = await getTabTitles(spreadsheetId);
    if (!allTabs.includes(tabName)) {
      return Response.json(
        {
          ok: false,
          error: "standard-not-found",
          message: `This sheet has no "${tabName}" tab.`,
        },
        { status: 400 }
      );
    }

    const grids = await getWeekdayTabGrids(spreadsheetId, [tabName]);
    const grid = grids[tabName];
    const headerRow = grid ? findHeaderRow(grid) : null;
    if (!grid || headerRow === null) {
      return Response.json(
        {
          ok: false,
          error: "standard-not-found",
          message: `Could not find the "LEARNING STANDARD" header row in the "${tabName}" tab.`,
        },
        { status: 400 }
      );
    }

    const standardCol = findStandardColumn(grid, headerRow, standardCode);
    if (standardCol === null) {
      return Response.json(
        {
          ok: false,
          error: "standard-not-found",
          message: `Standard "${standardCode}" isn't a column in the "${tabName}" tab of this sheet.`,
        },
        { status: 400 }
      );
    }

    const { updates, results } = buildPbdSheetUpdates({
      grid,
      headerRow,
      standardCol,
      dateISO,
      presentNames,
      classReport,
      skill,
    });

    await batchUpdateCells(
      spreadsheetId,
      updates.map((u) => ({ tabName, addr: u.addr, value: u.value }))
    );

    return Response.json({
      ok: true,
      tabName,
      standardCode,
      results,
      updatedCount: updates.length,
      syncedAt: Date.now(),
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
