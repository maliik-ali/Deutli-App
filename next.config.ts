import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Auth reads cookies on every request, so we keep standard dynamic
  // rendering (cacheComponents off) — simpler and the Supabase SSR guide's model.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
