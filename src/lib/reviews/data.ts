import "server-only";

import { getTeacherAcademy } from "@/lib/academies/profile";
import { HELPED, MIN_DAYS_IN_BATCH, shortName } from "@/lib/reviews/constants";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

export type ReviewView = {
  id: string;
  rating: number;
  helped: string[];
  body: string | null;
  reply: string | null;
  createdAt: string;
  /** "Ayesha K." */
  name: string;
  /** The teacher this review is about (shown on academy pages). */
  teacherId: string;
  teacherName: string;
  /** Who wrote it (never shown; used so authors do not get a Report button on their own review). */
  studentId: string;
};

type Row = {
  id: string;
  teacher_id: string;
  student_id: string;
  rating: number;
  helped: string[] | null;
  body: string | null;
  reply: string | null;
  created_at: string;
  status: string;
};
const COLS = "id, teacher_id, student_id, rating, helped, body, reply, created_at, status";

export const helpedLabel = (id: string) => HELPED.find((h) => h.id === id)?.label ?? id;

async function names(admin: Admin, ids: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (!ids.length) return out;
  const { data } = await admin.from("profiles").select("id, full_name").in("id", [...new Set(ids)]);
  for (const p of (data ?? []) as { id: string; full_name: string | null }[]) out.set(p.id, p.full_name);
  return out;
}

async function toViews(admin: Admin, rows: Row[]): Promise<ReviewView[]> {
  const who = await names(admin, rows.flatMap((r) => [r.student_id, r.teacher_id]));
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    helped: r.helped ?? [],
    body: r.body,
    reply: r.reply,
    createdAt: r.created_at,
    name: shortName(who.get(r.student_id)),
    teacherId: r.teacher_id,
    teacherName: who.get(r.teacher_id) ?? "Teacher",
    studentId: r.student_id,
  }));
}

export type ReviewFilter = { teacherId: string } | { academyId: string };

/** Published reviews of a teacher or an academy, newest first. Hidden ones are never returned here. */
export async function listPublishedReviews(admin: Admin, filter: ReviewFilter, limit = 20): Promise<ReviewView[]> {
  let q = admin.from("teacher_reviews").select(COLS).eq("status", "published").order("created_at", { ascending: false }).limit(limit);
  q = "teacherId" in filter ? q.eq("teacher_id", filter.teacherId) : q.eq("academy_id", filter.academyId);
  const { data } = await q;
  return toViews(admin, (data ?? []) as Row[]);
}

/** Average and count over published reviews. */
export async function getReviewSummary(admin: Admin, filter: ReviewFilter): Promise<{ average: number; count: number }> {
  let q = admin.from("teacher_reviews").select("rating").eq("status", "published").limit(2000);
  q = "teacherId" in filter ? q.eq("teacher_id", filter.teacherId) : q.eq("academy_id", filter.academyId);
  const { data } = await q;
  const values = ((data ?? []) as { rating: number }[]).map((r) => r.rating);
  return { average: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0, count: values.length };
}

/** A student's own review of a teacher (even if an admin hid it, so they can still see and edit it). */
export async function getMyReview(admin: Admin, studentId: string, teacherId: string) {
  const { data } = await admin.from("teacher_reviews").select(`${COLS}, academy_id`).eq("student_id", studentId).eq("teacher_id", teacherId).maybeSingle();
  const r = data as (Row & { academy_id: string | null }) | null;
  return r ? { id: r.id, rating: r.rating, helped: r.helped ?? [], body: r.body ?? "", hidden: r.status === "hidden" } : null;
}

export type Eligibility = { ok: true; academyId: string | null } | { ok: false; reason: "not_student" | "self" | "not_connected" };

/**
 * Who may review a teacher: a student who has been in one of the teacher's batches for MIN_DAYS_IN_BATCH days or more,
 * or who was marked present in one of the teacher's classes. This is the check that keeps reviews real.
 */
export async function getEligibility(admin: Admin, studentId: string, teacherId: string): Promise<Eligibility> {
  if (studentId === teacherId) return { ok: false, reason: "self" };
  const { data: me } = await admin.from("profiles").select("role").eq("id", studentId).maybeSingle();
  if (me?.role !== "student") return { ok: false, reason: "not_student" };

  const since = new Date(Date.now() - MIN_DAYS_IN_BATCH * 86_400_000).toISOString();
  const { data: mem } = await admin.from("batch_members").select("batch_id").eq("student_id", studentId).lte("created_at", since);
  const batchIds = ((mem ?? []) as { batch_id: string }[]).map((m) => m.batch_id);
  if (batchIds.length) {
    const { data: b } = await admin.from("batches").select("academy_id").in("id", batchIds).eq("teacher_id", teacherId).limit(1);
    if (b?.[0]) return { ok: true, academyId: (b[0].academy_id as string | null) ?? null };
  }

  const { data: regs } = await admin.from("class_registrations").select("class_id").eq("user_id", studentId).eq("attended", true);
  const classIds = ((regs ?? []) as { class_id: string }[]).map((r) => r.class_id);
  if (classIds.length) {
    const { data: c } = await admin.from("live_classes").select("academy_id").in("id", classIds).eq("teacher_id", teacherId).limit(1);
    if (c?.[0]) return { ok: true, academyId: (c[0].academy_id as string | null) ?? (await getTeacherAcademy(admin, teacherId))?.id ?? null };
  }
  return { ok: false, reason: "not_connected" };
}

/** Everything a teacher sees on "Student reviews": published and hidden, with whether it was answered. */
export async function listReviewsForTeacher(admin: Admin, teacherId: string): Promise<(ReviewView & { hidden: boolean })[]> {
  const { data } = await admin.from("teacher_reviews").select(COLS).eq("teacher_id", teacherId).order("created_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as Row[];
  const views = await toViews(admin, rows);
  return views.map((v, i) => ({ ...v, hidden: rows[i].status === "hidden" }));
}

export type ReportedReview = ReviewView & {
  hidden: boolean;
  reports: { reason: string; note: string | null; resolved: boolean }[];
};

/** For the admin: reviews with open reports first, then recently hidden ones (so a hide can be undone). */
export async function listReviewsForModeration(admin: Admin): Promise<ReportedReview[]> {
  const { data: reports } = await admin.from("review_reports").select("review_id, reason, note, resolved").order("created_at", { ascending: false }).limit(500);
  const all = (reports ?? []) as { review_id: string; reason: string; note: string | null; resolved: boolean }[];
  const openIds = [...new Set(all.filter((r) => !r.resolved).map((r) => r.review_id))];
  const { data: hiddenRows } = await admin.from("teacher_reviews").select(COLS).eq("status", "hidden").order("updated_at", { ascending: false }).limit(30);
  const hidden = (hiddenRows ?? []) as Row[];
  const need = [...new Set([...openIds, ...hidden.map((h) => h.id)])];
  if (!need.length) return [];
  const { data } = await admin.from("teacher_reviews").select(COLS).in("id", need);
  const rows = (data ?? []) as Row[];
  const views = await toViews(admin, rows);
  const list: ReportedReview[] = views.map((v, i) => ({ ...v, hidden: rows[i].status === "hidden", reports: all.filter((r) => r.review_id === v.id) }));
  const score = (r: ReportedReview) => (r.reports.some((x) => !x.resolved) ? 0 : 1);
  return list.sort((a, b) => score(a) - score(b));
}
