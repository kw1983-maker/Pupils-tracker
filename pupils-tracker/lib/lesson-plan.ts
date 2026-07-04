// Lesson-plan (RPH) parsing + attendance write-back for the weekly Google-Sheet
// export the teacher uploads as .xlsx. See docs: the workbook has one tab per
// weekday (ISNIN..JUMAAT), each stacking several RPH blocks (one per class the
// teacher teaches that day). Within a block the fields sit two columns right of
// their label (Class -> K8, Date -> D9, Time -> D10/F10, Topic -> D12) and the
// "Reflection" cell (a merged free-text cell) ends with a line like
// "3 /37  absentee. Name1, Name2" — that absentee line is what we fill.
//
// ExcelJS is dynamically imported so it never lands in the initial client bundle
// and never runs on the server. Types are imported type-only (erased at build).

import type { Cell, Worksheet } from "exceljs";
import type { Class } from "./types";

export interface PlanBlock {
  tabName: string; // ISNIN..JUMAAT
  classRaw: string; // e.g. "1B"
  dateISO: string | null; // from the Date cell, if parseable
  day: string; // Hari/Day text
  timeStart: string; // raw, e.g. "1:35 p.m."
  timeEnd: string;
  startMin: number | null; // minutes past midnight (for "class active now")
  endMin: number | null;
  topic: string;
  subject: string;
  reflectionAddr: string | null; // master cell address of the Reflection cell
  reflectionText: string; // its current text (base for the absentee rewrite)
}

export interface ParsedPlan {
  fileName: string;
  updatedAt: number;
  tabNames: string[]; // weekday tabs found in the file
  blocks: PlanBlock[];
}

export interface AbsenteeInfo {
  absent: number;
  total: number;
  names: string[];
}

// Weekday tab names (Malay), Monday..Friday, in order.
const WEEKDAY_TABS = ["ISNIN", "SELASA", "RABU", "KHAMIS", "JUMAAT"];
const WEEKDAY_INDEX: Record<string, number> = {
  ISNIN: 1,
  SELASA: 2,
  RABU: 3,
  KHAMIS: 4,
  JUMAAT: 5,
};

// Both languages: the real day tabs use English labels, the TEMPLATE uses Malay.
const LABELS = {
  class: /^(class|kelas)\b/i,
  date: /^(date|tarikh)\b/i,
  day: /^(day|hari)\b/i,
  time: /^(time|masa)\b/i,
  topic: /^(topic|tajuk|theme|title)\b/i,
  reflection: /(reflection|impak|refleksi)/i,
  to: /^(to|hingga)$/i,
};

// ---- cell reading helpers ----

function cellText(value: Cell["value"] | undefined): string {
  const v = value;
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (Array.isArray(o.richText)) {
      return (o.richText as { text?: string }[])
        .map((t) => (t && t.text ? t.text : ""))
        .join("");
    }
    if (o.text != null) return typeof o.text === "string" ? o.text : "";
    if (o.result != null)
      return typeof o.result === "object" ? "" : String(o.result);
  }
  return "";
}

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

// A value normally lives two columns right of its label (label, ":", value).
// Fall back to +1 / +3 / +4 in case a colon was omitted or merged differently.
function valueRightOf(
  ws: Worksheet,
  row: number,
  labelCol: number
): { text: string; cell: Cell } {
  for (const off of [2, 1, 3, 4]) {
    const cell = ws.getCell(row, labelCol + off);
    const t = norm(cellText(cell.value));
    if (t && !/^:$/.test(t)) return { text: t, cell };
  }
  return { text: "", cell: ws.getCell(row, labelCol + 2) };
}

