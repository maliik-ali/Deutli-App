import "server-only";

import { getReadiness, type Readiness } from "@/lib/papers/readiness";
import type { AttemptResult } from "@/lib/papers/template";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * May this teacher see this student? Yes if the student is theirs (teacher_id), is in one of their batches,
 * or the teacher owns/administers the student's workspace. Super admins and academy admins see everyone.
 */
export async function canSeeStudent(viewerId: string, viewerRole: string, studentId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  if (viewerRole === "super_admin" || viewerRole === "academy_admin") return true;
  const { data: s } = await admin.from("profiles").select("role, teacher_id, academy_id").eq("id", studentId).maybeSingle();
  if (!s || s.role !== "student") return false;
  if (s.teacher_id === viewerId) return true;
  const [{ data: batches }, { data: mem }] = await Promise.all([
    admin.from("batches").select("id").eq("teacher_id", viewerId),
    s.academy_id ? admin.from("academy_members").select("role").eq("academy_id", s.academy_id).eq("user_id", viewerId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (mem && (mem.role === "owner" || mem.role === "admin")) return true;
  const ids = ((batches ?? []) as { id: string }[]).map((b) => b.id);
  if (!ids.length) return false;
  const { data: bm } = await admin.from("batch_members").select("batch_id").eq("student_id", studentId).in("batch_id", ids).limit(1);
  return !!bm?.length;
}

export type StudentOverview = {
  name: string;
  readiness: Readiness;
  attempts: { id: string; title: string; submittedAt: string; total: number; max: number }[];
  writing: { id: string; status: string; total: number | null; teacherName: string | null; createdAt: string }[];
  batches: { id: string; name: string }[];
  homework: { done: number; total: number };
};

/** Everything a teacher sees about one student. Call only after canSeeStudent. */
export async function getStudentOverview(studentId: string): Promise<StudentOverview | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: p } = await admin.from("profiles").select("full_name").eq("id", studentId).maybeSingle();
  if (!p) return null;
  const [readiness, att, wr, bm] = await Promise.all([
    getReadiness(studentId, admin),
    admin.from("mock_attempts").select("id, submitted_at, result, mock_papers(title)").eq("user_id", studentId).not("submitted_at", "is", null).order("submitted_at", { ascending: false }).limit(20),
    admin.from("writing_reviews").select("id, status, total, teacher_id, created_at").eq("student_id", studentId).order("created_at", { ascending: false }).limit(10),
    admin.from("batch_members").select("batch_id, batches(name)").eq("student_id", studentId),
  ]);
  const attempts = ((att.data ?? []) as unknown as { id: string; submitted_at: string; result: AttemptResult | null; mock_papers: { title: string } | null }[])
    .filter((a) => a.result && a.result.max > 0)
    .map((a) => ({ id: a.id, title: a.mock_papers?.title ?? "Mock exam", submittedAt: a.submitted_at, total: a.result!.total, max: a.result!.max }));
  const reviews = (wr.data ?? []) as { id: string; status: string; total: number | null; teacher_id: string | null; created_at: string }[];
  const tIds = [...new Set(reviews.map((r) => r.teacher_id).filter((x): x is string => !!x))];
  const names = new Map<string, string>();
  if (tIds.length) for (const t of ((await admin.from("profiles").select("id, full_name").in("id", tIds)).data ?? []) as { id: string; full_name: string | null }[]) names.set(t.id, t.full_name ?? "Teacher");
  const batches = ((bm.data ?? []) as unknown as { batch_id: string; batches: { name: string } | null }[]).map((b) => ({ id: b.batch_id, name: b.batches?.name ?? "Batch" }));

  // Homework: items shared with the student's batches, and how many they ticked done.
  let total = 0;
  let done = 0;
  if (batches.length) {
    const { data: mb } = await admin.from("material_batches").select("material_id").in("batch_id", batches.map((b) => b.id));
    const ids = [...new Set(((mb ?? []) as { material_id: string }[]).map((r) => r.material_id))];
    if (ids.length) {
      const [{ data: hw }, { data: dn }] = await Promise.all([
        admin.from("materials").select("id").in("id", ids).eq("kind", "homework"),
        admin.from("material_done").select("material_id").eq("student_id", studentId).in("material_id", ids),
      ]);
      total = hw?.length ?? 0;
      const hwIds = new Set(((hw ?? []) as { id: string }[]).map((h) => h.id));
      done = ((dn ?? []) as { material_id: string }[]).filter((d) => hwIds.has(d.material_id)).length;
    }
  }
  return {
    name: p.full_name ?? "Student",
    readiness,
    attempts,
    writing: reviews.map((r) => ({ id: r.id, status: r.status, total: r.total, teacherName: r.teacher_id ? (names.get(r.teacher_id) ?? null) : null, createdAt: r.created_at })),
    batches,
    homework: { done, total },
  };
}
