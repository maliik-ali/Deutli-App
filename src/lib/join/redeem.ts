import "server-only";

import type { User } from "@supabase/supabase-js";

import { countWorkspaceStudents } from "@/lib/academies/data";
import { allow } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanCode } from "./codes";

export type JoinResult = { ok: true; academyName: string; teacherName: string | null } | { error: string };

const INVALID = "That code isn't valid, or the teacher switched it off. Check the letters and try again.";

/** Attach a student to a teacher, their workspace and its branding. Server only; `userId` must be the logged-in user. */
export async function redeemJoinCode(userId: string, rawCode: unknown): Promise<JoinResult> {
  const code = cleanCode(rawCode);
  if (!code) return { error: INVALID };
  // Guessing codes is limited: 8 tries per 10 minutes per person.
  if (!(await allow(`join:${userId}`, 8, 600))) return { error: "Too many tries. Please wait a few minutes and try again." };
  const admin = createAdminClient();
  if (!admin) return { error: "Something went wrong on our side. Please try again." };

  const { data: me } = await admin.from("profiles").select("role, academy_id, teacher_id").eq("id", userId).maybeSingle();
  if (me?.role !== "student") return { error: "Only student accounts can join with a code." };

  const { data: jc } = await admin.from("join_codes").select("academy_id, teacher_id, batch_id, active").eq("code", code).maybeSingle();
  if (!jc || !jc.active) return { error: INVALID };

  const [{ data: academy }, counts] = await Promise.all([
    admin.from("academies").select("name, plan_id").eq("id", jc.academy_id).maybeSingle(),
    countWorkspaceStudents([jc.academy_id]),
  ]);
  if (!academy) return { error: INVALID };

  // At the plan's limit, new students are blocked with a clear message. Students already in are never locked out.
  const alreadyIn = me.academy_id === jc.academy_id || me.teacher_id === jc.teacher_id;
  if (!alreadyIn && academy.plan_id) {
    const { data: plan } = await admin.from("plans").select("max_students").eq("id", academy.plan_id).maybeSingle();
    const max = plan?.max_students as number | null | undefined;
    if (max != null && (counts.get(jc.academy_id) ?? 0) >= max) {
      return { error: "This class has reached its student limit. Please ask your teacher to upgrade their plan." };
    }
  }

  const { error } = await admin.from("profiles").update({ academy_id: jc.academy_id, teacher_id: jc.teacher_id }).eq("id", userId);
  if (error) return { error: "Something went wrong on our side. Please try again." };
  // A code made for one batch puts the student straight into it.
  if (jc.batch_id) await admin.from("batch_members").upsert({ batch_id: jc.batch_id, student_id: userId, academy_id: jc.academy_id }, { onConflict: "batch_id,student_id", ignoreDuplicates: true });
  const { data: t } = await admin.from("profiles").select("full_name").eq("id", jc.teacher_id).maybeSingle();
  return { ok: true, academyName: academy.name, teacherName: t?.full_name ?? null };
}

/** After signup: a code typed on the signup form (or from the link) is kept in the user's details and used on first login. */
export async function redeemFromSignup(user: User): Promise<void> {
  const code = user.user_metadata?.join_code;
  if (code) await redeemJoinCode(user.id, code);
}