function toISO(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

function parseDateCell(cell: Cell): string | null {
  const v = cell.value;
  if (v instanceof Date) return toISO(v);
  const t = norm(cellText(v));
  if (!t) return null;
  const m = t.match(/(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
  if (m) {
    const [, d, mo, yy] = m;
    const y = yy.length === 2 ? "20" + yy : yy;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const dt = new Date(t);
  if (!isNaN(dt.getTime())) return toISO(dt);
  return null;
}

/** "1:35 p.m." / "13:35" -> minutes past midnight, or null. */
export function timeToMinutes(raw: string): number | null {
  const t = norm(raw);
  if (!t) return null;
  const m = t.match(/(\d{1,2})[:.](\d{2})\s*([ap])\.?\s*\.?\s*m/i) ||
    t.match(/(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  let h = +m[1];
  const min = +m[2];
  const ap = m[3]?.toLowerCase();
  if (ap === "p" && h < 12) h += 12;
  if (ap === "a" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function findTimeEnd(ws: Worksheet, row: number, timeLabelCol: number): string {
  for (let c = timeLabelCol + 1; c <= 14; c++) {
    if (LABELS.to.test(norm(cellText(ws.getCell(row, c).value)))) {
      for (let d = c + 1; d <= c + 4; d++) {
        const t = norm(cellText(ws.getCell(row, d).value));
        if (t) return t;
      }
    }
  }
  return norm(cellText(ws.getCell(row, timeLabelCol + 4).value));
}

// ---- block parsing ----

function buildBlock(
  ws: Worksheet,
  tab: string,
  classCell: { row: number; col: number },
  endRow: number
): PlanBlock | null {
  const classRaw = valueRightOf(ws, classCell.row, classCell.col).text;
  if (!classRaw) return null;

  let dateISO: string | null = null;
  let day = "";
  let timeStart = "";
  let timeEnd = "";
  let topic = "";
  let subject = "";
  let reflectionAddr: string | null = null;
  let reflectionText = "";

  const startRow = Math.max(1, classCell.row - 2);
  for (let r = startRow; r < endRow; r++) {
    for (let c = 1; c <= 14; c++) {
      const label = norm(cellText(ws.getCell(r, c).value));
      if (!label) continue;
      if (!dateISO && LABELS.date.test(label)) {
        dateISO = parseDateCell(valueRightOf(ws, r, c).cell);
      } else if (!day && LABELS.day.test(label)) {
        day = valueRightOf(ws, r, c).text;
      } else if (!timeStart && LABELS.time.test(label)) {
        timeStart = valueRightOf(ws, r, c).text;
        timeEnd = findTimeEnd(ws, r, c);
      } else if (!topic && LABELS.topic.test(label)) {
        topic = valueRightOf(ws, r, c).text;
      } else if (!subject && /^(subject|mata pelajaran)\b/i.test(label)) {
        subject = valueRightOf(ws, r, c).text;
      } else if (!reflectionAddr && LABELS.reflection.test(label)) {
        // Reflection value is the merged free-text cell to the right (col D).
        const rc = ws.getCell(r, c + 2);
        const master = (rc as unknown as { master?: Cell }).master;
        const cell = master && master !== rc ? master : rc;
        reflectionAddr = cell.address;
        reflectionText = cellText(cell.value);
      }
    }
  }

  return {
    tabName: tab,
    classRaw,
    dateISO,
    day,
    timeStart,
    timeEnd,
    startMin: timeToMinutes(timeStart),
    endMin: timeToMinutes(timeEnd),
    topic,
    subject,
    reflectionAddr,
    reflectionText,
  };
}

function parseSheetBlocks(ws: Worksheet, tab: string, out: PlanBlock[]): void {
  const classPositions: { row: number; col: number }[] = [];
  const maxRow = Math.min(ws.rowCount || 0, 800);
  ws.eachRow({ includeEmpty: false }, (row, r) => {
    if (r > maxRow) return;
    row.eachCell({ includeEmpty: false }, (cell, c) => {
      if (LABELS.class.test(norm(cellText(cell.value)))) {
        classPositions.push({ row: r, col: c });
      }
    });
  });
  for (let i = 0; i < classPositions.length; i++) {
    const nextRow =
      i + 1 < classPositions.length
        ? classPositions[i + 1].row
        : classPositions[i].row + 55;
    const block = buildBlock(ws, tab, classPositions[i], nextRow);
    if (block) out.push(block);
  }
}

/** Parse an uploaded .xlsx into the weekday blocks the app cares about. */
export async function parseWorkbook(
  bytes: ArrayBuffer,
  fileName: string
): Promise<ParsedPlan> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes);
  const blocks: PlanBlock[] = [];
  const tabNames: string[] = [];
  for (const tab of WEEKDAY_TABS) {
    const ws = wb.getWorksheet(tab);
    if (!ws) continue;
    tabNames.push(tab);
    parseSheetBlocks(ws, tab, blocks);
  }
  return { fileName, updatedAt: Date.now(), tabNames, blocks };
}

// ---- class matching ----

export function normClass(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Map a sheet "Class" value to an app class id. Exact match first (the real
 *  files already use "1B"/"2D"/… names), then a teacher-set alias, then a
 *  loose "year digit + first letter" guess (e.g. "2 Bestari" -> 2B). */
export function matchClassId(
  classRaw: string,
  classes: Class[],
  aliases: Record<string, string> = {}
): string | null {
  const n = normClass(classRaw);
  if (!n) return null;
  const exact = classes.find((c) => normClass(c.name) === n);
  if (exact) return exact.id;
  if (aliases[n]) return aliases[n];
  const m = classRaw.match(/(\d)\s*([A-Za-z])/);
  if (m) {
    const key = (m[1] + m[2]).toUpperCase();
    const c = classes.find((cl) => normClass(cl.name) === key);
    if (c) return c.id;
  }
  return null;
}

// ---- "today" selection ----

// JS getDay(): 0=Sun..6=Sat. Map Mon..Fri to their weekday tab.
const JS_DAY_TO_TAB: Record<number, string> = {
  1: "ISNIN",
  2: "SELASA",
  3: "RABU",
  4: "KHAMIS",
  5: "JUMAAT",
};

export function todayTabName(d: Date = new Date()): string | null {
  return JS_DAY_TO_TAB[d.getDay()] ?? null;
}

export function blocksForTab(plan: ParsedPlan, tab: string): PlanBlock[] {
  return plan.blocks.filter((b) => b.tabName === tab);
}

/** The block whose time window contains `now`, or null. */
export function pickCurrentBlock(
  blocks: PlanBlock[],
  now: Date = new Date()
): PlanBlock | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  return (
    blocks.find(
      (b) =>
        b.startMin != null &&
        b.endMin != null &&
        mins >= b.startMin &&
        mins <= b.endMin
    ) ?? null
  );
}

/** The current-week calendar date (YYYY-MM-DD, UTC — matching the store's
 *  attendance keys) for a weekday tab. Used to look up recorded attendance. */
export function currentWeekDateForTab(
  tab: string,
  today: Date = new Date()
): string | null {
  const idx = WEEKDAY_INDEX[tab];
  if (!idx) return null;
  // Monday-based day number 1..7 in UTC.
  const g = today.getUTCDay() === 0 ? 7 : today.getUTCDay();
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - (g - 1));
  const d = new Date(monday);
  d.setUTCDate(monday.getUTCDate() + (idx - 1));
  return toISO(d);
}

// ---- attendance write-back ----

/** Rewrite the "N /M  absentee. names" line of a reflection cell's text,
 *  preserving the sheet's existing total (M) and all other lines. */
export function updateAbsenteeLine(text: string, info: AbsenteeInfo): string {
  const namePart = info.names.length ? ` ${info.names.join(", ")}` : "";
  const reEn = /(\d+)\s*\/\s*(\d+)?\s*absentee\.?[^\n]*/i;
  const reMs = /(\d+)?\s*\/?\s*(\d+)?\s*orang murid tidak hadir[^\n]*/i;
  if (reEn.test(text)) {
    return text.replace(
      reEn,
      (_m, _n, m) => `${info.absent} /${m || info.total}  absentee.${namePart}`
    );
  }
  if (reMs.test(text)) {
    return text.replace(
      reMs,
      (_m, _n, m) =>
        `${info.absent} / ${m || info.total} orang murid tidak hadir.${namePart}`
    );
  }
  const sep = text && !text.endsWith("\n") ? "\n" : "";
  return `${text}${sep}${info.absent} /${info.total}  absentee.${namePart}`;
}

export interface FillContext {
  resolveClassId: (classRaw: string) => string | null;
  /** Absentee info for a class on a date, or null to leave that block as-is. */
  getAbsenteeInfo: (classId: string, dateISO: string) => AbsenteeInfo | null;
  today?: Date;
}

// ---- surgical .xlsx writing (fflate) ----
//
// We do NOT re-serialize the whole workbook (ExcelJS mangles complex files and
// Excel then reports them corrupt). Instead we unzip, patch only the target
// Reflection cell inside its sheet's XML, and re-zip every other part
// byte-for-byte unchanged — so Excel always opens the result.

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Map each worksheet's display name to its part path (xl/worksheets/sheetN.xml). */
function sheetPathByName(
  files: Record<string, Uint8Array>,
  fromU8: (u: Uint8Array) => string
): Record<string, string> {
  const wbXml = files["xl/workbook.xml"] ? fromU8(files["xl/workbook.xml"]) : "";
  const relsXml = files["xl/_rels/workbook.xml.rels"]
    ? fromU8(files["xl/_rels/workbook.xml.rels"])
    : "";
  const ridToTarget: Record<string, string> = {};
  for (const tag of relsXml.match(/<Relationship\b[^>]*\/?>/g) ?? []) {
    const id = tag.match(/\bId="([^"]+)"/)?.[1];
    const target = tag.match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) ridToTarget[id] = target;
  }
  const nameToPath: Record<string, string> = {};
  for (const tag of wbXml.match(/<sheet\b[^>]*\/?>/g) ?? []) {
    const name = tag.match(/\bname="([^"]+)"/)?.[1];
    const rid = tag.match(/\br:id="([^"]+)"/)?.[1];
    if (!name || !rid) continue;
    let target = ridToTarget[rid];
    if (!target) continue;
    target = target.replace(/^\/xl\//, "").replace(/^\//, "");
    nameToPath[name] = target.startsWith("xl/") ? target : `xl/${target}`;
  }
  return nameToPath;
}

/** Replace one cell (by address) with an inline string, preserving its style
 *  index. Returns the new XML, or null if the cell wasn't found. */
function setCellInlineString(
  xml: string,
  addr: string,
  text: string
): string | null {
  const re = new RegExp(`<c r="${addr}"([^>]*?)(?:/>|>[\\s\\S]*?</c>)`);
  if (!re.test(xml)) return null;
  return xml.replace(re, (_whole, attrs: string) => {
    const styled = attrs.replace(/\s+t="[^"]*"/, "");
    return `<c r="${addr}"${styled} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(
      text
    )}</t></is></c>`;
  });
}

/** Fill every block we can resolve, from the app's attendance records, editing
 *  only the Reflection cells and leaving the rest of the workbook untouched.
 *  Blocks with no recorded attendance for their date are left as-is. */
export async function fillPlan(
  bytes: ArrayBuffer,
  plan: ParsedPlan,
  ctx: FillContext
): Promise<{ bytes: ArrayBuffer; filled: number }> {
  const { unzipSync, zipSync, strFromU8, strToU8 } = await import("fflate");
  const files = unzipSync(new Uint8Array(bytes));
  const pathByName = sheetPathByName(files, strFromU8);
  // Cache decoded sheet XML so several blocks in one tab share one edit pass.
  const sheetXml: Record<string, string> = {};

  let filled = 0;
  for (const block of plan.blocks) {
    if (!block.reflectionAddr) continue;
    const classId = ctx.resolveClassId(block.classRaw);
    if (!classId) continue;
    const dateISO = currentWeekDateForTab(block.tabName, ctx.today);
    if (!dateISO) continue;
    const info = ctx.getAbsenteeInfo(classId, dateISO);
    if (!info) continue;
    const path = pathByName[block.tabName];
    if (!path || !files[path]) continue;

    if (sheetXml[path] == null) sheetXml[path] = strFromU8(files[path]);
    const next = updateAbsenteeLine(block.reflectionText, info);
    const patched = setCellInlineString(sheetXml[path], block.reflectionAddr, next);
    if (patched == null) continue;
    sheetXml[path] = patched;
    filled++;
  }

  for (const [path, xml] of Object.entries(sheetXml)) {
    files[path] = strToU8(xml);
  }
  const out = zipSync(files);
  return { bytes: out.buffer as ArrayBuffer, filled };
}
