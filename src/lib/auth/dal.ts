import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { homeForRole, isRole, type Role } from "./roles";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: Role;
};

/**
 * Reads the logged-in user and their role from the database, on the server.
 * The role always comes from public.profiles — never from the browser.
 * Returns null when nobody is logged in.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Always run per request (never pre-rendered at build time).
  await connection();
  if (!getSupabaseEnv()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", claims.sub)
    .maybeSingle();

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    fullName: profile?.full_name ?? null,
    // No profile row (should not happen) => lowest permissions.
    role: isRole(profile?.role) ? profile.role : "student",
  };
});

/** Use at the top of every protected page/layout. */
export async function requireUser(allowed?: readonly Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (allowed && !allowed.includes(user.role)) redirect(homeForRole(user.role));
  return user;
}

/** On login/signup pages: send already-logged-in users to their home. */
export async function redirectIfLoggedIn() {
  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));
}
