import { chromium } from "playwright-core";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const OUT = path.join(os.tmpdir(), "classtrack-shots");
fs.mkdirSync(OUT, { recursive: true });

const today = new Date().toISOString().split("T")[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

const POOL = [
  "Aisha Khan", "Ben Carter", "Chloe Davies", "Diego Morales", "Ella Brown",
  "Finn O'Connor", "Grace Lee", "Hassan Ali", "Isla Murphy", "Jack Wilson",
  "Kira Patel", "Liam Nguyen", "Maya Silva", "Noah Kim", "Olivia Costa",
  "Priya Shah", "Quinn Roberts", "Ravi Das", "Sofia Rossi", "Tomas Garcia",
  "Uma Reddy", "Victor Lim", "Wei Chen", "Xena Petrova", "Yusuf Demir", "Zoe Clark",
];
const CLASS_NAMES = ["2B", "2D", "2F", "1B", "1E"];
const STATUSES = ["present", "present", "present", "late", "present", "absent"];

function buildClassData(off) {
  const size = 14 + (off % 6); // 14–19 pupils
  const pupils = Array.from({ length: size }, (_, i) => ({
    id: `${off}-p${i}`,
    name: POOL[(off * 5 + i) % POOL.length],
  }));
  const assignments = ["Spelling", "Dictation", "Workbook", "PBD"].map((title, i) => ({
    id: `${off}-a${i}`,
    date: i < 2 ? today : yesterday,
    title,
  }));
  const submissions = {};
  assignments.forEach((a, ai) => {
    submissions[a.id] = {};
    pupils.forEach((p, pi) => (submissions[a.id][p.id] = (pi + ai + off) % 3 !== 0));
  });
  const attendance = { [today]: {} };
  pupils.forEach((p, i) => (attendance[today][p.id] = STATUSES[(i + off) % STATUSES.length]));
  const behavior = [
    { id: `${off}-b1`, pupilId: pupils[0].id, date: today, type: "positive", points: 3, note: "Helped a classmate with reading" },
    { id: `${off}-b2`, pupilId: pupils[3].id, date: today, type: "negative", points: 2, note: "Disrupted the lesson" },
    { id: `${off}-b3`, pupilId: pupils[5].id, date: yesterday, type: "positive", points: 2, note: "Excellent group work" },
  ];
  return { pupils, assignments, submissions, attendance, behavior };
}

const classes = CLASS_NAMES.map((name, i) => ({ id: `c${i}`, name }));
const data = {};
classes.forEach((c, i) => (data[c.id] = buildClassData(i)));
const seed = { classes, currentClassId: "c0", data };

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

await page.addInitScript((store) => {
  localStorage.setItem("pupil-tracker-v2", JSON.stringify(store));
}, seed);

await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(900);

const shot = async (name) => {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  console.log("saved", file);
};

await shot("class-2B-dashboard");

// Switch class via the picker, confirm data changes
await page.locator("#class-select").selectOption({ label: "Class 1B" });
await page.waitForTimeout(700);
await shot("class-1B-dashboard");

await page.getByRole("tab", { name: "Homework" }).click();
await page.waitForTimeout(700);
await shot("class-1B-homework");

await browser.close();
console.log("DIR", OUT);
