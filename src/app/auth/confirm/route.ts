import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { importGooglePhoto } from "@/lib/account/google-photo";
import { redeemFromSignup } from "@/lib/join/redeem";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_NEXT = new Set(["/dashboard", "/dashboard/account", "/teacher/account", "/admin/account", "/onboarding", "/onboarding/teacher", "/reset-password", "/"]);

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
  // An invited person (teacher, or a student added by a school) first chooses a password.
  if (type === "invite") next = "/reset-password?welcome=1";

  const fail = NextResponse.redirect(new URL("/login?error=link", request.url));
  // The provider (Google) sent the person back with an error, e.g. they pressed Cancel.
  if (searchParams.get("error")) return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  if (!getSupabaseEnv()) return fail;

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    // Google sign-in: use their Google photo as their profile photo (once, only if they have none).
    if (data?.user) await importGooglePhoto(data.user);
  }

  if (!ok) return fail;
  // A teacher or school code given at signup is used now, the first time the email is confirmed.
  const { data: who } = await supabase.auth.getUser();
  if (who.user) await redeemFromSignup(who.user);
  // "/" sends the user on to the right page for their role.
  return NextResponse.redirect(new URL(next, request.url));
}
