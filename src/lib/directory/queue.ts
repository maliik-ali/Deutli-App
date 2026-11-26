import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

export type JoinRequestStatus = "new" | "payment_sent" | "assigned" | "declined";
export type MyJoinRequest = { id: string; status: JoinRequestStatus; createdAt: string };

/** A student who has no teacher or school yet: the only kind of student who can ask to join someone. */
export async function isStandalone(admin: Admin, studentId: string): Promise<boolean> {
  const { data } = await admin.from("profiles").select("teacher_id, academy_id").eq("id", studentId).maybeSingle();
  return !!data && !data.teacher_id && !data.academy_id;
}

/** The student's latest request to this teacher (so the page can say what happened to it). */
export async function getMyJoinRequest(admin: Admin, studentId: string, teacherId: string): Promise<MyJoinRequest | null> {
  const { data } = await admin.from("join_requests").select("id, status, created_at").eq("student_id", studentId).eq("teacher_id", teacherId).order("created_at", { ascending: false }).limit(1);
  const r = data?.[0] as { id: string; status: JoinRequestStatus; created_at: string } | undefined;
  return r ? { id: r.id, status: r.status, createdAt: r.created_at } : null;
}

export type QueueItem = {
  id: string;
  status: JoinRequestStatus;
  message: string | null;
  adminNote: string | null;
  createdAt: string;
  student: { id: string; name: string; email: string | null; phone: string | null };
  teacher: { id: string; name: string };
  academy: string | null;
};

/** The admin's queue: open requests first (oldest first), then finished ones (newest first). */
export async function listJoinRequests(admin: Admin, show: "open" | "done" | "all"): Promise<QueueItem[]> {
  let q = admin.from("join_requests").select("id, student_id, teacher_id, academy_id, message, status, admin_note, created_at").order("created_at", { ascending: show === "open" }).limit(200);
  if (show === "open") q = q.in("status", ["new", "payment_sent"]);
  if (show === "done") q = q.in("status", ["assigned", "declined"]);
  const { data } = await q;
  const rows = (data ?? []) as { id: string; student_id: string; teacher_id: string; academy_id: string | null; message: string | null; status: JoinRequestStatus; admin_note: string | null; created_at: string }[];
  if (!rows.length) return [];
  const peopleIds = [...new Set(rows.flatMap((r) => [r.student_id, r.teacher_id]))];
  const [people, acads] = await Promise.all([
    admin.from("profiles").select("id, full_name, phone").in("id", peopleIds),
    admin.from("academies").select("id, name").in("id", [...new Set(rows.map((r) => r.academy_id).filter((x): x is string => !!x))]),
  ]);
  const p = new Map(((people.data ?? []) as { id: string; full_name: string | null; phone: string | null }[]).map((x) => [x.id, x]));
  const a = new Map(((acads.data ?? []) as { id: string; name: string }[]).map((x) => [x.id, x.name]));
  const emails = new Map<string, string | null>();
  await Promise.all([...new Set(rows.map((r) => r.student_id))].map(async (id) => {
    const { data: u } = await admin.auth.admin.getUserById(id);
    emails.set(id, u.user?.email ?? null);
  }));
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    message: r.message,
    adminNote: r.admin_note,
    createdAt: r.created_at,
    student: { id: r.student_id, name: p.get(r.student_id)?.full_name ?? "Student", email: emails.get(r.student_id) ?? null, phone: p.get(r.student_id)?.phone ?? null },
    teacher: { id: r.teacher_id, name: p.get(r.teacher_id)?.full_name ?? "Teacher" },
    academy: r.academy_id ? (a.get(r.academy_id) ?? null) : null,
  }));
}
