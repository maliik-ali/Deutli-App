"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { countWorkspaceStudents, getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { getManagedBatch } from "@/lib/batches/data";
import { allow } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";

export type InviteResult = { error: string } | { ok: true; added: number; skipped: { line: number; reason: string }[] };

/**
 * A teacher invites their own students by email ("name, email" per line, up to 50). Each student gets an invite email,
 * becomes the teacher's student in the teacher's workspace and, if a batch is chosen, joins that batch.
 * Stops at the plan's student limit. Students who already have an account are skipped (they use the join code).
 */
export async function inviteStudents(text: unknown, batchId?: unknown): Promise<InviteResult> {
  const user = await requireUser(["teacher"]);
  const admin = createAdminClient();
  const ws = await getMyWorkspace(user.id);
  if (!admin || !ws) return { error: "You don't have a workspace yet. Please contact us." };
  if (!(await allow(`invite:${user.id}`, 10, 3600))) return { error: "Too many invites. Please wait a while and try again." };

  const raw = typeof text === "string" ? text : "";
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { error: "Write a name and an email on each line." };
  if (lines.length > 50) return { error: "Please invite at most 50 students at a time." };

  let batch = null;
  if (batchId) {
    const id = z.string().uuid().safeParse(batchId);
    batch = id.success ? await getManagedBatch(id.data, user.id) : null;
    if (!batch) return { error: "That batch wasn't found." };
  }

  const counts = await countWorkspaceStudents([ws.workspace.id]);
  let used = counts.get(ws.workspace.id) ?? 0;
  const max = ws.plan?.max_students ?? null;
  const site = await siteUrl();
  const joined: string[] = [];
  const skipped: { line: number; reason: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    // "Name, email" or "email, Name" or just an email.
    const cells = lines[i].split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, "")).filter(Boolean);
    const email = cells.map((c) => z.string().email().safeParse(c.toLowerCase())).find((r) => r.success);
    const name = cells.find((c) => !z.string().email().safeParse(c.toLowerCase()).success) ?? "";
    if (!email?.success) {
      skipped.push({ line: i + 1, reason: "Needs a valid email" });
      continue;
    }
    if (max != null && used >= max) {
      skipped.push({ line: i + 1, reason: "Student limit of your plan reached" });
      continue;
    }
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email.data, { data: { full_name: name.slice(0, 120) }, redirectTo: `${site}/auth/confirm?next=/onboarding` });
    if (error || !data.user) {
      skipped.push({ line: i + 1, reason: /registered|exists/i.test(error?.message ?? "") ? "Already has an account. Share your join code instead" : "Invite could not be sent" });
      continue;
    }
    await admin.from("profiles").update({ academy_id: ws.workspace.id, teacher_id: user.id }).eq("id", data.user.id);
    joined.push(data.user.id);
    used++;
  }

  if (batch && joined.length) {
    await admin.from("batch_members").upsert(joined.map((s) => ({ batch_id: batch.id, student_id: s, academy_id: batch.academy_id })), { onConflict: "batch_id,student_id", ignoreDuplicates: true });
    revalidatePath(`/teacher/batches/${batch.id}`);
  }
  revalidatePath("/teacher/students");
  revalidatePath("/teacher/batches");
  return { ok: true, added: joined.length, skipped };
}
