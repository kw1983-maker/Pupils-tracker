import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored third-party bundles (e.g. three.min.js for the 3D pet stories)
    "video-src/**/vendor/**",
    // Prebuilt ffmpeg.wasm core (Emscripten output) used for WMA → MP3 conversion
    "public/ffmpeg/**",
    // Generated Capacitor Android project (its copied web assets included)
    "android/**",
  ]),
]);

export default eslintConfig;
