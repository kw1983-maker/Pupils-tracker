// One-off script: swaps the "Read the Story" PDF for an updated version and
// wires up the two new base64 constants the "Group Activity" tab needs
// (added to public/lessons/at-the-beach.html's markup/boot script by hand —
// see the plan/commit that introduced this script for the surrounding
// edits). Source files live in pupils-tracker/docs/.
//
// Usage: node scripts/update-beach-lesson-media.mjs

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUTER_PATH = join(ROOT, "public", "lessons", "at-the-beach.html");
const DOCS = join(ROOT, "docs");

const NEW_PDF_PATH = join(DOCS, "Doraemon_s_Beach_Adventure_(3).pdf");
const GROUP_AUDIO_PATH = join(DOCS, "lesson 68 listening task_2.mp3");
const GROUP_PDF_PATH = join(DOCS, "Group activity.pdf");

function replaceConstValue(source, name, newB64) {
  const marker = `const ${name} = "`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`${name} marker not found`);
  const valueStart = start + marker.length;
  const valueEnd = source.indexOf('";', valueStart);
  if (valueEnd < 0) throw new Error(`${name} closing not found`);
  return source.slice(0, valueStart) + newB64 + source.slice(valueEnd);
}

async function main() {
  let outer = await readFile(OUTER_PATH, "utf8");
  const before = outer.length;

  const newPdfB64 = (await readFile(NEW_PDF_PATH)).toString("base64");
  outer = replaceConstValue(outer, "PDF_B64", newPdfB64);
  console.log(`Swapped PDF_B64 (${newPdfB64.length} base64 chars).`);

  // Insert the two new constants right after PDF_B64's declaration line
  // (first run only — on later runs they already exist and get replaced
  // in place instead).
  const pdfMarker = 'const PDF_B64 = "';
  const pdfStart = outer.indexOf(pdfMarker);
  const pdfLineEnd = outer.indexOf("\n", pdfStart);
  if (pdfLineEnd < 0) throw new Error("Could not find end of PDF_B64 line");

  if (!outer.includes("const GROUP_AUDIO_B64")) {
    const groupAudioB64 = (await readFile(GROUP_AUDIO_PATH)).toString("base64");
    const groupPdfB64 = (await readFile(GROUP_PDF_PATH)).toString("base64");
    const insertion =
      `\nconst GROUP_AUDIO_B64 = "${groupAudioB64}";` +
      `\nconst GROUP_PDF_B64 = "${groupPdfB64}";`;
    outer = outer.slice(0, pdfLineEnd) + insertion + outer.slice(pdfLineEnd);
    console.log(
      `Added GROUP_AUDIO_B64 (${groupAudioB64.length} chars) and GROUP_PDF_B64 (${groupPdfB64.length} chars).`
    );
  } else {
    const groupAudioB64 = (await readFile(GROUP_AUDIO_PATH)).toString("base64");
    outer = replaceConstValue(outer, "GROUP_AUDIO_B64", groupAudioB64);
    console.log(`Swapped GROUP_AUDIO_B64 (${groupAudioB64.length} base64 chars).`);
  }

  await writeFile(OUTER_PATH, outer, "utf8");
  console.log(`Wrote ${OUTER_PATH} (${outer.length} chars, was ${before}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
