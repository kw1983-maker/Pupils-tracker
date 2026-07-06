// Lesson-plan (RPH) parsing + attendance write-back for the teacher's weekly
// Google Sheet, read and written live via the Sheets API (see
// lib/google-sheets.ts). The sheet has one tab per weekday (ISNIN..JUMAAT),
// each stacking several RPH blocks (one per class the teacher teaches that
// day). Within a block the fields sit two columns right of their label
// (Class -> K8, Date -> D9, Time -> D10/F10, Topic -> D12) and the
// "Reflection" cell (a merged free-text cell) ends with a line like
// "3 /37  absentee. Name1, Name2" — that absentee line is what we fill.
//
// This module is IO-agnostic: `parseGridBlocks` scans a `GridSource` (a thin
// read interface `lib/google-sheets.ts` implements over Sheets API grid data)
// using the exact same label-scanning algorithm regardless of where the grid
// came from. Everything below the parsing step is pure string manipulation
// and has no dependency on the data source.

import type { Class } from "./types";
import type { ClassTotals } from "./class-totals";
import { shortenName } from "./pupil-name";

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
  reflectionAddr: string | null; // A1 address of the Reflection cell
  reflectionText: string; // its current text (base for the absentee rewrite)
}

export interface ParsedPlan {
  sourceUrl: string;
  updatedAt: number;
  tabNames: string[]; // weekday tabs found in the sheet
  blocks: PlanBlock[];
}

export interface AbsenteeInfo {
  absent: number;
  total: number;
  names: string[];
}

// Weekday tab names (Malay), Monday..Friday, in order.
export const WEEKDAY_TABS = ["ISNIN", "SELASA", "RABU", "KHAMIS", "JUMAAT"];
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

// ---- grid reading (data-source-agnostic) ----

/** A 1-based read view over a spreadsheet tab. `cellText` and `cellAddress`
 *  are merge-aware: for any cell within a merged range they resolve to the
 *  merge's top-left cell (matching a "Reflection" cell that spans several
 *  rows/columns but only carries text in its top-left cell). */
