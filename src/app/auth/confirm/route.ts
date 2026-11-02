import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_NEXT = new Set(["/dashboard", "/reset-password", "/"]);

/**
 * Email links (confirm signup, reset password) land here.
 * Supports the recommended token_hash links and the default ?code= links.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  // Only allow known internal pages (prevents redirecting to other websites).
  let next = ALLOWED_NEXT.has(nextParam) ? nextParam : "/";
  if (type === "recovery") next = "/reset-password";

  const fail = NextResponse.redirect(new URL("/login?error=link", request.url));
  if (!getSupabaseEnv()) return fail;

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (!ok) return fail;
  // "/" sends the user on to the right page for their role.
  return NextResponse.redirect(new URL(next, request.url));
}
