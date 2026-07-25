import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// The pet system's rules — level curve, hatch detection, the mark economy and
// the PK balance — are pure functions, so they run in plain Node without a DOM.
// Anything that touches the browser (audio, sprites) stays out of these suites.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    // Mirror the "@/*" path alias from tsconfig.json.
    alias: { "@": resolve(__dirname, ".") },
  },
});
