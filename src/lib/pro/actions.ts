"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/** "I want Pro": saved so the academy can contact the student. Asking twice is fine. */
export async function requestPro(note: unknown): Promise<{ error: string } | { ok: true }> {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const n = z.string().trim().max(300).safeParse(note ?? "");
  if (!n.success) return { error: "Keep your note under 300 letters." };
  const supabase = await createClient();
  const { error } = await supabase.from("pro_requests").upsert({ user_id: user.id, note: n.data || null }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) return { error: "We couldn't save your request. Check your internet and try again." };
  revalidatePath("/dashboard/upgrade");
  return { ok: true };
}
