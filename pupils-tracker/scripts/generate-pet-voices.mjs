// Generate class-pet voice clips with ElevenLabs TTS and save them under
// public/pets/voice/<id>.mp3. Same idea as scripts/generate-pets.mjs: generate
// once, ship static assets — no API cost or latency during lessons.
//
// Usage:
//   npm run gen:pet-voices            # generate any missing clips
//   npm run gen:pet-voices -- --force # regenerate everything
//
// Requires ELEVENLABS_API_KEY in .env.local (see .env.example). Optional:
// ELEVENLABS_PET_VOICE_ID / ELEVENLABS_VOICE_ID / ELEVENLABS_TTS_MODEL.
// After regenerating, bump "version" in lib/pet-voice-lines.json so browsers
// drop cached MP3s.

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "pets", "voice");
const LINES_PATH = join(ROOT, "lib", "pet-voice-lines.json");

const DEFAULT_VOICE = "pFZP5JQG7iQjIQuC4Bku"; // Lily — youthful / playful
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
      body: JSON.stringify({ text, model_id: modelId }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 240)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  await loadEnvLocal();
  const force = process.argv.includes("--force");
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    console.error("Missing ELEVENLABS_API_KEY in .env.local");
    process.exit(1);
  }

  const voiceId =
    process.env.ELEVENLABS_PET_VOICE_ID?.trim() ||
    process.env.ELEVENLABS_VOICE_ID?.trim() ||
    DEFAULT_VOICE;
  const modelId = process.env.ELEVENLABS_TTS_MODEL?.trim() || DEFAULT_MODEL;

  const catalog = JSON.parse(await readFile(LINES_PATH, "utf8"));
  const lines = catalog.lines ?? [];
  await mkdir(OUT_DIR, { recursive: true });

  console.log(
    `Pet voices → ${OUT_DIR} (${lines.length} lines, voice=${voiceId}, model=${modelId})`
  );

  let made = 0;
  let skipped = 0;
  for (const line of lines) {
    const out = join(OUT_DIR, `${line.id}.mp3`);
    if (!force && (await exists(out))) {
      skipped += 1;
      console.log(`  skip  ${line.id}`);
      continue;
    }
    process.stdout.write(`  make  ${line.id} … `);
    try {
      const buf = await synthesize(apiKey, voiceId, modelId, line.speak);
      await writeFile(out, buf);
      made += 1;
      console.log(`${(buf.length / 1024).toFixed(1)} KB`);
    } catch (err) {
      console.log("FAIL");
      console.error(`         ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
      break;
    }
    // Be gentle on the API when generating the full set.
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`Done. created=${made} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
