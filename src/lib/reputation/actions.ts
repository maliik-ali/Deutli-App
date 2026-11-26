"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

/** Deutli admins mark a teacher "Verified by Deutli" after checking their certificate, or take the mark away. */
export async function setTeacherVerified(teacherId: unknown, verified: unknown): Promise<{ error: string } | { ok: true }> {
  const me = await requireUser(["academy_admin", "super_admin"]);
  const id = z.uuid().safeParse(teacherId);
  const admin = createAdminClient();
  if (!id.success || typeof verified !== "boolean" || !admin) return { error: "That didn't work. Please try again." };
  const { data: p } = await admin.from("profiles").select("role").eq("id", id.data).maybeSingle();
  if (p?.role !== "teacher") return { error: "Only teachers can be verified." };
  const { error } = verified
    ? await admin.from("teacher_verifications").upsert({ teacher_id: id.data, verified_by: me.id, verified_at: new Date().toISOString() }, { onConflict: "teacher_id" })
    : await admin.from("teacher_verifications").delete().eq("teacher_id", id.data);
  if (error) return { error: "That didn't work. Please try again." };
  revalidatePath("/admin/teachers");
  revalidatePath("/dashboard/teachers", "layout");
  revalidatePath("/dashboard/find-teacher");
  return { ok: true };
}
