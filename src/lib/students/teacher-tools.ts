import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Does this student have a teacher or school? Then the menu shows My batches, Timetable, Tests and Homework.
 * A learner on their own would only see empty pages, so for them these items stay hidden.
 * True when they have a teacher, joined a workspace, or are in a batch.
 */
export async function hasTeacherTools(userId: string, teacherId: string | null): Promise<boolean> {
  if (teacherId) return true;
  const admin = createAdminClient();
  if (!admin) return true; // when unsure, show the menu rather than hide it
  const [{ data: p }, { count }] = await Promise.all([
    admin.from("profiles").select("academy_id").eq("id", userId).maybeSingle(),
    admin.from("batch_members").select("batch_id", { count: "exact", head: true }).eq("student_id", userId),
  ]);
  return !!p?.academy_id || (count ?? 0) > 0;
}
