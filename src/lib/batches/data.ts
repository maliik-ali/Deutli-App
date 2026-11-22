import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type Batch = {
  id: string;
  academy_id: string;
  teacher_id: string;
  name: string;
  level: string | null;
  exam: string | null;
  starts_on: string | null;
  ends_on: string | null;
  archived: boolean;
  created_at: string;
};
export const BATCH_COLS = "id, academy_id, teacher_id, name, level, exam, starts_on, ends_on, archived, created_at";

export type Announcement = { id: string; title: string; body: string; created_at: string; author_id: string | null };

/** The teacher's own batches. Owners and admins of a workspace also see everyone's in that workspace. */
export async function listTeacherBatches(userId: string, academyId: string | null, seeAll: boolean) {
  const admin = createAdminClient();
  if (!admin) return [] as (Batch & { students: number })[];
  let q = admin.from("batches").select(BATCH_COLS).order("archived").order("created_at", { ascending: false });
  q = seeAll && academyId ? q.eq("academy_id", academyId) : q.eq("teacher_id", userId);
  const { data } = await q;
  const rows = (data ?? []) as Batch[];
  const counts = new Map<string, number>();
  if (rows.length) {
    const { data: m } = await admin.from("batch_members").select("batch_id").in("batch_id", rows.map((r) => r.id));
    for (const r of (m ?? []) as { batch_id: string }[]) counts.set(r.batch_id, (counts.get(r.batch_id) ?? 0) + 1);
  }
  return rows.map((r) => ({ ...r, students: counts.get(r.id) ?? 0 }));
}

/** A batch the teacher may manage: theirs, or any in a workspace they own or administer. */
export async function getManagedBatch(batchId: string, userId: string): Promise<Batch | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("batches").select(BATCH_COLS).eq("id", batchId).maybeSingle();
  const b = data as Batch | null;
  if (!b) return null;
  if (b.teacher_id === userId) return b;
  const { data: m } = await admin.from("academy_members").select("role").eq("academy_id", b.academy_id).eq("user_id", userId).maybeSingle();
  return m && (m.role === "owner" || m.role === "admin") ? b : null;
}

export async function listBatchMembers(batchId: string) {
  const admin = createAdminClient();
  if (!admin) return [] as { id: string; name: string }[];
  const { data } = await admin.from("batch_members").select("student_id").eq("batch_id", batchId);
  const ids = ((data ?? []) as { student_id: string }[]).map((r) => r.student_id);
  if (!ids.length) return [];
  const { data: p } = await admin.from("profiles").select("id, full_name").in("id", ids).order("full_name");
  return ((p ?? []) as { id: string; full_name: string | null }[]).map((r) => ({ id: r.id, name: r.full_name ?? "Student" }));
}

export async function listAnnouncements(batchId: string, limit = 30): Promise<Announcement[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("announcements").select("id, title, body, created_at, author_id").eq("batch_id", batchId).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as Announcement[];
}

/** Students the teacher can add: their own students (teacher_id) who are not in this batch yet. */
export async function listAddableStudents(teacherId: string, batchId: string) {
  const admin = createAdminClient();
  if (!admin) return [] as { id: string; name: string }[];
  const [{ data: mine }, { data: inBatch }] = await Promise.all([
    admin.from("profiles").select("id, full_name").eq("role", "student").eq("teacher_id", teacherId).order("full_name"),
    admin.from("batch_members").select("student_id").eq("batch_id", batchId),
  ]);
  const taken = new Set(((inBatch ?? []) as { student_id: string }[]).map((r) => r.student_id));
  return ((mine ?? []) as { id: string; full_name: string | null }[]).filter((s) => !taken.has(s.id)).map((s) => ({ id: s.id, name: s.full_name ?? "Student" }));
}

export async function listBatchClasses(batchId: string) {
  const admin = createAdminClient();
  if (!admin) return [] as { id: string; title: string; starts_at: string }[];
  const { data } = await admin.from("live_classes").select("id, title, starts_at").eq("batch_id", batchId).gte("starts_at", new Date().toISOString()).order("starts_at").limit(10);
  return (data ?? []) as { id: string; title: string; starts_at: string }[];
}

/** The student's batches (read on the server with the secret key; the student id is the logged-in user's). */
export async function listMyBatches(studentId: string) {
  const admin = createAdminClient();
  if (!admin) return [] as (Batch & { teacherName: string | null; latest: Announcement | null })[];
  const { data: m } = await admin.from("batch_members").select("batch_id").eq("student_id", studentId);
  const ids = ((m ?? []) as { batch_id: string }[]).map((r) => r.batch_id);
  if (!ids.length) return [];
  const { data } = await admin.from("batches").select(BATCH_COLS).in("id", ids).eq("archived", false).order("created_at", { ascending: false });
  const rows = (data ?? []) as Batch[];
  const { data: t } = await admin.from("profiles").select("id, full_name").in("id", [...new Set(rows.map((r) => r.teacher_id))]);
  const names = new Map(((t ?? []) as { id: string; full_name: string | null }[]).map((r) => [r.id, r.full_name]));
  const { data: a } = await admin.from("announcements").select("id, batch_id, title, body, created_at, author_id").in("batch_id", ids).order("created_at", { ascending: false });
  const latest = new Map<string, Announcement>();
  for (const r of (a ?? []) as (Announcement & { batch_id: string })[]) if (!latest.has(r.batch_id)) latest.set(r.batch_id, r);
  return rows.map((r) => ({ ...r, teacherName: names.get(r.teacher_id) ?? null, latest: latest.get(r.id) ?? null }));
}

/** One batch for a student, only if they are a member. */
export async function getMyBatch(batchId: string, studentId: string) {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: m } = await admin.from("batch_members").select("batch_id").eq("batch_id", batchId).eq("student_id", studentId).maybeSingle();
  if (!m) return null;
  const { data } = await admin.from("batches").select(BATCH_COLS).eq("id", batchId).maybeSingle();
  if (!data) return null;
  const b = data as Batch;
  const { data: t } = await admin.from("profiles").select("full_name").eq("id", b.teacher_id).maybeSingle();
  return { ...b, teacherName: (t?.full_name as string | null) ?? null };
}
