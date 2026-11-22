import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Short URL-safe name for a workspace, with a random tail so it is unique. */
export function makeSlug(name: string): string {
  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28) || "workspace";
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Gives a teacher a personal workspace (kind 'teacher', Teacher Free plan) if they own none yet.
 * Call with the secret-key client, after the role has been checked on the server.
 */
export async function ensurePersonalAcademy(admin: SupabaseClient, userId: string): Promise<void> {
  const { data: owned } = await admin.from("academy_members").select("academy_id").eq("user_id", userId).eq("role", "owner").limit(1);
  if (owned && owned.length > 0) return;
  const [{ data: profile }, { data: plan }] = await Promise.all([
    admin.from("profiles").select("full_name, academy_id").eq("id", userId).maybeSingle(),
    admin.from("plans").select("id").eq("code", "teacher_free").maybeSingle(),
  ]);
  const name = `${profile?.full_name?.trim() || "Teacher"}'s workspace`;
  const { data: academy } = await admin
    .from("academies")
    .insert({ name, kind: "teacher", owner_id: userId, plan_id: plan?.id ?? null, slug: makeSlug(name) })
    .select("id")
    .single();
  if (!academy) return;
  await admin.from("academy_members").insert({ academy_id: academy.id, user_id: userId, role: "owner" });
  if (!profile?.academy_id) await admin.from("profiles").update({ academy_id: academy.id }).eq("id", userId);
}
