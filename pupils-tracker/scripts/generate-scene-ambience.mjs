// Generate the ambient background sound for each pet scene with the ElevenLabs
// sound-generation (text-to-sound-effects) endpoint — the same one behind the
// pet roars. Text-to-speech would just *say* "birds chirping".
//
// Ambience belongs to the place, not the pet, so there is one clip per scene
// rather than one per species: 6 files instead of 90.
//
// Writes public/pets/scenes/<id>-ambient.mp3.
//
// Usage:
//   npm run gen:scene-ambience            # fill in any missing clips
//   npm run gen:scene-ambience -- --force # regenerate everything
//
// Requires ELEVENLABS_API_KEY in .env.local. Bump PET_SCENE_VERSION in
// lib/pets.ts after replacing a clip so browsers drop the cached copy.

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "pets", "scenes");

// Kept deliberately gentle and loopable — this plays under a child's voice in a
// classroom, so nothing percussive, musical or attention-grabbing.
const SCENES = {
  park: "gentle outdoor park ambience, soft birdsong and a light breeze through leaves, calm, no music",
  classroom: "quiet empty classroom room tone, faint distant children playing outside, calm, no music",
  bedroom: "cosy quiet bedroom ambience, very soft ticking clock and gentle warm room tone, calm, no music",
  beach: "calm beach ambience, gentle ocean waves lapping the shore and distant seagulls, no music",
  night: "peaceful night ambience, crickets chirping softly and a gentle breeze, calm, no music",
  snow: "gentle winter ambience, soft wind over snow, hushed and peaceful, no music",
};

const DURATION_SECONDS = 6;
const PROMPT_INFLUENCE = 0.6;
const MAX_RETRIES = 4;

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

// The model returns wildly different levels per prompt — sparse birdsong came
// back ~7 dB quieter than ocean waves, which would leave the park silent under
// the pet's voice while the beach drowned it. Even them out so one playback
// volume suits all six. Skipped (with a warning) when ffmpeg isn't installed.
const TARGET_MEAN_DB = -20;

async function normalise(path) {
  let meanDb;
  try {
    const { stderr } = await run("ffmpeg", [
      "-hide_banner", "-i", path, "-af", "volumedetect", "-f", "null", "-",
    ]).catch((e) => e); // ffmpeg writes its report to stderr and exits non-zero
    meanDb = parseFloat(/mean_volume:\s*(-?[\d.]+) dB/.exec(stderr ?? "")?.[1]);
  } catch {
    return null; // no ffmpeg on PATH
  }
  if (!Number.isFinite(meanDb)) return null;

  const gain = TARGET_MEAN_DB - meanDb;
  if (Math.abs(gain) < 1) return meanDb; // already close enough
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
  await mkdir(OUT_DIR, { recursive: true });

  let made = 0;
  let skipped = 0;
  for (const [scene, prompt] of Object.entries(SCENES)) {
    const out = join(OUT_DIR, `${scene}-ambient.mp3`);
    if (!force && (await exists(out))) {
      console.log(`  skip  ${scene}`);
      skipped += 1;
      continue;
    }
    process.stdout.write(`  make  ${scene} … `);
    let done = false;
    for (let attempt = 1; attempt <= MAX_RETRIES && !done; attempt++) {
      try {
        const buf = await synthesize(apiKey, prompt);
        await writeFile(out, buf);
        console.log(`${(buf.length / 1024).toFixed(1)} KB`);
        made += 1;
        done = true;
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

  // Level every clip, including ones we skipped — an existing file may predate
  // this step.
  let levelled = 0;
  let noFfmpeg = false;
  for (const scene of Object.keys(SCENES)) {
    const p = join(OUT_DIR, `${scene}-ambient.mp3`);
    if (!(await exists(p))) continue;
    const before = await normalise(p);
    if (before === null) {
      noFfmpeg = true;
      break;
    }
    levelled += 1;
  }
  if (noFfmpeg) {
    console.log("\nffmpeg not found — skipped levelling; clip volumes may vary.");
  } else {
    console.log(`\nLevelled ${levelled} clip(s) to ${TARGET_MEAN_DB} dB mean.`);
  }

  console.log(`Done. created=${made} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
