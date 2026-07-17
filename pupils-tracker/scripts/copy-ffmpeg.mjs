// Copy ffmpeg.wasm assets into public/ so conversion works same-origin
// (no CDN — school networks often block those). Runs on postinstall / deploy.
//
// Also copies the FFmpeg class worker + its ESM deps. Next/Turbopack breaks
// `new Worker(new URL("./worker.js", import.meta.url))`, so we load the
// worker from /ffmpeg/worker.js instead (classWorkerURL).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "public", "ffmpeg");
mkdirSync(dest, { recursive: true });

const coreSrc = join(root, "node_modules", "@ffmpeg", "core", "dist", "esm");
for (const name of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  copyFileSync(join(coreSrc, name), join(dest, name));
}

const pkgSrc = join(root, "node_modules", "@ffmpeg", "ffmpeg", "dist", "esm");
for (const name of ["worker.js", "const.js", "errors.js"]) {
  copyFileSync(join(pkgSrc, name), join(dest, name));
}

console.log("Copied ffmpeg core + worker → public/ffmpeg/");
