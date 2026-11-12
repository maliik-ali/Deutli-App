"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { changePasswordSchema, fullNameRules, phoneRules } from "@/lib/validation/auth";

export type AccountResult = { error: string } | { ok: true };

const SAVE_ERROR = "We couldn't save this. Check your internet and try again.";
const ROLES = ["student", "academy_admin", "super_admin"] as const;

function refresh() {
  // The name also shows in the sidebar and the dashboard greeting.
  revalidatePath("/dashboard", "layout");
}

/** Change your own name. Only full_name and phone can be changed by the user (database grant). */
export async function updateFullName(value: unknown): Promise<AccountResult> {
  const user = await requireUser(ROLES);
  const parsed = fullNameRules.safeParse(value);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data }).eq("id", user.id);
  if (error) return { error: SAVE_ERROR };
  refresh();
  return { ok: true };
}

export async function updatePhone(value: unknown): Promise<AccountResult> {
  const user = await requireUser(ROLES);
  const parsed = phoneRules.safeParse(value);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ phone: parsed.data || null })
    .eq("id", user.id);
  if (error) return { error: SAVE_ERROR };
  refresh();
  return { ok: true };
}

/** Change password. Checks the current password first, so a borrowed open laptop can't change it. */
export async function changePassword(input: unknown): Promise<AccountResult> {
  const user = await requireUser(ROLES);
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!user.email) return { error: SAVE_ERROR };

  const supabase = await createClient();
  const check = await supabase.auth.signInWithPassword({ email: user.email, password: parsed.data.currentPassword });
  if (check.error) {
    const limited = check.error.status === 429 || check.error.code?.includes("rate_limit");
    return {
      error: limited
        ? "Too many attempts. Please wait a few minutes and try again."
        : "Your current password isn't right. Check it and try again.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "weak_password") return { error: "That password is too easy to guess. Use a longer one." };
    if (error.code === "same_password") return { error: "Your new password must be different from your current one." };
    return { error: SAVE_ERROR };
  }
  return { ok: true };
}
