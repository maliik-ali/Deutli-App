import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/login", "/signup", "/privacy", "/terms"], disallow: ["/dashboard", "/admin", "/teacher", "/exam", "/practice", "/vocabulary", "/onboarding", "/api"] }],
  };
}
