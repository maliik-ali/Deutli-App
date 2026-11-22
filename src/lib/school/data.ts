import "server-only";

import { countWorkspaceStudents, getWorkspacePlans } from "@/lib/academies/data";
import { createAdminClient } from "@/lib/supabase/admin";

export type AttendanceRow = { studentId: string; name: string; held: number; attended: number; pct: number | null };

/** Attendance per student of one batch: classes of the batch that already happened, and how many the student attended. */
export async function getBatchAttendance(batchId: string): Promise<{ held: number; rows: AttendanceRow[] }> {
  const admin = createAdminClient();
  if (!admin) return { held: 0, rows: [] };
  const [{ data: classes }, { data: members }] = await Promise.all([
    admin.from("live_classes").select("id").eq("batch_id", batchId).eq("status", "scheduled").lt("starts_at", new Date().toISOString()),
    admin.from("batch_members").select("student_id").eq("batch_id", batchId),
  ]);
  const classIds = ((classes ?? []) as { id: string }[]).map((c) => c.id);
  const studentIds = ((members ?? []) as { student_id: string }[]).map((m) => m.student_id);
  if (!studentIds.length) return { held: classIds.length, rows: [] };
  const [{ data: att }, { data: names }] = await Promise.all([
    classIds.length ? admin.from("class_registrations").select("user_id").in("class_id", classIds).eq("attended", true).in("user_id", studentIds) : Promise.resolve({ data: [] }),
    admin.from("profiles").select("id, full_name").in("id", studentIds),
  ]);
  const count = new Map<string, number>();
  for (const r of (att ?? []) as { user_id: string }[]) count.set(r.user_id, (count.get(r.user_id) ?? 0) + 1);
  const rows = ((names ?? []) as { id: string; full_name: string | null }[])
    .map((p) => ({ studentId: p.id, name: p.full_name ?? "Student", held: classIds.length, attended: count.get(p.id) ?? 0, pct: classIds.length ? Math.round(((count.get(p.id) ?? 0) / classIds.length) * 100) : null }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { held: classIds.length, rows };
}

export type SchoolOverview = {
  planName: string;
  students: number;
  maxStudents: number | null;
  teachers: { id: string; name: string; email: string | null; role: string; students: number }[];
  maxTeachers: number | null;
  batches: { id: string; name: string; teacherName: string; students: number; held: number; attendancePct: number | null; homeworkPct: number | null }[];
};

/** The school report: teachers, students against the limit, and per batch attendance and homework completion. */
export async function getSchoolOverview(academyId: string, planId: string | null): Promise<SchoolOverview> {
  const admin = createAdminClient();
  const empty: SchoolOverview = { planName: "", students: 0, maxStudents: null, teachers: [], maxTeachers: null, batches: [] };
  if (!admin) return empty;
  const [plans, counts, { data: members }, { data: batches }] = await Promise.all([
    getWorkspacePlans(),
    countWorkspaceStudents([academyId]),
    admin.from("academy_members").select("user_id, role").eq("academy_id", academyId),
    admin.from("batches").select("id, name, teacher_id").eq("academy_id", academyId).eq("archived", false),
  ]);
  const plan = plans.find((p) => p.id === planId);
  const mem = (members ?? []) as { user_id: string; role: string }[];
  const profs = mem.length ? (((await admin.from("profiles").select("id, full_name").in("id", mem.map((m) => m.user_id))).data ?? []) as { id: string; full_name: string | null }[]) : [];
  const name = new Map(profs.map((p) => [p.id, p.full_name ?? "Teacher"]));
  const teachers = await Promise.all(
    mem.map(async (m) => {
      const { data: u } = await admin.auth.admin.getUserById(m.user_id);
      const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("teacher_id", m.user_id);
      return { id: m.user_id, name: name.get(m.user_id) ?? "Teacher", email: u.user?.email ?? null, role: m.role, students: count ?? 0 };
    }),
  );
  const bs = (batches ?? []) as { id: string; name: string; teacher_id: string }[];
  const rows = await Promise.all(
    bs.map(async (b) => {
      const [att, { data: bm }, { data: mb }] = await Promise.all([
        getBatchAttendance(b.id),
        admin.from("batch_members").select("student_id").eq("batch_id", b.id),
        admin.from("material_batches").select("material_id").eq("batch_id", b.id),
      ]);
      const studentIds = ((bm ?? []) as { student_id: string }[]).map((x) => x.student_id);
      const matIds = ((mb ?? []) as { material_id: string }[]).map((x) => x.material_id);
      let homeworkPct: number | null = null;
      if (matIds.length && studentIds.length) {
        const { data: hw } = await admin.from("materials").select("id").in("id", matIds).eq("kind", "homework");
        const hwIds = ((hw ?? []) as { id: string }[]).map((h) => h.id);
        if (hwIds.length) {
          const { data: done } = await admin.from("material_done").select("material_id").in("material_id", hwIds).in("student_id", studentIds);
          homeworkPct = Math.round((((done ?? []).length) / (hwIds.length * studentIds.length)) * 100);
        }
      }
      const withPct = att.rows.filter((r) => r.pct != null);
      const attendancePct = withPct.length ? Math.round(withPct.reduce((s, r) => s + (r.pct as number), 0) / withPct.length) : null;
      return { id: b.id, name: b.name, teacherName: name.get(b.teacher_id) ?? "Teacher", students: studentIds.length, held: att.held, attendancePct, homeworkPct };
    }),
  );
  return { planName: plan?.name ?? "", students: counts.get(academyId) ?? 0, maxStudents: plan?.max_students ?? null, teachers, maxTeachers: plan?.max_teachers ?? null, batches: rows };
}
