import "server-only";

import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Whose classes a person may see and book.
 * - A student of a school (or with a teacher): only teachers of their own school, plus their own teacher.
 * - A student on their own: teachers of academies that chose to be listed in "Find a teacher" (and teachers who
 *   belong to no academy at all). Teachers of unlisted schools stay private.
 * - Everyone else (Deutli admins): everything.
 * Classes a student already registered for always stay visible to them.
 */
export type ClassScope = { kind: "all" } | { kind: "only"; ids: string[] } | { kind: "except"; ids: string[] };

export const getClassScope = cache(async (userId: string): Promise<ClassScope> => {
  const admin = createAdminClient();
  if (!admin) return { kind: "all" }; // when unsure, show rather than hide (the other class pages do the same)
  const { data: me } = await admin.from("profiles").select("role, academy_id, teacher_id").eq("id", userId).maybeSingle();
  if (!me || me.role !== "student") return { kind: "all" };

  const academyIds = new Set<string>();
  if (me.academy_id) academyIds.add(me.academy_id as string);
  if (me.teacher_id) {
    const { data: theirs } = await admin.from("academy_members").select("academy_id").eq("user_id", me.teacher_id);
    for (const r of (theirs ?? []) as { academy_id: string }[]) academyIds.add(r.academy_id);
  }
  if (academyIds.size > 0 || me.teacher_id) {
    const { data: mem } = academyIds.size ? await admin.from("academy_members").select("user_id").in("academy_id", [...academyIds]) : { data: [] };
    const ids = new Set(((mem ?? []) as { user_id: string }[]).map((m) => m.user_id));
    if (me.teacher_id) ids.add(me.teacher_id as string);
    return { kind: "only", ids: [...ids] };
  }

  // On their own: hide the teachers of schools that did not choose to be listed.
  const { data: unlisted } = await admin.from("academies").select("id").eq("is_listed", false);
  const hidden = ((unlisted ?? []) as { id: string }[]).map((a) => a.id);
  if (!hidden.length) return { kind: "all" };
  const { data: mem } = await admin.from("academy_members").select("user_id").in("academy_id", hidden);
  return { kind: "except", ids: [...new Set(((mem ?? []) as { user_id: string }[]).map((m) => m.user_id))] };
});

/** Is this teacher inside what the person may see? */
export function inScope(scope: ClassScope, teacherId: string): boolean {
  if (scope.kind === "all") return true;
  return scope.kind === "only" ? scope.ids.includes(teacherId) : !scope.ids.includes(teacherId);
}
