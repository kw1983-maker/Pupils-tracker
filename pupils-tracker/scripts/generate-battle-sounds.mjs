// Generate the Pet PK battle sound effects with the ElevenLabs sound-generation
// endpoint — the same one behind the pet roars, scene ambience and superpowers.
//
// The duel previously ran on synthesised oscillator tones. Those were chosen to
// dodge an autoplay problem (setTimeout + play() is silent on many school
// Chromebooks), not because they sounded good — a duel between a dragon and a
// tiger sounded like a calculator. These are real recordings, and lib/sound.ts
// now schedules them on the same AudioContext clock, so the fix for the silence
// is kept while the beeps go away.
//
// Writes public/pets/battle/<id>.mp3.
//
// Usage:
//   npm run gen:battle-sounds            # fill in any missing clips
//   npm run gen:battle-sounds -- --force # regenerate everything
//
// Requires ELEVENLABS_API_KEY in .env.local. Bump PET_BATTLE_VERSION in
// lib/pet-battle-sfx.ts after replacing a clip.

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "pets", "battle");

// Short and punchy: these land on a beat, so anything with a long tail smears
// into the next one.
const SOUNDS = {
  countdown: {
    seconds: 1,
    prompt: "a single short clean digital countdown beep, crisp, no music",
  },
  announce: {
    seconds: 2,
    prompt: "a boxing ring bell, two bright dings, short, clean, no music",
  },
  charge: {
    seconds: 2,
    prompt: "a fast whoosh of something rushing forward through the air, short, clean, no music",
  },
  hit: {
    seconds: 2,
    prompt: "a punchy cartoon impact thud, solid and satisfying, short, clean, no music",
  },
  critical: {
    seconds: 3,
    prompt: "a huge dramatic cartoon impact, deep boom with a bright crash, powerful, short, clean, no music",
  },
  block: {
    seconds: 2,
    prompt: "two metal shields clashing and blocking, bright metallic clang, short, clean, no music",
  },
  victory: {
    seconds: 3,
    prompt: "a short triumphant victory fanfare, bright and celebratory, cheerful, no vocals",
  },
};

const PROMPT_INFLUENCE = 0.6;
const MAX_RETRIES = 4;
// Impacts should punch, so these sit louder than the ambience (-20 dB) but are
// still levelled against each other so no single cue jumps out.
const TARGET_MEAN_DB = -16;

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

async function synthesize(apiKey, prompt, seconds) {
  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: { "content-type": "application/json", "xi-api-key": apiKey },
    body: JSON.stringify({
      text: prompt,
      duration_seconds: seconds,
      prompt_influence: PROMPT_INFLUENCE,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** Level the set, and trim the leading silence the model tends to leave. */
async function polish(path) {
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
  const tmp = `${path}.tmp.mp3`;
  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", path,
    // silenceremove drops the dead air at the head so a cue fires ON the beat,
    // not a fifth of a second after it.
    "-af",
    `silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,volume=${gain.toFixed(1)}dB`,
    tmp,
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
  console.log(`Battle sounds -> ${OUT_DIR}`);

  let made = 0;
  let skipped = 0;
  for (const [id, { seconds, prompt }] of Object.entries(SOUNDS)) {
    const out = join(OUT_DIR, `${id}.mp3`);
    if (!force && (await exists(out))) {
      console.log(`  skip  ${id}`);
      skipped += 1;
      continue;
    }
    process.stdout.write(`  make  ${id} … `);
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const buf = await synthesize(apiKey, prompt, seconds);
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
  for (const id of Object.keys(SOUNDS)) {
    const p = join(OUT_DIR, `${id}.mp3`);
    if (!(await exists(p))) continue;
    if ((await polish(p)) === null) {
      console.log("\nffmpeg not found — skipped levelling; volumes may vary.");
      levelled = -1;
      break;
    }
    levelled += 1;
  }
  if (levelled >= 0) {
    console.log(`\nLevelled + trimmed ${levelled} clip(s) to ${TARGET_MEAN_DB} dB.`);
  }
  console.log(`Done. created=${made} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
