import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { cleanLanguages, type LanguageCode } from "@/lib/languages";
import { cleanTimeZone, DEFAULT_TIME_ZONE, isTimeZone, todayIn } from "@/lib/time";
import { homeForRole, isRole, type Role } from "./roles";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: Role;
  /** Languages the user wants word meanings in (at least English). */
  languages: LanguageCode[];
  /** Path of the profile picture in the private "avatars" bucket, or null. */
  avatarPath: string | null;
  /** When the signup questions were answered (or skipped); null = not yet. */
  onboardedAt: string | null;
  exam: string | null;
  /** Exam day (YYYY-MM-DD) if the student gave one. */
  examDate: string | null;
  /** What worries the student about the exam (onboarding), e.g. ["lesen", "sprechen"]. */
  focusSkills: string[];
  /** The user's time zone (e.g. "Europe/Berlin"); Pakistan time until the device's is detected. */
  timeZone: string;
  /** False until the device's time zone was saved (or the user chose one). */
  timeZoneSaved: boolean;
  /** The student's own teacher (profiles.teacher_id), or null for a standalone student. */
  teacherId: string | null;
  /** Deutli Pro runs until this date (YYYY-MM-DD), or null. */
  proUntil: string | null;
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
    .select("full_name, role, languages, avatar_path, onboarded_at, exam, exam_date, focus_skills, time_zone, teacher_id, pro_until")
    .eq("id", claims.sub)
    .maybeSingle();

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    fullName: profile?.full_name ?? null,
    // No profile row (should not happen) => lowest permissions.
    role: isRole(profile?.role) ? profile.role : "student",
    languages: cleanLanguages(profile?.languages),
    avatarPath: profile?.avatar_path ?? null,
    onboardedAt: profile?.onboarded_at ?? null,
    exam: profile?.exam ?? null,
    examDate: profile?.exam_date ?? null,
    focusSkills: Array.isArray(profile?.focus_skills) ? (profile.focus_skills as string[]) : [],
    timeZone: cleanTimeZone(profile?.time_zone),
    timeZoneSaved: isTimeZone(profile?.time_zone),
    teacherId: profile?.teacher_id ?? null,
    proUntil: profile?.pro_until ?? null,
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

/** Pro students (and admins, who can test everything) may open premium papers. */
export function hasPro(user: Pick<CurrentUser, "proUntil" | "role"> & { timeZone?: string }): boolean {
  if (user.role !== "student") return true;
  if (!user.proUntil) return false;
  const today = todayIn(user.timeZone ?? DEFAULT_TIME_ZONE);
  return user.proUntil >= today;
}

/** Today's date (YYYY-MM-DD) in the signed-in user's time zone (Pakistan time if nobody is signed in). */
export async function todayForUser(): Promise<string> {
  const user = await getCurrentUser();
  return todayIn(user?.timeZone ?? DEFAULT_TIME_ZONE);
}
