// Generate the class-pet sprite family with Google Gemini (your GEMINI_API_KEY),
// writing original art to public/pets/<species>/<stage>.png — the paths
// lib/pets.ts (spriteFor) points at.
//
// Uses @google/genai (already a dependency) and a Gemini image model. This is the
// Gemini counterpart of scripts/generate-pets.mjs (Hugging Face); use whichever
// account you prefer. The reference app's pet art is copyright-registered and is
// NOT used — everything here is generated fresh and yours to keep.
//
// Usage:
//   node scripts/generate-pets-gemini.mjs             # fill in missing sprites
//   node scripts/generate-pets-gemini.mjs --force     # regenerate everything
//   node scripts/generate-pets-gemini.mjs dragon fox  # only these species
//   PET_MODEL=gemini-2.5-flash-image node scripts/generate-pets-gemini.mjs
//
// Requires GEMINI_API_KEY in .env.local (see .env.example). If you regenerate art
// that already existed, bump PET_ART_VERSION in lib/pets.ts so browsers reload it.

import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "pets");

// Override with PET_MODEL if your account prefers another image model
// (e.g. gemini-2.5-flash-image, gemini-3.1-flash-image).
const MODEL = process.env.PET_MODEL || "gemini-3.1-flash-image";
const MAX_RETRIES = 4;

// Keep species ids in sync with PET_SPECIES in lib/pets.ts.
const SPECIES = {
  dragon: "a friendly rounded dragon with tiny wings",
  fox: "a cute orange fox with a big fluffy tail",
  cat: "a round cheerful kitten",
  owl: "a big-eyed fluffy owl",
  penguin: "a chubby happy penguin",
  rabbit: "a soft bunny with long floppy ears",
  dino: "a chubby green cartoon dinosaur",
  unicorn: "a pastel unicorn with a small horn and flowing mane",
};

// Keep stage ids in sync with PET_STAGES in lib/pets.ts.
const STAGES = {
  egg: (d) => `a cute decorated speckled egg themed after ${d}, the creature not yet hatched, just an adorable egg`,
  baby: (d) => `a tiny newly-hatched baby version of ${d}, huge head, very small body, extra adorable`,
  teen: (d) => `a young growing version of ${d}, a bit bigger and more confident`,
  adult: (d) => `a fully grown proud and happy version of ${d}`,
};

// One consistent house style so all sprites look like a matched set.
function buildPrompt(desc, stageFn) {
  return (
    `Generate a single image. Cute kawaii flat-vector mascot sticker: ${stageFn(desc)}. ` +
    `Thick clean outlines, soft cel shading, bright cheerful colours, one centered ` +
    `subject facing forward, on a plain white background, square 1:1 framing, ` +
    `friendly children's game art. No text, no words, no letters, no numbers.`
  );
}

function loadEnv() {
  try {
    process.loadEnvFile(join(ROOT, ".env.local"));
  } catch {
    try {
      process.loadEnvFile(join(ROOT, ".env"));
    } catch {
      /* rely on already-set env */
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

// Pull the first inline image out of a generateContent response.
function extractImage(res) {
  const parts = res?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const data = part?.inlineData?.data;
    if (data) return Buffer.from(data, "base64");
  }
  return null;
}

async function generateOne(ai, desc, stageFn) {
  const prompt = buildPrompt(desc, stageFn);
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { responseModalities: ["IMAGE"] },
      });
      const buf = extractImage(res);
      if (!buf) throw new Error("no image in response");
      return buf;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === MAX_RETRIES) throw new Error(msg);
      const wait = /429|quota|rate/i.test(msg) ? 12000 : 5000;
      console.log(`    retry ${attempt}/${MAX_RETRIES} in ${wait / 1000}s (${msg})`);
      await sleep(wait);
    }
  }
}

async function main() {
  loadEnv();
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("GEMINI_API_KEY is not set. Add it to .env.local and retry.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = args.filter((a) => !a.startsWith("--"));
  const speciesIds = (only.length ? only : Object.keys(SPECIES)).filter((id) => {
    if (!SPECIES[id]) {
      console.warn(`Unknown species "${id}" — skipping.`);
      return false;
    }
    return true;
  });

  const ai = new GoogleGenAI({ apiKey: key });
  console.log(`Model: ${MODEL}`);
  let made = 0;
  let skipped = 0;

  for (const speciesId of speciesIds) {
    const desc = SPECIES[speciesId];
    console.log(`\n${speciesId}`);
    for (const [stageId, stageFn] of Object.entries(STAGES)) {
      const outPath = join(OUT_DIR, speciesId, `${stageId}.png`);
      if (!force && (await exists(outPath))) {
        console.log(`  ${stageId}: exists, skipping`);
        skipped++;
        continue;
      }
      process.stdout.write(`  ${stageId}: generating… `);
      try {
        const buf = await generateOne(ai, desc, stageFn);
        await mkdir(dirname(outPath), { recursive: true });
        await writeFile(outPath, buf);
        console.log(`done (${Math.round(buf.length / 1024)} KB)`);
        made++;
      } catch (err) {
        console.log(`FAILED (${err.message})`);
      }
    }
  }

  console.log(`\nFinished. ${made} generated, ${skipped} skipped.`);
  if (made > 0) {
    console.log("Bump PET_ART_VERSION in lib/pets.ts if you replaced existing art.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
