import "server-only";

import type { TeacherStats } from "@/lib/reputation/badges";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

/** The numbers behind the badges, for several teachers at once. */
export async function getTeacherStats(admin: Admin, teacherIds: string[]): Promise<Map<string, TeacherStats>> {
  const out = new Map<string, TeacherStats>(teacherIds.map((id) => [id, { reviewCount: 0, average: 0, replied: 0, classesTaught: 0, verified: false }]));
  if (!teacherIds.length) return out;
  const [reviews, classes, verified] = await Promise.all([
    admin.from("teacher_reviews").select("teacher_id, rating, reply").eq("status", "published").in("teacher_id", teacherIds).limit(5000),
    admin.from("live_classes").select("id, teacher_id, starts_at, duration_min").in("teacher_id", teacherIds).eq("status", "scheduled").lt("starts_at", new Date().toISOString()).limit(5000),
    admin.from("teacher_verifications").select("teacher_id").in("teacher_id", teacherIds),
  ]);

  const sums = new Map<string, number>();
  for (const r of (reviews.data ?? []) as { teacher_id: string; rating: number; reply: string | null }[]) {
    const s = out.get(r.teacher_id)!;
    s.reviewCount++;
    if (r.reply) s.replied++;
    sums.set(r.teacher_id, (sums.get(r.teacher_id) ?? 0) + r.rating);
  }
  for (const [id, total] of sums) {
    const s = out.get(id)!;
    s.average = total / s.reviewCount;
  }
  for (const v of (verified.data ?? []) as { teacher_id: string }[]) out.get(v.teacher_id)!.verified = true;

  // A class counts once it has ended and at least one student was marked present.
  const now = Date.now();
  const ended = ((classes.data ?? []) as { id: string; teacher_id: string; starts_at: string; duration_min: number }[]).filter((c) => new Date(c.starts_at).getTime() + c.duration_min * 60_000 <= now);
  if (ended.length) {
    const { data: present } = await admin.from("class_registrations").select("class_id").in("class_id", ended.map((c) => c.id)).eq("attended", true).limit(20000);
    const held = new Set(((present ?? []) as { class_id: string }[]).map((r) => r.class_id));
    for (const c of ended) if (held.has(c.id)) out.get(c.teacher_id)!.classesTaught++;
  }
  return out;
}
