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
// into the next one. Seconds are an upper bound for the model — polish() then
// trims silence and fades the end so a 0.9s impact beat never inherits a 2s tail.
const SOUNDS = {
  countdown: {
    seconds: 0.6,
    prompt: "a single very short clean digital countdown beep, under half a second, crisp, no music, no trail",
  },
  // Lands on "FIGHT!" so the countdown resolves into a go signal rather than
  // just stopping. Short: the charge whoosh follows a beat later.
  fight: {
    seconds: 0.9,
    prompt: "a very short bright sports start horn blast, sharp and exciting, under one second, clean, no music, no trail",
  },
  announce: {
    seconds: 1.1,
    prompt: "a boxing ring bell, one bright ding, short, clean, no music, no long ring-out",
  },
  // Past the scheduled rounds — tenser than the ordinary bell.
  sudden: {
    seconds: 1.1,
    prompt: "a short tense sudden-death sting, rising edge then stop, under one second, clean, no music",
  },
  charge: {
    seconds: 0.9,
    prompt: "a fast short whoosh of something rushing forward, under one second, clean, no music, no trail",
  },
  hit: {
    seconds: 0.8,
    prompt: "a punchy cartoon impact thud, solid, under one second, clean, no music, no trail",
  },
  // Alternated with "hit" so three rounds don't share one identical thud.
  hit2: {
    seconds: 0.8,
    prompt: "a cartoon impact smack, brighter slap than a thud, under one second, clean, no music, no trail",
  },
  critical: {
    seconds: 1.2,
    prompt: "a dramatic cartoon critical impact, deep boom with a bright crash, punchy then done, clean, no music",
  },
  // The class reacting, under the critical / over the win.
  gasp: {
    seconds: 1.0,
    prompt: "a short crowd gasp of surprise, a few people, light and clean, under one second, no music",
  },
  crowd: {
    seconds: 2.2,
    prompt: "a short cheerful kids crowd cheer and applause, excited classroom celebration, clean, no music",
  },
  block: {
    seconds: 0.9,
    prompt: "two shields clashing once, bright metallic clang, under one second, clean, no music, no trail",
  },
  victory: {
    seconds: 2.4,
    prompt: "a short triumphant victory fanfare, bright and celebratory, cheerful, no vocals, ends cleanly",
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

/**
 * Level the set, trim leading *and* trailing silence, and fade the end.
 * Trailing silence was the main smear: a 2s hit clip with 1s of quiet at the
 * end still occupied the AudioContext into the next beat's shout.
 */
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

  const { rename, unlink } = await import("node:fs/promises");
  const gain = TARGET_MEAN_DB - meanDb;
  const tmp = `${path}.tmp.mp3`;
  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", path,
    "-af",
    [
      // Drop dead air at the head so the cue fires ON the beat.
      "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02",
      // Same from the end: reverse → trim → reverse.
      "areverse",
      "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.04",
      "areverse",
      `volume=${gain.toFixed(1)}dB`,
    ].join(","),
    tmp,
  ]);

  // Fade the last 80ms now that length is known, so a hard cut doesn't click.
  let duration = 0;
  try {
    const { stdout } = await run("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "csv=p=0", tmp,
    ]);
    duration = parseFloat(String(stdout).trim());
  } catch {
    duration = 0;
  }
  if (Number.isFinite(duration) && duration > 0.12) {
    const tmp2 = `${path}.tmp2.mp3`;
    const fadeStart = Math.max(0, duration - 0.08).toFixed(3);
    await run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-i", tmp,
      "-af", `afade=t=out:st=${fadeStart}:d=0.08`,
      tmp2,
    ]);
    await unlink(tmp);
    await rename(tmp2, path);
  } else {
    await rename(tmp, path);
  }
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
  // Only polish clips written this run. Re-trimming an already-polished file
  // eats into the fade each time and leaves a 0.2s click where a hit used to be.
  const freshlyMade = [];
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
        freshlyMade.push(id);
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
  for (const id of freshlyMade) {
    const p = join(OUT_DIR, `${id}.mp3`);
    if ((await polish(p)) === null) {
      console.log("\nffmpeg not found — skipped levelling; volumes may vary.");
      levelled = -1;
      break;
    }
    levelled += 1;
  }
  if (levelled > 0) {
    console.log(`\nLevelled + trimmed ${levelled} clip(s) to ${TARGET_MEAN_DB} dB.`);
  }
  console.log(`Done. created=${made} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
