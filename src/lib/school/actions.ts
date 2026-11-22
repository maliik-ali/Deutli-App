"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { countWorkspaceStudents, getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { siteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { allow } from "@/lib/rate-limit";

const GENERIC = "That didn't work. Please try again.";

/** Only the owner or an admin of a workspace may use the school tools. */
async function owner() {
  const user = await requireUser(["teacher"]);
  const ws = await getMyWorkspace(user.id);
  const admin = createAdminClient();
  if (!ws || !admin) return { error: "You don't have a workspace yet. Please contact us." } as const;
  if (ws.role === "teacher") return { error: "Only the workspace owner or an admin can do this." } as const;
  return { error: undefined, user, ws, admin } as const;
}

/** Find an account by email (pilot-size lists, one page at a time). */
async function findUserId(admin: NonNullable<ReturnType<typeof createAdminClient>>, email: string): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

/** Add a teacher (who already has an account) to the workspace. Checked against the plan's teacher limit. */
export async function addTeacherByEmail(input: unknown): Promise<{ error: string } | { ok: true }> {
  const o = await owner();
  if (o.error) return { error: o.error };
  const email = z.string().trim().toLowerCase().email("Enter the teacher's email.").safeParse(input);
  if (!email.success) return { error: email.error.issues[0].message };
  if (o.ws.workspace.kind !== "school") return { error: "Teachers can be added on a School plan. Upgrade your workspace first." };
  if (o.ws.plan?.max_teachers != null && o.ws.teachers >= o.ws.plan.max_teachers) return { error: "Your plan's teacher limit is reached. Upgrade to add more teachers." };
  const uid = await findUserId(o.admin, email.data);
  if (!uid) return { error: "No account with that email. Ask them to sign up first." };
  const { data: prof } = await o.admin.from("profiles").select("role").eq("id", uid).maybeSingle();
  if (prof?.role !== "teacher" && prof?.role !== "student") return { error: "That account can't be added as a teacher." };
  if (prof.role === "student") await o.admin.from("profiles").update({ role: "teacher", teacher_id: null }).eq("id", uid);
  await o.admin.from("academy_members").upsert({ academy_id: o.ws.workspace.id, user_id: uid, role: "teacher" }, { onConflict: "academy_id,user_id", ignoreDuplicates: true });
  revalidatePath("/teacher/school");
  return { ok: true };
}

export async function removeTeacher(userId: unknown): Promise<{ error: string } | { ok: true }> {
  const o = await owner();
  if (o.error) return { error: o.error };
  const id = z.string().uuid().safeParse(userId);
  if (!id.success || id.data === o.user.id) return { error: "You can't remove yourself." };
  // Their students and everything made in the school stay with the school.
  await o.admin.from("academy_members").delete().eq("academy_id", o.ws.workspace.id).eq("user_id", id.data).neq("role", "owner");
  revalidatePath("/teacher/school");
  return { ok: true };
}

export type BulkResult = { error: string } | { ok: true; added: number; skipped: { line: number; reason: string }[] };

/**
 * Bulk add students from CSV text (columns: name, email). Each student gets an invite email and is attached to this
 * workspace and the chosen teacher. Stops at the plan's student limit. At most 200 rows at a time.
 */
export async function bulkAddStudents(csv: unknown, teacherId: unknown): Promise<BulkResult> {
  const o = await owner();
  if (o.error) return { error: o.error };
  const text = typeof csv === "string" ? csv : "";
  const tid = z.string().uuid().safeParse(teacherId);
  if (!tid.success) return { error: "Choose the teacher these students belong to." };
  if (!(await allow(`bulk:${o.user.id}`, 5, 3600))) return { error: "Too many uploads. Please wait a while and try again." };

  const members = await o.admin.from("academy_members").select("user_id").eq("academy_id", o.ws.workspace.id).eq("user_id", tid.data).maybeSingle();
  if (!members.data) return { error: "That teacher isn't in your workspace." };

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { error: "Paste or upload a list with a name and an email on each line." };
  if (lines.length > 201) return { error: "Please upload at most 200 students at a time." };

  const counts = await countWorkspaceStudents([o.ws.workspace.id]);
  let used = counts.get(o.ws.workspace.id) ?? 0;
  const max = o.ws.plan?.max_students ?? null;
  const site = await siteUrl();
  let added = 0;
  const skipped: { line: number; reason: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (i === 0 && /name/i.test(cells[0]) && /mail/i.test(cells[1] ?? "")) continue; // header row
    const [name, emailRaw] = cells;
    const email = z.string().email().safeParse((emailRaw ?? "").toLowerCase());
    if (!name || !email.success) {
      skipped.push({ line: i + 1, reason: "Needs a name and a valid email" });
      continue;
    }
    if (max != null && used >= max) {
      skipped.push({ line: i + 1, reason: "Student limit of your plan reached" });
      continue;
    }
    const { data, error } = await o.admin.auth.admin.inviteUserByEmail(email.data, { data: { full_name: name.slice(0, 120) }, redirectTo: `${site}/auth/confirm?next=/onboarding` });
    if (error || !data.user) {
      skipped.push({ line: i + 1, reason: /registered|exists/i.test(error?.message ?? "") ? "Already has an account" : "Invite could not be sent" });
      continue;
    }
    await o.admin.from("profiles").update({ academy_id: o.ws.workspace.id, teacher_id: tid.data }).eq("id", data.user.id);
    used++;
    added++;
  }
  revalidatePath("/teacher/school");
  return { ok: true, added, skipped };
}
