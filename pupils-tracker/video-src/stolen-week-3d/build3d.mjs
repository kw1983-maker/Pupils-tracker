// Builds the 3D Stolen Week: runs the lesson-video skill's build.mjs unchanged, then inlines three.js
// (vendor/three.min.js, r149 UMD → global THREE) ahead of the engine script.
//   node video-src/stolen-week-3d/build3d.mjs [extra build.mjs flags]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const build = join(homedir(), '.claude', 'skills', 'lesson-video', 'scripts', 'build.mjs');
const out = resolve(here, '..', '..', 'public', 'pets', 'stories', 'stolen-week-3d.html');

execFileSync(process.execPath, [build, here, out, ...process.argv.slice(2)], { stdio: 'inherit' });

const three = readFileSync(join(here, 'vendor', 'three.min.js'), 'utf8');
let html = readFileSync(out, 'utf8');
const at = html.indexOf('<script>');
if (at < 0) throw new Error('no <script> in built player');
html = html.slice(0, at) + '<script>' + three + '</script>\n' + html.slice(at);
writeFileSync(out, html);
console.log(`three.js inlined → ${out} (${(html.length / 1e6).toFixed(1)} MB)`);
