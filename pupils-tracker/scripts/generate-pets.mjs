// Generate the class-pet sprite family with Hugging Face FLUX.1-schnell — the
// same model app/api/image-generate uses. Writes original art to
// public/pets/<species>/<stage>.png, which lib/pets.ts (spriteFor) points at.
//
// Why a build-time script (not runtime): the art is a small fixed set (8 species
// × 4 stages = 32 images), so we generate once and ship static PNGs — no API
// cost or latency during lessons, mirroring scripts/crop-avatars.ps1 →
// public/avatars/. The reference app's pet images are copyright-registered and
// are NOT used; everything here is generated fresh and yours to keep.
//
// Usage:
//   node scripts/generate-pets.mjs            # generate any missing sprites
//   node scripts/generate-pets.mjs --force    # regenerate everything
//   node scripts/generate-pets.mjs dragon fox # only these species
//
// Requires HF_TOKEN in .env.local (see .env.example). If you regenerate art,
// bump PET_ART_VERSION in lib/pets.ts so browsers drop the cached PNGs.

import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { InferenceClient } from "@huggingface/inference";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "pets");

const HF_MODEL = "black-forest-labs/FLUX.1-schnell";
const MAX_RETRIES = 5;

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
  egg: (desc) =>
    `a cute decorated speckled egg themed after ${desc}, the creature not yet hatched, just an adorable egg`,
  baby: (desc) => `a tiny newly-hatched baby version of ${desc}, huge head, very small body, extra adorable`,
  teen: (desc) => `a young growing version of ${desc}, a bit bigger and more confident`,
  adult: (desc) => `a fully grown proud and happy version of ${desc}`,
};

// One consistent house style so all 32 sprites look like a matched set.
function buildPrompt(speciesDesc, stageFn) {
  return (
    `Cute kawaii flat vector mascot sticker: ${stageFn(speciesDesc)}. ` +
    `Thick clean outlines, soft cel shading, bright cheerful colours, ` +
    `centered single subject, facing forward, on a plain soft pastel rounded ` +
    `background. Friendly children's game art. No text, no words, no letters, no numbers.`
  );
}

function loadEnv() {
  // Node 20.6+ / 24 can read a dotenv file directly. Fall back gracefully if the
  // file is missing (the token may already be in the environment / on CI).
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

async function generateOne(client, speciesId, speciesDesc, stageId, stageFn) {
  const prompt = buildPrompt(speciesDesc, stageFn);
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const blob = await client.textToImage(
        {
          model: HF_MODEL,
          inputs: prompt,
          provider: "auto",
          parameters: { num_inference_steps: 4 },
        },
        { outputType: "blob" }
      );
      const buf = Buffer.from(await blob.arrayBuffer());
      const outPath = join(OUT_DIR, speciesId, `${stageId}.png`);
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, buf);
      return outPath;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === MAX_RETRIES) throw new Error(msg);
      // HF free tier: 429 rate limit / 401 on overlap → wait and retry serially.
      const wait = /429/.test(msg) ? 8000 : /40[13]/.test(msg) ? 4000 : 6000;
      console.log(`    retry ${attempt}/${MAX_RETRIES} in ${wait / 1000}s (${msg})`);
      await sleep(wait);
    }
  }
}

async function main() {
  loadEnv();
  const token = process.env.HF_TOKEN;
  if (!token) {
    console.error(
      "HF_TOKEN is not set. Add it to .env.local (see .env.example) and retry."
    );
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

  const client = new InferenceClient(token);
  let made = 0;
  let skipped = 0;

  // Serialize every call — the HF free tier rejects overlapping requests.
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
        await generateOne(client, speciesId, desc, stageId, stageFn);
        console.log("done");
        made++;
      } catch (err) {
        console.log(`FAILED (${err.message})`);
      }
    }
  }

  console.log(`\nFinished. ${made} generated, ${skipped} skipped.`);
  console.log(
    "If you regenerated existing art, bump PET_ART_VERSION in lib/pets.ts so browsers reload it."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
