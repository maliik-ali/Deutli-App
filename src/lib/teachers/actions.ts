"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { ensurePersonalAcademy } from "@/lib/academies/personal";
import { allow } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site-url";
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

const inviteSchema = z.object({ name: z.string().trim().min(1, "Enter the teacher's name.").max(120), email: z.string().trim().toLowerCase().email("Enter a valid email address.") });

/**
 * Admin: invite someone as a teacher by email. They get a link, choose a password, and land in the teacher area
 * with their own workspace. The role is set now, on the server, so it never depends on anything the invitee does.
 */
export async function inviteTeacher(input: unknown): Promise<Result> {
  const me = await requireUser(ADMINS);
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const admin = createAdminClient();
  if (!admin) return { error: "This needs SUPABASE_SECRET_KEY on the server." };
  if (!(await allow(`invite-teacher:${me.id}`, 20, 3600))) return { error: "Too many invites. Please wait a while and try again." };

  const { name, email } = parsed.data;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name },
    redirectTo: `${await siteUrl()}/auth/confirm?type=invite`,
  });
  if (error || !data.user) {
    if (/registered|exists/i.test(error?.message ?? "")) return { error: "That email already has an account. Find them in the list below and press Make teacher." };
    return { error: "The invite could not be sent. Check the email address and try again." };
  }

  // Teachers skip the student onboarding questions.
  const { error: roleError } = await admin.from("profiles").update({ role: "teacher", teacher_id: null, onboarded_at: new Date().toISOString() }).eq("id", data.user.id);
  if (roleError) return { error: "The invite was sent, but the teacher role could not be set. Find them below and press Make teacher." };
  await ensurePersonalAcademy(admin, data.user.id);
  revalidatePath("/admin/teachers");
  return { ok: true };
}
