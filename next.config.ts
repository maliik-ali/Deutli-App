import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep Next.js on its security-upgrade track (set by `next upgrade --agent=security`).
    agentUpgrade: "security",
  },
  // Browser protections on every page: no framing (clickjacking), no sniffing, HTTPS only, no stray plugins.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
    ];
  },
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
