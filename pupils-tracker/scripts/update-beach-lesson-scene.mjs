import { copyFile, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTER_PATH = join(ROOT, "public", "lessons", "at-the-beach.html");
const HD_DEST = join(ROOT, "docs", "HD image.jpg");
const SCENE_UUID = "edf2d656-7089-458b-aff9-1a39f16363b6";

const SRC = process.argv[2];
if (!SRC) {
  console.error("Usage: node scripts/update-beach-lesson-scene.mjs <image-path>");
  process.exit(1);
}

function sha(buf) {
  return createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) break;
    while (buf[i] === 0xff) i++;
    const marker = buf[i];
    i++;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const len = buf.readUInt16BE(i);
    // SOF0 / SOF2
    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2
    ) {
      return { height: buf.readUInt16BE(i + 3), width: buf.readUInt16BE(i + 5) };
    }
    i += len;
  }
  throw new Error("Could not read JPEG size");
}

function detect(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    return { mime: "image/png", ...pngSize(buf) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    return { mime: "image/jpeg", ...jpegSize(buf) };
  }
  throw new Error("Unsupported image type");
}

function extractScene(nested) {
  const re = new RegExp(
    `"${SCENE_UUID}":\\{"mime":"image/(png|jpeg)","compressed":false,"data":"`
  );
  const m = nested.match(re);
  if (!m || m.index == null) throw new Error("Scene image manifest entry not found");
  const dataStart = m.index + m[0].length;
  const dataEnd = nested.indexOf('"', dataStart);
  return {
    entryStart: m.index,
    mime: m[1],
    b64Start: dataStart,
    b64End: dataEnd,
    buf: Buffer.from(nested.slice(dataStart, dataEnd), "base64"),
  };
}

async function main() {
  const hd = await readFile(SRC);
  const info = detect(hd);
  console.log(`source: ${info.mime} ${info.width}×${info.height}, ${hd.length} bytes, sha ${sha(hd)}`);

  await copyFile(SRC, HD_DEST);

  const outer = await readFile(OUTER_PATH, "utf8");
  const marker = 'const LESSON_B64 = "';
  const start = outer.indexOf(marker);
  const valueStart = start + marker.length;
  const valueEnd = outer.indexOf('";', valueStart);
  let nested = Buffer.from(outer.slice(valueStart, valueEnd), "base64").toString("utf8");

  const scene = extractScene(nested);
  console.log(`current bundled: image/${scene.mime} ${scene.buf.length} bytes, sha ${sha(scene.buf)}`);
  console.log(`same as source? ${scene.buf.equals(hd)}`);

  const newEntry =
    `"${SCENE_UUID}":{"mime":"${info.mime}","compressed":false,"data":"${hd.toString("base64")}"}`;
  const oldEntryEnd = nested.indexOf("}", scene.b64End) + 1;
  nested = nested.slice(0, scene.entryStart) + newEntry + nested.slice(oldEntryEnd);

  const targetAr = `aspect-ratio:${info.width}/${info.height}`;
  nested = nested.replaceAll("aspect-ratio:737/711", targetAr);
  nested = nested.replaceAll("aspect-ratio:1276/1233", targetAr);
  nested = nested.replaceAll(/aspect-ratio:\d+\/\d+/g, (hit) => {
    if (hit === "aspect-ratio:16/9" || hit === "aspect-ratio:1") return hit;
    return targetAr;
  });
  console.log("set scene aspect-ratio to", targetAr);

  const newB64 = Buffer.from(nested, "utf8").toString("base64");
  const newOuter = outer.slice(0, valueStart) + newB64 + outer.slice(valueEnd);
  await writeFile(OUTER_PATH, newOuter, "utf8");
  console.log(`wrote lesson (${newOuter.length} chars)`);

  const checkNested = Buffer.from(
    newOuter.slice(valueStart, newOuter.indexOf('";', valueStart)),
    "base64"
  ).toString("utf8");
  const check = extractScene(checkNested);
  console.log(
    "verify",
    check.mime,
    sha(check.buf),
    "equals source",
    check.buf.equals(hd)
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
