import { PBD_BI } from "@/lib/pbd-bi";
import {
  standardCodeSkill,
  sheetNameForSkill,
  biTabSearchOrder,
  findBiStandardLocation,
  buildPbdSheetUpdates,
} from "@/lib/pbd-sheet";
import {
  pjTabTitles,
  findPjStandardColumns,
  pickPjColumn,
  buildPjSheetUpdates,
} from "@/lib/pbd-pj-sheet";
import { isPjRekodTabs, looksLikeStandardCode } from "@/lib/pbd-subjects";
import { parseSpreadsheetId } from "@/lib/google-sheets-url";
import {
  getTabTitles,
  getSheetIds,
  getWeekdayTabGrids,
  batchUpdateCells,
  setDateCells,
  parseA1,
  serviceAccountEmail,
  GoogleSheetsError,
} from "@/lib/google-sheets";

// Fills one class's Rekod Perkembangan Murid Google Sheet — either the BI
// template (Listening/Speaking/Reading/Writing/Language Arts tabs + PBD_BI
// scores) or the PJ template (kemahiran1 / kemahiran2 / kecergasan + average
// existing TP). Layout is auto-detected from the spreadsheet's tab names.
// Auth follows Firebase-ID-token + per-uid rate limit like lesson-plan-sheet.

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

async function writeUpdates(
  spreadsheetId: string,
  tabName: string,
  updates: { addr: string; value: string; kind: "name" | "value" | "date" }[]
) {
  const plainUpdates = updates.filter((u) => u.kind !== "date");
  const dateUpdates = updates.filter((u) => u.kind === "date");

  await batchUpdateCells(
    spreadsheetId,
    plainUpdates.map((u) => ({ tabName, addr: u.addr, value: u.value })),
    "USER_ENTERED"
  );

  if (dateUpdates.length > 0) {
    const sheetIds = await getSheetIds(spreadsheetId);
    const sheetId = sheetIds[tabName];
    if (sheetId !== undefined) {
      await setDateCells(
        spreadsheetId,
        dateUpdates.map((u) => {
          const { row0, col0 } = parseA1(u.addr);
          return { sheetId, row0, col0, dateISO: u.value };
        })
      );
    }
  }
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

  if (!looksLikeStandardCode(standardCode)) {
    return Response.json(
      {
        ok: false,
        error: "bad-standard",
        message: `"${standardCode}" doesn't look like a learning standard code (e.g. "1.2.1").`,
      },
      { status: 400 }
    );
  }

  try {
    const allTabs = await getTabTitles(spreadsheetId);

    if (isPjRekodTabs(allTabs)) {
      const tabs = pjTabTitles(allTabs);
      if (tabs.length === 0) {
        return Response.json(
          {
            ok: false,
            error: "standard-not-found",
            message: "This PJ sheet has no kemahiran1 / kemahiran2 / kecergasan tabs.",
          },
          { status: 400 }
        );
      }

      const grids = await getWeekdayTabGrids(spreadsheetId, tabs);
      const targets = findPjStandardColumns(grids, standardCode);
      if (targets.length === 0) {
        return Response.json(
          {
            ok: false,
            error: "standard-not-found",
            message: `Standard "${standardCode}" isn't listed in any TP column of this PJ sheet.`,
          },
          { status: 400 }
        );
      }

      const target = pickPjColumn(grids, targets);
      if (!target) {
        if (targets.length > 0) {
          return Response.json({
            ok: true,
            tabName: targets[0]!.tabName,
            standardCode,
            layout: "PJ",
            skipReason: "column-already-filled",
            results: [],
            updatedCount: 0,
            syncedAt: Date.now(),
          });
        }
        return Response.json(
          {
            ok: false,
            error: "standard-not-found",
            message: `Could not pick a column for standard "${standardCode}".`,
          },
          { status: 400 }
        );
      }

      const { tabName, updates, results } = buildPjSheetUpdates({
        grids,
        target,
        dateISO,
        presentNames,
      });

      await writeUpdates(spreadsheetId, tabName, updates);

      return Response.json({
        ok: true,
        tabName,
        standardCode,
        layout: "PJ",
        results,
        updatedCount: updates.length,
        syncedAt: Date.now(),
      });
    }

    // ---- BI layout ----
    const skill = standardCodeSkill(standardCode);
    if (!skill) {
      return Response.json(
        {
          ok: false,
          error: "bad-standard",
          message: `"${standardCode}" doesn't look like a BI learning standard code (should start with 1-5, e.g. "1.2.1" or "5.1.1").`,
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

    const tabOrder = biTabSearchOrder(allTabs, skill);
    if (tabOrder.length === 0) {
      return Response.json(
        {
          ok: false,
          error: "standard-not-found",
          message: `This sheet has no tabs to search for "${sheetNameForSkill(skill)}".`,
        },
        { status: 400 }
      );
    }

    const grids = await getWeekdayTabGrids(spreadsheetId, tabOrder);
    const location = findBiStandardLocation(grids, tabOrder, standardCode);
    if (!location) {
      const preferred = sheetNameForSkill(skill);
      const tabList = allTabs.length > 0 ? allTabs.join(", ") : "(none)";
      return Response.json(
        {
          ok: false,
          error: "standard-not-found",
          message: `Standard "${standardCode}" wasn't found under "${preferred}" (or any other tab). Tabs in this sheet: ${tabList}.`,
        },
        { status: 400 }
      );
    }

    const { tabName, headerRow, standardCol } = location;
    const grid = grids[tabName]!;

    const { updates, results, skipReason } = buildPbdSheetUpdates({
      grid,
      headerRow,
      standardCol,
      dateISO,
      presentNames,
      classReport,
      skill,
    });

    if (skipReason === "column-already-filled") {
      return Response.json({
        ok: true,
        tabName,
        standardCode,
        layout: "BI",
        skipReason,
        results: [],
        updatedCount: 0,
        syncedAt: Date.now(),
      });
    }

    await writeUpdates(spreadsheetId, tabName, updates);

    return Response.json({
      ok: true,
      tabName,
      standardCode,
      layout: "BI",
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
