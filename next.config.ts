import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Old link from before the menu change.
  async redirects() {
    return [{ source: "/dashboard/mock-exams", destination: "/dashboard/exam", permanent: true }];
  },
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
