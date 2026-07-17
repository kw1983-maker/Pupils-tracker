// Copy ffmpeg.wasm core assets into public/ so conversion works same-origin
// (no CDN — school networks often block those). Runs on postinstall / deploy.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@ffmpeg", "core", "dist", "esm");
const dest = join(root, "public", "ffmpeg");

mkdirSync(dest, { recursive: true });
for (const name of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  copyFileSync(join(src, name), join(dest, name));
}
console.log("Copied ffmpeg core → public/ffmpeg/");
