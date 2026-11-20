"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { allow } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_FEEDBACK, MIN_FEEDBACK } from "./contact";

const LEARNERS = ["student", "academy_admin", "super_admin"] as const;
const ADMINS = ["academy_admin", "super_admin"] as const;
const GENERIC = "That didn't work. Please wait a moment and try again.";
type Result = { error: string } | { ok: true };

const input = z.object({
  kind: z.enum(["problem", "idea", "question", "payment"]),
  message: z.string().trim().min(MIN_FEEDBACK, "Please write a little more so we can help.").max(MAX_FEEDBACK, `Please keep it under ${MAX_FEEDBACK} letters.`),
  // Only a path inside the app, never a full address.
  page: z.string().trim().max(200).regex(/^\/[^\s]*$/).optional(),
});

/** A student sends a message to Deutli. Limited to 5 an hour so the inbox stays readable. */
export async function sendFeedback(raw: unknown): Promise<Result> {
  const user = await requireUser(LEARNERS);
  const p = input.safeParse(raw);
  if (!p.success) return { error: p.error.issues[0]?.message ?? GENERIC };
  if (!(await allow(`feedback:${user.id}`, 5, 3600))) return { error: "You have sent a few messages already. Please wait a little before sending another." };
  const admin = createAdminClient();
  if (!admin) return { error: GENERIC };
  const { error } = await admin.from("feedback").insert({ user_id: user.id, kind: p.data.kind, message: p.data.message, page: p.data.page ?? null, email: user.email });
  if (error) return { error: GENERIC };
  revalidatePath("/dashboard/support");
  revalidatePath("/admin/feedback");
  return { ok: true };
}

/** Admin: move a message between New, In progress and Done. */
export async function setFeedbackStatus(id: unknown, status: unknown): Promise<Result> {
  await requireUser(ADMINS);
  const p = z.object({ id: z.string().uuid(), status: z.enum(["new", "in_progress", "done"]) }).safeParse({ id, status });
  if (!p.success) return { error: GENERIC };
  const admin = createAdminClient();
  if (!admin) return { error: GENERIC };
  const { error } = await admin.from("feedback").update({ status: p.data.status }).eq("id", p.data.id);
  if (error) return { error: GENERIC };
  revalidatePath("/admin/feedback");
  revalidatePath("/dashboard/support");
  return { ok: true };
}
