"use server";

import { redirect } from "next/navigation";

import { redeemFromSignup } from "@/lib/join/redeem";
import { homeForRole, isRole } from "@/lib/auth/roles";
import { NOT_CONFIGURED_MESSAGE, getSupabaseEnv } from "@/lib/supabase/env";
import { siteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from "@/lib/validation/auth";

export type ActionResult = { error: string } | undefined;

const GENERIC_ERROR = "Something went wrong on our side. Please wait a moment and try again.";

function friendlyAuthError(message: string, code?: string): string {
  const m = message.toLowerCase();
  if (code === "invalid_credentials" || m.includes("invalid login credentials"))
    return "That email and password don't match. Check for typos, or reset your password.";
  if (code === "email_not_confirmed" || m.includes("email not confirmed"))
    return "Please confirm your email first — open the link we sent you when you signed up.";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || m.includes("rate limit"))
    return "Too many attempts. Please wait a few minutes and try again.";
  if (code === "weak_password" || m.includes("password should"))
    return "That password is too easy to guess. Use a longer one with letters and numbers.";
  if (code === "same_password") return "Your new password must be different from your old one.";
  if (code === "user_already_exists" || m.includes("already registered"))
    return "An account with this email already exists. Log in instead.";
  return GENERIC_ERROR;
}

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!getSupabaseEnv()) return { error: NOT_CONFIGURED_MESSAGE };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: friendlyAuthError(error?.message ?? "", error?.code) };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();

  redirect(homeForRole(isRole(profile?.role) ? profile.role : "student"));
}

export async function signUp(input: unknown): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!getSupabaseEnv()) return { error: NOT_CONFIGURED_MESSAGE };

  const { fullName, email, phone, password, joinCode, intent } = parsed.data;
  // New teachers set up their workspace next; new students answer the student questions.
  const next = intent === "teacher" ? "/onboarding/teacher" : "/onboarding";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // New students answer the onboarding questions right after confirming their email.
      emailRedirectTo: `${await siteUrl()}/auth/confirm?next=${next}`,
      // Only name and phone are sent. The role is always set to "student"
      // by the database, never from this form.
      data: { full_name: fullName, phone: phone || null, ...(joinCode ? { join_code: joinCode } : {}) },
    },
  });
  if (error) return { error: friendlyAuthError(error.message, error.code) };

  // If email confirmation is switched off in Supabase, the user is logged in now.
  if (data.session) {
    if (data.user) await redeemFromSignup(data.user);
    redirect(next);
  }

  redirect(`/check-email?type=signup&email=${encodeURIComponent(email)}`);
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!getSupabaseEnv()) return { error: NOT_CONFIGURED_MESSAGE };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/reset-password`,
  });
  // Only rate-limit errors are shown. We never reveal whether an email exists.
  if (error && (error.code?.includes("rate_limit") || error.status === 429)) {
    return { error: friendlyAuthError(error.message, error.code) };
  }

  redirect(`/check-email?type=reset&email=${encodeURIComponent(parsed.data.email)}`);
}

export async function updatePassword(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!getSupabaseEnv()) return { error: NOT_CONFIGURED_MESSAGE };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return {
      error: "Your reset link has expired. Request a new one from the “Forgot password?” page.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: friendlyAuthError(error.message, error.code) };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", claims.claims.sub).maybeSingle();

  redirect(`${homeForRole(isRole(profile?.role) ? profile.role : "student")}?password=updated`);
}

export type SocialProvider = "google";

/** Continue with Google. Sends the browser to Google; they come back to /auth/confirm. */
export async function signInWithProvider(provider: unknown, nextPage?: unknown): Promise<ActionResult> {
  if (provider !== "google") return { error: GENERIC_ERROR };
  if (!getSupabaseEnv()) return { error: NOT_CONFIGURED_MESSAGE };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    // "/" sends the user to the right page for their role; new students land in onboarding from the dashboard.
    options: { redirectTo: `${await siteUrl()}/auth/confirm?next=${nextPage === "/onboarding/teacher" ? "/onboarding/teacher" : "/"}` },
  });
  if (error || !data.url) {
    return { error: "Sign-in with Google isn't available yet. Use your email and password for now." };
  }
  redirect(data.url);
}

export async function signOut() {
  if (getSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login?signed_out=1");
}