export interface GridSource {
  maxRow: number;
  cellText(row: number, col: number): string;
  cellAddress(row: number, col: number): string;
}

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function toISO(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

function parseDateText(raw: string): string | null {
  const t = norm(raw);
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

// A value normally lives two columns right of its label (label, ":", value).
// Fall back to +1 / +3 / +4 in case a colon was omitted or merged differently.
function valueRightOf(
  grid: GridSource,
  row: number,
  labelCol: number
): { text: string; col: number } {
  for (const off of [2, 1, 3, 4]) {
    const col = labelCol + off;
    const t = norm(grid.cellText(row, col));
    if (t && !/^:$/.test(t)) return { text: t, col };
  }
  return { text: "", col: labelCol + 2 };
}

function findTimeEnd(grid: GridSource, row: number, timeLabelCol: number): string {
  for (let c = timeLabelCol + 1; c <= 14; c++) {
    if (LABELS.to.test(norm(grid.cellText(row, c)))) {
      for (let d = c + 1; d <= c + 4; d++) {
        const t = norm(grid.cellText(row, d));
        if (t) return t;
      }
    }
  }
  return norm(grid.cellText(row, timeLabelCol + 4));
}

// ---- block parsing ----

function buildGridBlock(
  grid: GridSource,
  tab: string,
  classCell: { row: number; col: number },
  endRow: number
): PlanBlock | null {
  const classRaw = valueRightOf(grid, classCell.row, classCell.col).text;
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
      const label = norm(grid.cellText(r, c));
      if (!label) continue;
      if (!dateISO && LABELS.date.test(label)) {
        dateISO = parseDateText(valueRightOf(grid, r, c).text);
      } else if (!day && LABELS.day.test(label)) {
        day = valueRightOf(grid, r, c).text;
      } else if (!timeStart && LABELS.time.test(label)) {
        timeStart = valueRightOf(grid, r, c).text;
        timeEnd = findTimeEnd(grid, r, c);
      } else if (!topic && LABELS.topic.test(label)) {
        topic = valueRightOf(grid, r, c).text;
      } else if (!subject && /^(subject|mata pelajaran)\b/i.test(label)) {
        subject = valueRightOf(grid, r, c).text;
      } else if (!reflectionAddr && LABELS.reflection.test(label)) {
        // Reflection value is the merged free-text cell to the right (col D).
        reflectionAddr = grid.cellAddress(r, c + 2);
        reflectionText = grid.cellText(r, c + 2);
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

/** Scan one weekday tab's grid for RPH blocks (one per "Class"/"Kelas" label
 *  found), matching the layout of the real weekly plan sheet. */
export function parseGridBlocks(grid: GridSource, tabName: string): PlanBlock[] {
  const out: PlanBlock[] = [];
  const classPositions: { row: number; col: number }[] = [];
  const maxRow = Math.min(grid.maxRow, 800);
  for (let r = 1; r <= maxRow; r++) {
    for (let c = 1; c <= 14; c++) {
      if (LABELS.class.test(norm(grid.cellText(r, c)))) {
        classPositions.push({ row: r, col: c });
      }
    }
  }
  for (let i = 0; i < classPositions.length; i++) {
    const nextRow =
      i + 1 < classPositions.length
        ? classPositions[i + 1].row
        : classPositions[i].row + 55;
    const block = buildGridBlock(grid, tabName, classPositions[i], nextRow);
    if (block) out.push(block);
  }
  return out;
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

/** The block whose time window contains `now`, or null if none or more than one
 *  match (ambiguous — safer not to guess than to auto-switch to the wrong class). */
export function pickCurrentBlock(
  blocks: PlanBlock[],
  now: Date = new Date()
): PlanBlock | null {
  const todayISO = toISO(now);
  const mins = now.getHours() * 60 + now.getMinutes();
  const matches = blocks.filter(
    (b) =>
      (b.dateISO == null || b.dateISO === todayISO) &&
      b.startMin != null &&
      b.endMin != null &&
      mins >= b.startMin &&
      mins < b.endMin
  );
  return matches.length === 1 ? matches[0] : null;
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

// Fix the denominator that appears AFTER a category keyword: "Enrichment : N /D"
// -> keep N (the teacher's numerator), set D to the reference total.
function fixDenomAfter(text: string, keywords: string, denom: number): string {
  const re = new RegExp(`(${keywords})([^\\d/\\n]*?\\d*\\s*/\\s*)(\\d+)`, "i");
  return text.replace(re, (_m, kw, mid) => `${kw}${mid}${denom}`);
}

// Fix the denominator that appears BEFORE a keyword on the same line:
// "N /D  pupils are not able…" / "N /D absentee" -> keep N, set D.
function fixDenomBefore(text: string, keywords: string, denom: number): string {
  const re = new RegExp(`(/\\s*)(\\d+)(\\s*[^/\\n]*?(?:${keywords}))`, "i");
  return text.replace(re, (_m, pre, _d, post) => `${pre}${denom}${post}`);
}

// Absentees automatically count as not achieving the objective, so append their
// names to the end of the "…not able to achieve…" line (after the teacher's own
// names). Idempotent per fill — the base text always comes from the original.
function appendNotAchievedNames(text: string, names: string[]): string {
  if (names.length === 0) return text;
  const joined = names.join(", ");
  const re = /[^\n]*(?:not able to achieve|tidak berjaya|不能掌握)[^\n]*/i;
  return text.replace(re, (line) => {
    const t = line.replace(/\s+$/, "");
    const sep = /[.。．]$/.test(t) ? " " : ", ";
    return `${t}${sep}${joined}`;
  });
}

/** Correct a Reflection cell's denominators to the class reference and (when
 *  attendance is known) fill the absentee count. Numerators for Enrichment/
 *  Engagement/Remedial and the "not able to achieve" line are left untouched —
 *  the teacher fills those. */
export function applyReflectionTotals(
  text: string,
  totals: ClassTotals,
  info: AbsenteeInfo | null
): string {
  let out = text;
  out = fixDenomAfter(out, "Enrichment|Pengayaan|增广", totals.enrichment);
  out = fixDenomAfter(out, "Engagement|Pengukuhan|巩固", totals.engagement);
  out = fixDenomAfter(out, "Remedial|Pemulihan|补救|辅导|辅助", totals.remedial);
  out = fixDenomBefore(
    out,
    "pupils?\\s+are\\s+not\\s+able\\s+to\\s+achieve|tidak\\s+berjaya|不能掌握",
    totals.total
  );
  if (info) {
    // Shorten names for the sheet, e.g. "HO MING JIA" -> "Ming Jia".
    const shortNames = info.names.map(shortenName);
    const namePart = shortNames.length ? ` ${shortNames.join(", ")}` : "";
    const reEn = /(?:\d+\s*)?\/\s*\d*\s*absentee\b\.?[^\n]*/i;
    const reMs = /(?:\d+\s*)?\/?\s*\d*\s*orang murid tidak hadir[^\n]*/i;
    if (reEn.test(out))
      out = out.replace(reEn, `${info.absent} /${totals.total}  absentee.${namePart}`);
    else if (reMs.test(out))
      out = out.replace(
        reMs,
        `${info.absent} / ${totals.total} orang murid tidak hadir.${namePart}`
      );
    // Absentees also count as not achieving — copy their names one line up.
    out = appendNotAchievedNames(out, shortNames);
  } else {
    // No attendance (or a PE/PK block): correct the absentee denominator only,
    // keeping the numerator. Covers English, Malay and Chinese wording.
    out = fixDenomBefore(out, "absentee|tidak hadir|缺席", totals.total);
  }
  return out;
}
