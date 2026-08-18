// Generate the "At the Beach" interactive lesson's word/phrase audio with
// Gemini TTS (no ElevenLabs credits needed — uses the same GEMINI_API_KEY
// already configured for app/api/spelling-song's lyric-writing).
//
// Writes public/lessons/at-the-beach-audio/<slug>.mp3 — one clip per phrase
// in the "Match"/"Learn" word game inside public/lessons/at-the-beach.html's
// nested Interactive Lesson. The lesson plays these directly (see
// scripts/splice-beach-lesson.mjs) and falls back to the browser's built-in
// voice if a clip is ever missing.
//
// Usage:
//   node scripts/generate-beach-lesson-audio.mjs            # generate any missing clips
//   node scripts/generate-beach-lesson-audio.mjs --force    # regenerate everything
//
// Requires GEMINI_API_KEY in .env.local, and ffmpeg on PATH (same
// requirement scripts/generate-pet-voices.mjs already carries — Gemini
// returns raw PCM, ffmpeg encodes it to MP3 like every other audio asset
// in this repo).

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "lessons", "at-the-beach-audio");

const MODEL = "gemini-3.1-flash-tts-preview";
// "Leda" = youthful/energetic — fits a kids' beach lesson. One-line change
// to try a different prebuilt Gemini voice if you'd like another tone.
const VOICE_NAME = "Leda";

// The 8 phrases spoken by the "Match" and "Learn" activities.
const PHRASES = [
  { label: "catch a fish", slug: "catch-a-fish" },
  { label: "paint a picture", slug: "paint-a-picture" },
  { label: "eat ice cream", slug: "eat-ice-cream" },
  { label: "take a photo", slug: "take-a-photo" },
  { label: "listen to music", slug: "listen-to-music" },
  { label: "look for shells", slug: "look-for-shells" },
  { label: "read a book", slug: "read-a-book" },
  { label: "make a sandcastle", slug: "make-a-sandcastle" },
];

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

/** Ask Gemini to speak `text`, returning raw 24kHz/16-bit mono PCM bytes. */
async function synthesizePcm(ai, text) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ parts: [{ text: `Say cheerfully: ${text}` }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } },
      },
    },
  });
  const b64 =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) throw new Error("No audio returned");
  return Buffer.from(b64, "base64");
}

/** Encode raw PCM (24kHz, 16-bit, mono) to MP3 via ffmpeg. */
async function pcmToMp3(pcm) {
  const { execFile } = await import("node:child_process");
  return new Promise((resolve, reject) => {
    const ff = execFile(
      "ffmpeg",
      [
        "-hide_banner", "-loglevel", "error",
        "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", "pipe:0",
        "-b:a", "128k", "-f", "mp3", "pipe:1",
      ],
      { encoding: "buffer", maxBuffer: 32 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`ffmpeg: ${stderr?.toString().slice(0, 200) || err.message}`));
          return;
        }
        resolve(stdout);
      }
    );
    ff.stdin.end(pcm);
  });
}

async function main() {
  await loadEnvLocal();
  const force = process.argv.includes("--force");
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY in .env.local");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`Beach lesson audio → ${OUT_DIR} (${PHRASES.length} clips, model=${MODEL}, voice=${VOICE_NAME})`);

  let made = 0;
  let skipped = 0;
  for (const { label, slug } of PHRASES) {
    const out = join(OUT_DIR, `${slug}.mp3`);
    if (!force && (await exists(out))) {
      skipped += 1;
      console.log(`  skip  ${slug}`);
      continue;
    }
    process.stdout.write(`  make  ${slug} [${label}] … `);
    try {
      const pcm = await synthesizePcm(ai, label);
      const mp3 = await pcmToMp3(pcm);
      await writeFile(out, mp3);
      made += 1;
      console.log(`${(mp3.length / 1024).toFixed(1)} KB`);
    } catch (err) {
      console.log("FAIL");
      console.error(`         ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
      break;
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`Done. created=${made} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
