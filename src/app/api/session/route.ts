import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { homeForRole } from "@/lib/auth/roles";

/**
 * Tells the marketing website (www.deutli.com) whether the visitor is logged in,
 * so its top nav can show "Dashboard" instead of "Sign in". Returns only a yes/no
 * and the page to open, never personal data. www and app are the same site, so the
 * session cookie is sent with the request. Only our own origins may read the answer.
 */
const ALLOWED_ORIGINS = ["https://www.deutli.com", "https://deutli.com"];
if (process.env.NODE_ENV !== "production") ALLOWED_ORIGINS.push("http://localhost:3000", "http://localhost:3001");

function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = { Vary: "Origin", "Cache-Control": "private, no-store" };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
}

export async function GET(request: NextRequest) {
  const headers = corsHeaders(request);
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ loggedIn: false }, { headers });
    return NextResponse.json({ loggedIn: true, home: homeForRole(user.role) }, { headers });
  } catch {
    return NextResponse.json({ loggedIn: false }, { headers });
  }
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: { ...corsHeaders(request), "Access-Control-Allow-Methods": "GET", "Access-Control-Max-Age": "600" } });
}
