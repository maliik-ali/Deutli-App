"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { ensurePersonalAcademy } from "@/lib/academies/personal";
import { createAdminClient } from "@/lib/supabase/admin";

const ADMINS = ["academy_admin", "super_admin"] as const;
const GENERIC = "That didn't work. Please try again.";
type Result = { error: string } | { ok: true };

/** Admin: give a student a teacher (or remove the teacher with an empty value). */
export async function assignTeacher(studentId: unknown, teacherId: unknown): Promise<Result> {
  await requireUser(ADMINS);
  const sid = z.string().uuid().safeParse(studentId);
  const tid = z.union([z.string().uuid(), z.literal("")]).safeParse(teacherId);
  const admin = createAdminClient();
  if (!sid.success || !tid.success || !admin) return { error: GENERIC };

  const { data: student } = await admin.from("profiles").select("role").eq("id", sid.data).maybeSingle();
  if (student?.role !== "student") return { error: "Only students can have a teacher." };
  if (tid.data) {
    const { data: teacher } = await admin.from("profiles").select("role").eq("id", tid.data).maybeSingle();
    if (teacher?.role !== "teacher") return { error: "Choose a teacher." };
  }
  const { error } = await admin.from("profiles").update({ teacher_id: tid.data || null }).eq("id", sid.data);
  if (error) return { error: GENERIC };
  revalidatePath("/admin/teachers");
  return { ok: true };
}

/** Admin: make a student a teacher, or turn a teacher back into a student. Admin roles are never touched here. */
export async function setTeacherRole(userId: unknown, makeTeacher: unknown): Promise<Result> {
  const me = await requireUser(ADMINS);
  const uid = z.string().uuid().safeParse(userId);
  const on = z.boolean().safeParse(makeTeacher);
  const admin = createAdminClient();
  if (!uid.success || !on.success || !admin) return { error: GENERIC };
  if (uid.data === me.id) return { error: "You can't change your own role." };

  const { data: target } = await admin.from("profiles").select("role").eq("id", uid.data).maybeSingle();
  if (!target || (target.role !== "student" && target.role !== "teacher")) return { error: "Only students and teachers can be changed here." };
  const role = on.data ? "teacher" : "student";
  if (target.role === role) return { ok: true };

  const { error } = await admin.from("profiles").update({ role }).eq("id", uid.data);
  if (error) return { error: GENERIC };
  if (!on.data) {
    // A teacher turned back into a student: their students go back to "standalone".
    await admin.from("profiles").update({ teacher_id: null }).eq("teacher_id", uid.data);
  } else {
    // A teacher is not a student of someone else.
    await admin.from("profiles").update({ teacher_id: null }).eq("id", uid.data);
    // Every teacher gets a personal workspace (an academy of one).
    await ensurePersonalAcademy(admin, uid.data);
  }
  revalidatePath("/admin/teachers");
  return { ok: true };
}
