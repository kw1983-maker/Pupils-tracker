// Generate class-pet voice clips with ElevenLabs TTS.
// Writes public/pets/voice/<species>/<lineId>.mp3 so each pet species has its
// own child/teen voice (shared lines are rendered once per species).
// Egg lines go under public/pets/voice/egg/.
//
// Usage:
//   npm run gen:pet-voices            # generate any missing clips
//   npm run gen:pet-voices -- --force # regenerate everything
//
// Requires ELEVENLABS_API_KEY in .env.local. Voice IDs live in
// lib/pet-voice-lines.json → "voices". After regenerating, bump "version"
// there so browsers drop cached MP3s.

import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "pets", "voice");
const LINES_PATH = join(ROOT, "lib", "pet-voice-lines.json");

const SPECIES = [
  "dragon",
  "fox",
  "cat",
  "owl",
  "penguin",
  "rabbit",
  "dino",
  "unicorn",
  "dog",
  "panda",
  "koala",
  "pig",
  "monkey",
  "tiger",
  "mouse",
];

const DEFAULT_MODEL = "eleven_v3";

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

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function synthesize(apiKey, voiceId, modelId, text) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
      voiceId
    )}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "xi-api-key": apiKey,
      },
      // Low stability + high style makes the delivery livelier and more
      // excited — pets should sound playful, not like a calm narrator. This
      // applies to any clip generated from now on (existing MP3s are skipped
      // unless you pass --force).
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.28,
          similarity_boost: 0.75,
          style: 0.65,
          use_speaker_boost: true,
        },
      }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 240)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** Expand catalog lines into concrete (folder, id, speak, voiceId) jobs. */
function buildJobs(catalog) {
  const voices = catalog.voices ?? {};
  const lines = catalog.lines ?? [];
  const jobs = [];

  for (const line of lines) {
    if (line.kind === "egg") {
      const v = voices.egg;
      if (!v?.id) throw new Error("voices.egg missing in pet-voice-lines.json");
      // Unchosen pets (no species yet).
      jobs.push({
        folder: "egg",
        id: line.id,
        speak: line.speak,
        voiceId: v.id,
        voiceName: v.name,
      });
      // Chosen species still on the egg stage — same egg lines, that species' voice.
      for (const sp of SPECIES) {
        const sv = voices[sp];
        if (!sv?.id) throw new Error(`voices.${sp} missing`);
        jobs.push({
          folder: sp,
          id: line.id,
          speak: line.speak,
          voiceId: sv.id,
          voiceName: sv.name,
        });
      }
      continue;
    }

    if (line.kind === "species") {
      const sp = line.species;
      const v = voices[sp];
      if (!v?.id) throw new Error(`voices.${sp} missing`);
      jobs.push({
        folder: sp,
        id: line.id,
        speak: line.speak,
        voiceId: v.id,
        voiceName: v.name,
      });
      continue;
    }

    // Shared lines — one clip per species, each in that species' voice.
    if (line.kind === "shared") {
      for (const sp of SPECIES) {
        const v = voices[sp];
        if (!v?.id) throw new Error(`voices.${sp} missing`);
        jobs.push({
          folder: sp,
          id: line.id,
          speak: line.speak,
          voiceId: v.id,
          voiceName: v.name,
        });
      }
    }
  }
  return jobs;
}

async function main() {
  await loadEnvLocal();
  const force = process.argv.includes("--force");
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    console.error("Missing ELEVENLABS_API_KEY in .env.local");
    process.exit(1);
  }

  const modelId = process.env.ELEVENLABS_TTS_MODEL?.trim() || DEFAULT_MODEL;
  const catalog = JSON.parse(await readFile(LINES_PATH, "utf8"));
  const jobs = buildJobs(catalog);

  await mkdir(OUT_DIR, { recursive: true });
  // Remove legacy flat clips from v1 (public/pets/voice/*.mp3).
  if (force) {
    for (const sp of [...SPECIES, "egg"]) {
      await mkdir(join(OUT_DIR, sp), { recursive: true });
    }
  }

  console.log(
    `Pet voices → ${OUT_DIR} (${jobs.length} clips, model=${modelId})`
  );

  let made = 0;
  let skipped = 0;
  for (const job of jobs) {
    const dir = join(OUT_DIR, job.folder);
    await mkdir(dir, { recursive: true });
    const out = join(dir, `${job.id}.mp3`);
    if (!force && (await exists(out))) {
      skipped += 1;
      console.log(`  skip  ${job.folder}/${job.id} (${job.voiceName})`);
      continue;
    }
    process.stdout.write(
      `  make  ${job.folder}/${job.id} [${job.voiceName}] … `
    );
    try {
      const buf = await synthesize(apiKey, job.voiceId, modelId, job.speak);
      await writeFile(out, buf);
      made += 1;
      console.log(`${(buf.length / 1024).toFixed(1)} KB`);
    } catch (err) {
      console.log("FAIL");
      console.error(`         ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
      break;
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  // Clean leftover v1 flat files only after a successful run.
  if (process.exitCode) {
    console.log(`Done with errors. created=${made} skipped=${skipped}`);
    return;
  }
  try {
    const { readdir } = await import("node:fs/promises");
    for (const name of await readdir(OUT_DIR)) {
      if (name.endsWith(".mp3")) {
        await rm(join(OUT_DIR, name), { force: true });
        console.log(`  cleaned legacy ${name}`);
      }
    }
  } catch {
    /* ignore */
  }

  console.log(`Done. created=${made} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
