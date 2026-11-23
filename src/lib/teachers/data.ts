import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { studentLabels } from "@/lib/students/names";

export type ReviewRow = {
  id: string;
  student_id: string;
  attempt_id: string;
  teacher_id: string | null;
  status: "requested" | "done";
  source: "assigned" | "code" | "offer";
  total: number | null;
  created_at: string;
};

const COLS = "id, student_id, attempt_id, teacher_id, status, source, total, created_at";

export type TeacherData = {
  mine: ReviewRow[];
  open: ReviewRow[];
  names: Map<string, string>;
  students: { id: string; name: string }[];
};

/** Everything the teacher screens need. Server only (uses the secret key); the caller has already checked the role. */
export async function getTeacherData(teacherId: string, isAdmin: boolean): Promise<TeacherData> {
  const admin = createAdminClient();
  const empty: TeacherData = { mine: [], open: [], names: new Map(), students: [] };
  if (!admin) return empty;

  const mineQuery = admin.from("writing_reviews").select(COLS).order("created_at", { ascending: false }).limit(200);
  const [m, o, s] = await Promise.all([
    isAdmin ? mineQuery : mineQuery.eq("teacher_id", teacherId),
    admin.from("writing_reviews").select(COLS).is("teacher_id", null).eq("status", "requested").order("created_at", { ascending: true }).limit(50),
    isAdmin ? Promise.resolve({ data: [] }) : admin.from("profiles").select("id, full_name").eq("teacher_id", teacherId).order("full_name"),
  ]);
  const mine = (m.data ?? []) as ReviewRow[];
  const open = (o.data ?? []) as ReviewRow[];
  const students = await studentLabels(admin, (s.data ?? []) as { id: string; full_name: string | null }[]);

  const names = new Map<string, string>(students.map((x) => [x.id, x.name]));
  const missing = [...new Set([...mine, ...open].map((r) => r.student_id))].filter((id) => !names.has(id));
  if (missing.length) {
    const { data } = await admin.from("profiles").select("id, full_name").in("id", missing);
    for (const p of (data ?? []) as { id: string; full_name: string | null }[]) names.set(p.id, p.full_name ?? "Student");
  }
  return { mine, open, names, students };
}

export const sourceLabel = (s: ReviewRow["source"]) => (s === "offer" ? "asked for a teacher" : s === "code" ? "sent with your code" : "your student");
export const shortDate = (d: string, timeZone: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone });
