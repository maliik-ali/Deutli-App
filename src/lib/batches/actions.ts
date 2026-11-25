"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { newCode } from "@/lib/join/codes";
import { sendEmail } from "@/lib/email/send";
import { announcementEmail } from "@/lib/email/templates";
import { createAdminClient } from "@/lib/supabase/admin";
import { getManagedBatch } from "./data";

const GENERIC = "That didn't work. Please try again.";
type Result = { error: string } | { ok: true };
const uuid = z.string().uuid();

async function teacher() {
  const user = await requireUser(["teacher"]);
  const ws = await getMyWorkspace(user.id);
  return { user, ws, admin: createAdminClient() };
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Give the batch a name.").max(80),
  level: z.enum(["", "A1", "A2", "B1", "B2", "C1", "C2"]),
  exam: z.string().trim().max(40),
  startsOn: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use a valid start date."),
  endsOn: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use a valid end date."),
});

export async function createBatch(input: unknown): Promise<{ error: string } | { ok: true; id: string }> {
  const { user, ws, admin } = await teacher();
  const p = createSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  if (!ws || !admin) return { error: "You need a workspace first. Please contact us." };
  if (p.data.startsOn && p.data.endsOn && p.data.endsOn < p.data.startsOn) return { error: "The end date is before the start date." };
  const { data, error } = await admin
    .from("batches")
    .insert({ academy_id: ws.workspace.id, teacher_id: user.id, name: p.data.name, level: p.data.level || null, exam: p.data.exam || null, starts_on: p.data.startsOn || null, ends_on: p.data.endsOn || null })
    .select("id")
    .single();
  if (error || !data) return { error: GENERIC };
  revalidatePath("/teacher/batches");
  return { ok: true, id: data.id };
}

export async function setBatchArchived(batchId: unknown, archived: unknown): Promise<Result> {
  const { user, admin } = await teacher();
  const id = uuid.safeParse(batchId);
  if (!id.success || typeof archived !== "boolean" || !admin || !(await getManagedBatch(id.data, user.id))) return { error: GENERIC };
  await admin.from("batches").update({ archived }).eq("id", id.data);
  revalidatePath("/teacher/batches");
  revalidatePath(`/teacher/batches/${id.data}`);
  return { ok: true };
}

/** Deletes the batch itself. Students, classes and material stay; only their link to this batch, its announcements and its codes go. */
export async function deleteBatch(batchId: unknown): Promise<Result> {
  const { user, admin } = await teacher();
  const id = uuid.safeParse(batchId);
  if (!id.success || !admin || !(await getManagedBatch(id.data, user.id))) return { error: GENERIC };
  const { error } = await admin.from("batches").delete().eq("id", id.data);
  if (error) return { error: GENERIC };
  revalidatePath("/teacher/batches");
  return { ok: true };
}

export async function addStudentsToBatch(batchId: unknown, studentIds: unknown): Promise<Result> {
  const { user, admin } = await teacher();
  const id = uuid.safeParse(batchId);
  const ids = z.array(uuid).min(1, "Choose at least one student.").max(200).safeParse(studentIds);
  if (!id.success || !admin) return { error: GENERIC };
  if (!ids.success) return { error: ids.error.issues[0].message };
  const batch = await getManagedBatch(id.data, user.id);
  if (!batch) return { error: GENERIC };
  // Only the teacher's own students can be added.
  const { data: ok } = await admin.from("profiles").select("id").eq("role", "student").eq("teacher_id", batch.teacher_id).in("id", ids.data);
  const valid = ((ok ?? []) as { id: string }[]).map((r) => r.id);
  if (!valid.length) return { error: "Those students aren't yours." };
  await admin.from("batch_members").upsert(valid.map((s) => ({ batch_id: batch.id, student_id: s, academy_id: batch.academy_id })), { onConflict: "batch_id,student_id", ignoreDuplicates: true });
  revalidatePath(`/teacher/batches/${batch.id}`);
  return { ok: true };
}

export async function removeStudentFromBatch(batchId: unknown, studentId: unknown): Promise<Result> {
  const { user, admin } = await teacher();
  const b = uuid.safeParse(batchId);
  const s = uuid.safeParse(studentId);
  if (!b.success || !s.success || !admin || !(await getManagedBatch(b.data, user.id))) return { error: GENERIC };
  await admin.from("batch_members").delete().eq("batch_id", b.data).eq("student_id", s.data);
  revalidatePath(`/teacher/batches/${b.data}`);
  return { ok: true };
}

const postSchema = z.object({ batchId: uuid, title: z.string().trim().min(1, "Write a title.").max(120), body: z.string().trim().min(1, "Write the message.").max(4000) });

/** Post an announcement (not a chat) and email the students of the batch (best effort, max 200). */
export async function postAnnouncement(input: unknown): Promise<Result> {
  const { user, admin } = await teacher();
  const p = postSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  if (!admin) return { error: GENERIC };
  const batch = await getManagedBatch(p.data.batchId, user.id);
  if (!batch) return { error: GENERIC };
  const { count } = await admin.from("batch_members").select("student_id", { count: "exact", head: true }).eq("batch_id", batch.id);
  if (!count) return { error: "Add students to this batch first. Nobody would see this post." };
  const { error } = await admin.from("announcements").insert({ batch_id: batch.id, academy_id: batch.academy_id, author_id: user.id, title: p.data.title, body: p.data.body });
  if (error) return { error: GENERIC };

  const { data: m } = await admin.from("batch_members").select("student_id").eq("batch_id", batch.id).limit(200);
  for (const row of (m ?? []) as { student_id: string }[]) {
    try {
      const [{ data: au }, { data: pr }] = await Promise.all([admin.auth.admin.getUserById(row.student_id), admin.from("profiles").select("full_name").eq("id", row.student_id).maybeSingle()]);
      if (au.user?.email) await sendEmail({ to: au.user.email, ...announcementEmail({ name: pr?.full_name ?? null, batchName: batch.name, title: p.data.title, body: p.data.body, teacherName: user.fullName }) });
    } catch {
      /* a failed email never stops the post */
    }
  }
  revalidatePath(`/teacher/batches/${batch.id}`);
  return { ok: true };
}

export async function deleteAnnouncement(batchId: unknown, announcementId: unknown): Promise<Result> {
  const { user, admin } = await teacher();
  const b = uuid.safeParse(batchId);
  const a = uuid.safeParse(announcementId);
  if (!b.success || !a.success || !admin || !(await getManagedBatch(b.data, user.id))) return { error: GENERIC };
  await admin.from("announcements").delete().eq("id", a.data).eq("batch_id", b.data);
  revalidatePath(`/teacher/batches/${b.data}`);
  return { ok: true };
}

/** A join code that puts new students straight into this batch. */
export async function makeBatchJoinCode(batchId: unknown): Promise<{ error: string } | { ok: true; code: string }> {
  const { user, admin } = await teacher();
  const b = uuid.safeParse(batchId);
  if (!b.success || !admin) return { error: GENERIC };
  const batch = await getManagedBatch(b.data, user.id);
  if (!batch) return { error: GENERIC };
  await admin.from("join_codes").update({ active: false }).eq("batch_id", batch.id);
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    const { error } = await admin.from("join_codes").insert({ code, academy_id: batch.academy_id, teacher_id: batch.teacher_id, batch_id: batch.id });
    if (!error) {
      revalidatePath(`/teacher/batches/${batch.id}`);
      return { ok: true, code };
    }
  }
  return { error: GENERIC };
}
