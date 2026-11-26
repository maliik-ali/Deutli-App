"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { allow } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error: string } | { ok: true };
const SAVE_ERROR = "We couldn't send this. Check your internet and try again.";

const schema = z.object({ teacherId: z.uuid(), message: z.string().trim().max(300, "Keep your message under 300 characters.").default("") });

/**
 * A student who is learning on their own asks to join a listed teacher. Deutli takes it from there by hand:
 * we send the payment link, then add the student to the teacher. Checked here on the server.
 */
export async function requestToJoin(input: unknown): Promise<Result> {
  const user = await requireUser(["student"]);
  const p = schema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  const admin = createAdminClient();
  if (!admin) return { error: SAVE_ERROR };
  if (!(await allow(`join-request:${user.id}`, 6, 3600))) return { error: "Too many requests. Please wait a while and try again." };

  // Only a learner without a teacher or school can ask; they join one teacher at a time.
  const { data: me } = await admin.from("profiles").select("teacher_id, academy_id").eq("id", user.id).maybeSingle();
  if (me?.teacher_id || me?.academy_id) return { error: "You already study with a teacher or school." };

  // The teacher must be public and in a listed academy.
  const { data: member } = await admin.from("academy_members").select("academy_id").eq("user_id", p.data.teacherId);
  const academyIds = ((member ?? []) as { academy_id: string }[]).map((m) => m.academy_id);
  const { data: acad } = academyIds.length ? await admin.from("academies").select("id").in("id", academyIds).eq("is_listed", true).limit(1) : { data: [] };
  const { data: tp } = await admin.from("teacher_profiles").select("is_public").eq("user_id", p.data.teacherId).maybeSingle();
  if (!acad?.[0] || tp?.is_public === false) return { error: "This teacher isn't taking new students through Deutli right now." };

  const { error } = await admin.from("join_requests").insert({ student_id: user.id, teacher_id: p.data.teacherId, academy_id: acad[0].id as string, message: p.data.message || null });
  if (error) return { error: /duplicate|unique/i.test(error.message) ? "You already sent a request to this teacher." : SAVE_ERROR };
  revalidatePath("/dashboard/teachers", "layout");
  revalidatePath("/admin/join-requests");
  return { ok: true };
}

/** The student takes back a request that is still open. */
export async function cancelJoinRequest(requestId: unknown): Promise<Result> {
  const user = await requireUser(["student"]);
  const id = z.uuid().safeParse(requestId);
  const admin = createAdminClient();
  if (!id.success || !admin) return { error: SAVE_ERROR };
  const { error } = await admin.from("join_requests").delete().eq("id", id.data).eq("student_id", user.id).in("status", ["new", "payment_sent"]);
  if (error) return { error: SAVE_ERROR };
  revalidatePath("/dashboard/teachers", "layout");
  revalidatePath("/admin/join-requests");
  return { ok: true };
}

const adminSchema = z.object({ id: z.uuid(), action: z.enum(["payment_sent", "assign", "decline", "reopen", "note"]), note: z.string().trim().max(500).optional() });

/**
 * Deutli admins work the queue: payment link sent, then assign (the student becomes the teacher's student in that
 * academy), or decline. Money is handled outside the app for now.
 */
export async function updateJoinRequest(input: unknown): Promise<Result> {
  await requireUser(["academy_admin", "super_admin"]);
  const p = adminSchema.safeParse(input);
  if (!p.success) return { error: SAVE_ERROR };
  const admin = createAdminClient();
  if (!admin) return { error: SAVE_ERROR };
  const { data: req } = await admin.from("join_requests").select("student_id, teacher_id, academy_id, status").eq("id", p.data.id).maybeSingle();
  if (!req) return { error: "That request no longer exists." };

  if (p.data.action === "assign") {
    const { error: e1 } = await admin.from("profiles").update({ teacher_id: req.teacher_id, academy_id: req.academy_id }).eq("id", req.student_id).eq("role", "student");
    if (e1) return { error: SAVE_ERROR };
  }
  const status = p.data.action === "note" ? undefined : { payment_sent: "payment_sent", assign: "assigned", decline: "declined", reopen: "new" }[p.data.action];
  const { error } = await admin
    .from("join_requests")
    .update({ ...(status ? { status } : {}), updated_at: new Date().toISOString(), ...(p.data.note !== undefined ? { admin_note: p.data.note || null } : {}) })
    .eq("id", p.data.id);
  if (error) return { error: SAVE_ERROR };
  revalidatePath("/admin/join-requests");
  revalidatePath("/dashboard/teachers", "layout");
  revalidatePath("/teacher/students");
  return { ok: true };
}
