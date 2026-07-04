// Pure helper — safe to import from client or server code.

const SPREADSHEET_ID_RE = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/;

/** Extract the spreadsheet ID from a Google Sheets URL, or null if the URL
 *  doesn't look like one. */
export function parseSpreadsheetId(url: string): string | null {
  const m = url.trim().match(SPREADSHEET_ID_RE);
  return m ? m[1] : null;
}
