import { chromium } from "playwright-core";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const OUT = path.join(os.tmpdir(), "classtrack-shots");
fs.mkdirSync(OUT, { recursive: true });

const today = new Date().toISOString().split("T")[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
const twoAgo = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];

const pupils = [
  "Aisha Khan", "Ben Carter", "Chloe Davies", "Diego Морales",
  "Ella Brown", "Finn O'Connor", "Grace Lee", "Hassan Ali",
  "Isla Murphy", "Jack Wilson",
].map((name, i) => ({ id: `p${i + 1}`, name: name.replace("Морales", "Morales") }));

const assignments = [
  { id: "a1", date: today, title: "Spelling" },
  { id: "a2", date: today, title: "Dictation" },
  { id: "a3", date: yesterday, title: "Workbook" },
  { id: "a4", date: twoAgo, title: "PBD" },
];

const submissions = {};
assignments.forEach((a, ai) => {
  submissions[a.id] = {};
  pupils.forEach((p, pi) => {
    submissions[a.id][p.id] = (pi + ai) % 3 !== 0; // ~66% done, varied
  });
});

const attendance = { [today]: {} };
const statuses = ["present", "present", "present", "late", "present", "absent", "present", "present", "late", "present"];
pupils.forEach((p, i) => (attendance[today][p.id] = statuses[i]));

const behavior = [
  { id: "b1", pupilId: "p1", date: today, type: "positive", points: 3, note: "Helped a classmate with reading" },
  { id: "b2", pupilId: "p6", date: today, type: "negative", points: 2, note: "Disrupted the lesson" },
  { id: "b3", pupilId: "p3", date: yesterday, type: "positive", points: 2, note: "Excellent group work" },
  { id: "b4", pupilId: "p2", date: yesterday, type: "positive", points: 1, note: "Tidied up without asking" },
  { id: "b5", pupilId: "p9", date: twoAgo, type: "negative", points: 1, note: "Late homework again" },
];

const seed = { pupils, assignments, submissions, attendance, behavior };

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

await page.addInitScript((data) => {
  localStorage.setItem("pupil-tracker-pupils", JSON.stringify(data.pupils));
  localStorage.setItem("pupil-tracker-assignments", JSON.stringify(data.assignments));
  localStorage.setItem("pupil-tracker-submissions", JSON.stringify(data.submissions));
  localStorage.setItem("pupil-tracker-attendance", JSON.stringify(data.attendance));
  localStorage.setItem("pupil-tracker-behavior", JSON.stringify(data.behavior));
}, seed);

await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(900); // fonts + entrance animation settle

const tabs = ["Dashboard", "Homework", "Attendance", "Behavior", "Students", "Analytics"];
for (const name of tabs) {
  if (name !== "Dashboard") {
    await page.getByRole("tab", { name }).click();
    await page.waitForTimeout(700); // panel swap + stagger
  }
  const file = path.join(OUT, `${name.toLowerCase()}.png`);
  await page.screenshot({ path: file });
  console.log("saved", file);
}

// Bonus: a Student profile drill-down
await page.getByRole("tab", { name: "Students" }).click();
await page.waitForTimeout(500);
await page.getByText("Aisha Khan").first().click();
await page.waitForTimeout(600);
const prof = path.join(OUT, "student-profile.png");
await page.screenshot({ path: prof });
console.log("saved", prof);

await browser.close();
console.log("DIR", OUT);
