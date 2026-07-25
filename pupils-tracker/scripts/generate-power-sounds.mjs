// Generate the sound effect for each pet superpower with the ElevenLabs
// sound-generation endpoint — the same one behind the pet roars and the scene
// ambience. Text-to-speech would just *say* "fire breath".
//
// A fire breath sounds the same whichever animal makes it, so these are one clip
// per power rather than one per species: 8 files instead of 120.
//
// Prompts live alongside each power in lib/pet-powers.ts, so adding a power
// means editing one file and re-running this.
//
// Writes public/pets/powers/<id>.mp3.
//
// Usage:
//   npm run gen:power-sounds            # fill in any missing clips
//   npm run gen:power-sounds -- --force # regenerate everything
//
// Requires ELEVENLABS_API_KEY in .env.local. Bump PET_POWER_VERSION in
// lib/pet-powers.ts after replacing a clip so browsers drop the cached copy.

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "pets", "powers");
const POWERS_TS = join(ROOT, "lib", "pet-powers.ts");

const DURATION_SECONDS = 3;
const PROMPT_INFLUENCE = 0.6;
const MAX_RETRIES = 4;
// Same target the scene ambience uses, so a power never jumps out louder than
// everything else the pet does.
const TARGET_MEAN_DB = -18;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadEnvLocal() {
  try {
    const text = await readFile(join(ROOT, ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 0) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

/** Read id + sfx prompt straight out of the catalog so there is one source. */
async function readPowers() {
  const src = await readFile(POWERS_TS, "utf8");
  const powers = [];
  const re = /id:\s*"([a-z]+)"[\s\S]*?sfx:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) powers.push({ id: m[1], sfx: m[2] });
  return powers;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function synthesize(apiKey, prompt) {
  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: { "content-type": "application/json", "xi-api-key": apiKey },
    body: JSON.stringify({
      text: prompt,
      duration_seconds: DURATION_SECONDS,
      prompt_influence: PROMPT_INFLUENCE,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 240)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** Even the clips out so no power is startlingly louder than another. */
async function normalise(path) {
  let meanDb;
  try {
    const { stderr } = await run("ffmpeg", [
      "-hide_banner", "-i", path, "-af", "volumedetect", "-f", "null", "-",
    ]).catch((e) => e);
    meanDb = parseFloat(/mean_volume:\s*(-?[\d.]+) dB/.exec(stderr ?? "")?.[1]);
  } catch {
    return null;
  }
  if (!Number.isFinite(meanDb)) return null;
  const gain = TARGET_MEAN_DB - meanDb;
  if (Math.abs(gain) < 1) return meanDb;
  const tmp = `${path}.tmp.mp3`;
  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", path, "-af", `volume=${gain.toFixed(1)}dB`, tmp,
  ]);
  const { rename } = await import("node:fs/promises");
  await rename(tmp, path);
  return meanDb;
}

async function main() {
  await loadEnvLocal();
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    console.error("Missing ELEVENLABS_API_KEY in .env.local");
    process.exit(1);
  }
  const force = process.argv.includes("--force");
  const powers = await readPowers();
  if (!powers.length) {
    console.error("No powers found in lib/pet-powers.ts");
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`Pet power sounds -> ${OUT_DIR} (${powers.length} clips)`);

  let made = 0;
  let skipped = 0;
  for (const { id, sfx } of powers) {
    const out = join(OUT_DIR, `${id}.mp3`);
    if (!force && (await exists(out))) {
      console.log(`  skip  ${id}`);
      skipped += 1;
      continue;
    }
    process.stdout.write(`  make  ${id} … `);
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const buf = await synthesize(apiKey, sfx);
        await writeFile(out, buf);
        console.log(`${(buf.length / 1024).toFixed(1)} KB`);
        made += 1;
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (attempt === MAX_RETRIES) {
          console.log(`FAIL (${msg})`);
          process.exitCode = 1;
        } else {
          await sleep(/429|quota|rate/i.test(msg) ? 12_000 : 5_000);
        }
      }
    }
    await sleep(250);
  }

  let levelled = 0;
  for (const { id } of powers) {
    const p = join(OUT_DIR, `${id}.mp3`);
    if (!(await exists(p))) continue;
    if ((await normalise(p)) === null) {
      console.log("\nffmpeg not found — skipped levelling; volumes may vary.");
      levelled = -1;
      break;
    }
    levelled += 1;
  }
  if (levelled >= 0) {
    console.log(`\nLevelled ${levelled} clip(s) to ${TARGET_MEAN_DB} dB mean.`);
  }
  console.log(`Done. created=${made} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
