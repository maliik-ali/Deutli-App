"use server";

import { revalidatePath } from "next/cache";

import { ensurePersonalAcademy } from "@/lib/academies/personal";
import { requireUser } from "@/lib/auth/dal";
import { getOrCreateJoinCode, joinLink } from "@/lib/join/codes";
import { allow } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { teacherSignupSchema } from "./signup-options";

export type WorkspaceResult = { error: string } | { ok: true; name: string; code: string | null; link: string | null };

const GENERIC = "Something went wrong on our side. Please wait a moment and try again.";

/**
 * A logged-in student sets up a free teacher or school workspace on their own (no admin approval).
 * The role is changed here, on the server, with the secret key — never from the browser.
 * Everyone starts on Teacher Free (5 active students), with nothing public.
 */
export async function createMyWorkspace(input: unknown): Promise<WorkspaceResult> {
  const user = await requireUser();
  const parsed = teacherSignupSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Some answers look wrong. Please go back and check them." };
  const a = parsed.data;

  const admin = createAdminClient();
  if (!admin) return { error: GENERIC };

  // Someone who is already a teacher (e.g. double click): hand back their workspace instead of making a second one.
  if (user.role === "teacher") {
    const { data: owned } = await admin.from("academy_members").select("academy_id").eq("user_id", user.id).eq("role", "owner").limit(1);
    const academyId = owned?.[0]?.academy_id as string | undefined;
    if (!academyId) return { error: GENERIC };
    return done(academyId, user.id);
  }
  if (user.role !== "student") return { error: "This account can't be turned into a teacher account." };
  if (user.teacherId) return { error: "You are studying with a teacher on Deutli. To teach, please sign up with a different email address." };

  // At most 3 tries an hour per person, so nobody can mass-produce workspaces.
  if (!(await allow(`workspace:${user.id}`, 3, 3600))) return { error: "Too many tries. Please wait a while and try again." };

  // Only a plain student becomes a teacher: the `role = student` filter makes a second request do nothing.
  const { data: changed, error: roleError } = await admin
    .from("profiles")
    .update({ role: "teacher", teacher_id: null, onboarded_at: new Date().toISOString() })
    .eq("id", user.id)
    .eq("role", "student")
    .select("id");
  if (roleError || !changed?.length) return { error: GENERIC };

  const academyId = await ensurePersonalAcademy(admin, user.id, { name: a.name, kind: a.accountType === "school" ? "school" : "teacher" });
  if (!academyId) {
    // Undo, so the person is not left as a teacher without a workspace.
    await admin.from("profiles").update({ role: "student", onboarded_at: null }).eq("id", user.id);
    return { error: GENERIC };
  }

  await admin.from("workspace_signups").upsert({
    academy_id: academyId,
    user_id: user.id,
    account_type: a.accountType,
    exams: a.exams,
    levels: a.levels,
    student_count: a.studentCount,
    tools: a.tools,
    wants: a.wants,
  });

  revalidatePath("/", "layout");
  return done(academyId, user.id);
}

async function done(academyId: string, userId: string): Promise<WorkspaceResult> {
  const admin = createAdminClient();
  const { data: academy } = await admin?.from("academies").select("name").eq("id", academyId).maybeSingle() ?? { data: null };
  const jc = await getOrCreateJoinCode(userId, academyId);
  return { ok: true, name: academy?.name ?? "Your workspace", code: jc?.code ?? null, link: jc ? await joinLink(jc.code) : null };
}
