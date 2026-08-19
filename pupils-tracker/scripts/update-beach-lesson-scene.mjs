// Swap the "At the beach" scene PNG inside the nested interactive lesson
// (LESSON_B64 in public/lessons/at-the-beach.html) for the HD scan in docs/.
//
// Usage: node scripts/update-beach-lesson-scene.mjs

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUTER_PATH = join(ROOT, "public", "lessons", "at-the-beach.html");
const HD_PATH = join(ROOT, "docs", "HD image.png");
const SCENE_UUID = "edf2d656-7089-458b-aff9-1a39f16363b6";

function pngSize(buf) {
  if (buf[0] !== 0x89 || buf[1] !== 0x50) {
    throw new Error("Not a PNG");
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function main() {
  const hd = await readFile(HD_PATH);
  const { width, height } = pngSize(hd);
  const hdB64 = hd.toString("base64");
  console.log(`HD image: ${width}×${height}, ${hd.length} bytes, ${hdB64.length} base64 chars`);

  const outer = await readFile(OUTER_PATH, "utf8");
  const marker = 'const LESSON_B64 = "';
  const start = outer.indexOf(marker);
  if (start < 0) throw new Error("LESSON_B64 marker not found");
  const valueStart = start + marker.length;
  const valueEnd = outer.indexOf('";', valueStart);
  if (valueEnd < 0) throw new Error("LESSON_B64 closing not found");

  let nested = Buffer.from(outer.slice(valueStart, valueEnd), "base64").toString("utf8");
  console.log(`Decoded nested lesson (${nested.length} chars)`);

  const dataMarker = `"${SCENE_UUID}":{"mime":"image/png","compressed":false,"data":"`;
  const dataStart = nested.indexOf(dataMarker);
  if (dataStart < 0) throw new Error("Scene PNG manifest entry not found");
  const b64Start = dataStart + dataMarker.length;
  const b64End = nested.indexOf('"', b64Start);
  if (b64End < 0) throw new Error("Scene PNG data closing not found");
  const oldB64 = nested.slice(b64Start, b64End);
  console.log(`Replacing scene PNG (${oldB64.length} → ${hdB64.length} base64 chars)`);
  nested = nested.slice(0, b64Start) + hdB64 + nested.slice(b64End);

  const arCount = nested.split("aspect-ratio:737/711").length - 1;
  if (arCount !== 2) {
    throw new Error(`Expected 2 aspect-ratio:737/711, found ${arCount}`);
  }
  nested = nested.replaceAll("aspect-ratio:737/711", `aspect-ratio:${width}/${height}`);
  console.log(`Updated aspect-ratio 737/711 → ${width}/${height} (×${arCount})`);

  const newB64 = Buffer.from(nested, "utf8").toString("base64");
  const newOuter = outer.slice(0, valueStart) + newB64 + outer.slice(valueEnd);
  await writeFile(OUTER_PATH, newOuter, "utf8");
  console.log(`Wrote ${OUTER_PATH} (${newOuter.length} chars, was ${outer.length}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
