import "server-only";

import type { SetupStep } from "@/lib/setup-step";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The first things a new teacher does, in the order they depend on each other, and which are already done.
 * Each step ticks itself off from the teacher's own data; nothing is stored. Server only.
 */
export async function getTeacherSetup(teacherId: string): Promise<SetupStep[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const [batches, own, mats, classes, prof] = await Promise.all([
    admin.from("batches").select("id").eq("teacher_id", teacherId).order("created_at").limit(50),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId).eq("role", "student"),
    admin.from("materials").select("id", { count: "exact", head: true }).eq("owner_id", teacherId),
    admin.from("live_classes").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId).neq("kind", "1to1"),
    admin.from("teacher_profiles").select("headline").eq("user_id", teacherId).maybeSingle(),
  ]);
  const batchIds = ((batches.data ?? []) as { id: string }[]).map((b) => b.id);
  let inBatches = 0;
  if (batchIds.length) {
    const { count } = await admin.from("batch_members").select("student_id", { count: "exact", head: true }).in("batch_id", batchIds);
    inBatches = count ?? 0;
  }
  return [
    { key: "batch", title: "Create your first batch", hint: "A batch is one group of students. Classes, material and tests are shared with a batch.", href: "/teacher/batches", done: batchIds.length > 0 },
    { key: "students", title: "Add your students", hint: "Give them your join code below, or add them to the batch.", href: batchIds[0] ? `/teacher/batches/${batchIds[0]}` : "/teacher/batches", done: (own.count ?? 0) + inBatches > 0 },
    { key: "material", title: "Share homework or material", hint: "Add it once and share it with as many batches as you like.", href: "/teacher/materials", done: (mats.count ?? 0) > 0 },
    { key: "class", title: "Schedule a class", hint: "Students register, and get the join link when the class opens.", href: "/teacher/classes/new", done: (classes.count ?? 0) > 0 },
    { key: "profile", title: "Fill in your teacher profile", hint: "Students see your photo and headline next to your classes.", href: "/teacher/profile", done: !!prof.data?.headline?.trim() },
  ];
}
