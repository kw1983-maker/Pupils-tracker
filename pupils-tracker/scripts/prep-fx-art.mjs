#!/usr/bin/env node
/**
 * Turns the raw power-up artwork into the assets the stage loads.
 *
 * The art is generated with solid backgrounds because image models are far more
 * reliable at "white shape on pure black" than at real transparency. Keying
 * that background out belongs here rather than at render time: mix-blend-mode
 * cannot reach the scene from inside the world layer, which has a transform and
 * therefore forms its own blend group, so the black would simply show as a
 * rectangle. After this step every asset has honest alpha and the renderer is
 * plain masks and images.
 *
 *   node scripts/prep-fx-art.mjs <folder-of-pngs>
 *
 * Writes public/pets/fx/<name>.webp. Bump PET_FX_VERSION in
 * lib/pet-fight/fx-assets.ts when you replace art under an existing name.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "pets", "fx");

/**
 * Words that identify each asset in a source filename, so the art can keep the
 * names it was generated under ("9.a chunky rounded boulder.png") instead of
 * having to be renamed by hand.
 */
const ALIAS = {
  "crack-ground": ["crack"],
  "wind-streak": ["wind"],
  "lightning-arc": ["lightning"],
  "shockwave-ring": ["shockwave"],
  "dust-sheet": ["dust"],
  "aura-flame": ["aura", "flame"],
  "storm-clouds": ["storm", "cloud"],
  "rock-a": ["shard"],
  "rock-b": ["boulder"],
  "rock-c": ["slab"],
};

/** "9.a chunky rounded boulder.png" -> "a chunky rounded boulder" */
function normalise(file) {
  return path
    .basename(file, path.extname(file))
    .toLowerCase()
    .replace(/^[0-9]+\s*[.\-_]?\s*/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Widest this asset is ever drawn on the 1920-wide stage, rounded up to the
 * next sensible power-of-two-ish size. These are soft glows and blurred
 * silhouettes, not UI, so anything past the size they are actually painted at
 * is pure download for a school Chromebook — the rocks alone render at under
 * 100px and arrived as 1254px masters.
 */
const MAX_WIDTH = {
  "crack-ground": 768,
  "wind-streak": 512,
  "lightning-arc": 384,
  "shockwave-ring": 768,
  "dust-sheet": 768,
  "aura-flame": 640,
  "storm-clouds": 1280,
  "rock-a": 256,
  "rock-b": 256,
  "rock-c": 256,
};

/** How each asset's background becomes alpha. */
const KIND = {
  // White energy on black: alpha is the brightness, colour forced to white so
  // the renderer can tint it however it likes.
  energy: {
    names: [
      "crack-ground",
      "wind-streak",
      "lightning-arc",
      "shockwave-ring",
      "dust-sheet",
      "aura-flame",
    ],
    filter:
      "format=rgba,geq=r='255':g='255':b='255':a='max(max(r(X,Y),g(X,Y)),b(X,Y))'",
  },
  // Dark cloud on white: alpha is the darkness, colour a flat storm slate. The
  // cloud's own shading survives as varying opacity, which is what you want
  // over five different scene backdrops.
  sky: {
    names: ["storm-clouds"],
    filter:
      "format=rgba,geq=r='38':g='42':b='54':a='255-(0.299*r(X,Y)+0.587*g(X,Y)+0.114*b(X,Y))'",
  },
  // Painted earth — already transparent, and it must keep its own colour.
  rock: { names: ["rock-a", "rock-b", "rock-c"], filter: null },
};

const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/prep-fx-art.mjs <folder-of-pngs>");
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

const files = fs
  .readdirSync(src)
  .filter((f) => /\.(png|webp|jpe?g)$/i.test(f))
  .map((f) => path.join(src, f));

let done = 0;
let missing = [];
for (const [kind, { names, filter }] of Object.entries(KIND)) {
  for (const name of names) {
    const inFile =
      [".png", ".webp", ".jpg", ".jpeg"]
        .map((ext) => path.join(src, name + ext))
        .find((f) => fs.existsSync(f)) ??
      files.find((f) => {
        const n = normalise(f);
        return (
          n === name.replace("-", " ") ||
          (ALIAS[name] ?? []).some((word) => n.includes(word))
        );
      });
    if (!inFile) {
      missing.push(name);
      continue;
    }
    const outFile = path.join(OUT, `${name}.webp`);
    const scale = `scale='min(${MAX_WIDTH[name]},iw)':-1`;
    const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", inFile];
    args.push("-vf", filter ? `${filter},${scale}` : `${scale}`);
    // libwebp keeps alpha lossless whatever -quality says, and for a mask the
    // alpha IS the picture, so size comes from the scale above, not from here.
    args.push("-c:v", "libwebp", "-quality", "82", "-compression_level", "6");
    args.push(outFile);
    execFileSync("ffmpeg", args, { stdio: "inherit" });
    const kb = (fs.statSync(outFile).size / 1024).toFixed(0);
    console.log(`  ${kind.padEnd(6)} ${name.padEnd(16)} ${kb} kB`);
    done++;
  }
}

console.log(`\n${done} asset(s) written to public/pets/fx`);
if (missing.length) {
  console.log(`still missing: ${missing.join(", ")}`);
  console.log("(FX_ART_READY must stay false until every one is present)");
}
