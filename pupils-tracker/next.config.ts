import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project; the parent dir contains a separate
  // (Vite) app with its own lockfile, which Next.js would otherwise infer.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
