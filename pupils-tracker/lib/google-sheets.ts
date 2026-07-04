// Server-only Google Sheets client for the live lesson-plan sync. Never
// imported by a client component — it reads GOOGLE_SHEETS_CLIENT_EMAIL /
// GOOGLE_SHEETS_PRIVATE_KEY from process.env and talks to the Sheets API with
// a hand-rolled service-account JWT (matching this repo's existing convention
// of raw `fetch` calls per app/api/* route rather than provider SDKs — see
// app/api/quiz-generate/route.ts's Identity Toolkit call).

import { createSign } from "crypto";
import type { GridSource } from "./lesson-plan";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export type GoogleSheetsErrorKind = "not-shared" | "not-found" | "server-config" | "other";

export class GoogleSheetsError extends Error {
  kind: GoogleSheetsErrorKind;
  status: number;
  constructor(kind: GoogleSheetsErrorKind, status: number, message: string) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

export function serviceAccountEmail(): string | null {
  return process.env.GOOGLE_SHEETS_CLIENT_EMAIL ?? null;
}

function credentials(): { clientEmail: string; privateKey: string } {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  if (!clientEmail || !privateKeyRaw) {
    throw new GoogleSheetsError(
      "server-config",
      500,
      "Google Sheets credentials are not configured on the server."
    );
  }
  // .env files can't hold real newlines on one line, so the PEM's newlines
  // are stored as literal "\n" and restored here.
  return { clientEmail, privateKey: privateKeyRaw.replace(/\\n/g, "\n") };
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signJwt(clientEmail: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64url(signer.sign(privateKey));
  return `${unsigned}.${signature}`;
}

// Cached across warm invocations of the same server instance (best-effort —
// a cold start just re-mints a token, which is cheap).
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const { clientEmail, privateKey } = credentials();
  const assertion = signJwt(clientEmail, privateKey);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new GoogleSheetsError(
      "server-config",
      500,
      "Could not authenticate with Google Sheets — check the service account credentials."
    );
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

function classifyError(status: number): GoogleSheetsError {
  if (status === 403) {
    return new GoogleSheetsError(
      "not-shared",
      403,
      "This sheet isn't shared with the sync service account yet."
    );
  }
  if (status === 404) {
    return new GoogleSheetsError("not-found", 404, "This spreadsheet could not be found.");
  }
  return new GoogleSheetsError("other", status, "The Google Sheets request failed.");
}

async function sheetsFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  return fetch(`${SHEETS_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      authorization: `Bearer ${token}`,
    },
  });
}

/** Every tab title present in the spreadsheet (weekday tabs and anything else). */
export async function getTabTitles(spreadsheetId: string): Promise<string[]> {
  const res = await sheetsFetch(`/${spreadsheetId}?fields=sheets.properties.title`);
  if (!res.ok) throw classifyError(res.status);
  const data = (await res.json()) as {
    sheets?: { properties?: { title?: string } }[];
  };
  return (data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => !!t);
}

interface RawGrid {
  rowData: { values?: { formattedValue?: string }[] }[];
  merges: {
    startRowIndex: number;
    endRowIndex: number;
    startColumnIndex: number;
    endColumnIndex: number;
  }[];
}

/** One batched `spreadsheets.get` for every requested (existing) tab, with
 *  grid values + merge info — everything `parseGridBlocks` needs. */
async function getWeekdayGrids(
  spreadsheetId: string,
  tabTitles: string[]
): Promise<Record<string, RawGrid>> {
  if (tabTitles.length === 0) return {};
  const params = tabTitles
    .map((t) => `ranges=${encodeURIComponent(t)}`)
    .join("&");
  const fields = encodeURIComponent(
    "sheets(properties.title,merges,data.rowData.values.formattedValue)"
  );
  const res = await sheetsFetch(
    `/${spreadsheetId}?${params}&includeGridData=true&fields=${fields}`
  );
  if (!res.ok) throw classifyError(res.status);
  const data = (await res.json()) as {
    sheets?: {
      properties?: { title?: string };
      merges?: RawGrid["merges"];
      data?: { rowData?: RawGrid["rowData"] }[];
    }[];
  };
  const out: Record<string, RawGrid> = {};
  for (const sheet of data.sheets ?? []) {
    const title = sheet.properties?.title;
    if (!title) continue;
    out[title] = {
      rowData: sheet.data?.[0]?.rowData ?? [],
      merges: sheet.merges ?? [],
    };
  }
  return out;
}

function colToLetters(col: number): string {
  let n = col;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function a1(row: number, col: number): string {
  return `${colToLetters(col)}${row}`;
}

/** Adapt one tab's raw Sheets API grid (0-based) into the 1-based, merge-aware
 *  `GridSource` view `parseGridBlocks` scans. */
function toGridSource(raw: RawGrid): GridSource {
  const { rowData, merges } = raw;

  function rawText(row0: number, col0: number): string {
    return rowData[row0]?.values?.[col0]?.formattedValue ?? "";
  }

  function findMerge(row0: number, col0: number) {
    return merges.find(
      (m) =>
        row0 >= m.startRowIndex &&
        row0 < m.endRowIndex &&
        col0 >= m.startColumnIndex &&
        col0 < m.endColumnIndex
    );
  }

  return {
    maxRow: rowData.length,
    cellText(row: number, col: number): string {
      const merge = findMerge(row - 1, col - 1);
      if (merge) return rawText(merge.startRowIndex, merge.startColumnIndex);
      return rawText(row - 1, col - 1);
    },
    cellAddress(row: number, col: number): string {
      const merge = findMerge(row - 1, col - 1);
      if (merge) return a1(merge.startRowIndex + 1, merge.startColumnIndex + 1);
      return a1(row, col);
    },
  };
}

/** Fetch every weekday tab that exists in the spreadsheet, already adapted to
 *  `GridSource`, keyed by tab name. */
export async function getWeekdayTabGrids(
  spreadsheetId: string,
  tabTitles: string[]
): Promise<Record<string, GridSource>> {
  const raw = await getWeekdayGrids(spreadsheetId, tabTitles);
  const out: Record<string, GridSource> = {};
  for (const [title, grid] of Object.entries(raw)) {
    out[title] = toGridSource(grid);
  }
  return out;
}

/** Write only the given (tabName, A1 address) cells, one batched request. */
export async function batchUpdateCells(
  spreadsheetId: string,
  updates: { tabName: string; addr: string; value: string }[]
): Promise<void> {
  if (updates.length === 0) return;
  const res = await sheetsFetch(`/${spreadsheetId}/values:batchUpdate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      valueInputOption: "RAW",
      data: updates.map((u) => ({
        range: `'${u.tabName}'!${u.addr}`,
        values: [[u.value]],
      })),
    }),
  });
  if (!res.ok) throw classifyError(res.status);
}
