"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Result = { error: string } | { ok: true };
const ERROR = "That didn't work. Please try again.";

const postSchema = z.object({
  kind: z.enum(["news", "info"]),
  title: z.string().trim().min(1, "Give it a title.").max(120, "Keep the title under 120 characters."),
  body: z.string().trim().min(1, "Write the message.").max(4000, "Keep the message under 4,000 characters."),
  pinned: z.boolean().default(false),
});

/** Only the owner or an admin of a workspace (a solo teacher is the owner) may post to all its students. */
async function poster() {
  const user = await requireUser(["teacher"]);
  const ws = await getMyWorkspace(user.id);
  const admin = createAdminClient();
  const allowed = !!ws && (ws.role === "owner" || ws.role === "admin");
  return { user, ws, admin, allowed };
}

export async function createPost(input: unknown): Promise<Result> {
  const { user, ws, admin, allowed } = await poster();
  const p = postSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  if (!ws || !admin || !allowed) return { error: "Only the owner or an admin of the school can post news." };
  const { error } = await admin.from("academy_posts").insert({ academy_id: ws.workspace.id, author_id: user.id, ...p.data });
  if (error) return { error: ERROR };
  revalidatePath("/teacher/news");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function updatePost(id: unknown, input: unknown): Promise<Result> {
  const { ws, admin, allowed } = await poster();
  const pid = z.uuid().safeParse(id);
  const p = postSchema.safeParse(input);
  if (!pid.success) return { error: ERROR };
  if (!p.success) return { error: p.error.issues[0].message };
  if (!ws || !admin || !allowed) return { error: "Only the owner or an admin of the school can change news." };
  const { error } = await admin.from("academy_posts").update({ ...p.data, updated_at: new Date().toISOString() }).eq("id", pid.data).eq("academy_id", ws.workspace.id);
  if (error) return { error: ERROR };
  revalidatePath("/teacher/news");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deletePost(id: unknown): Promise<Result> {
  const { ws, admin, allowed } = await poster();
  const pid = z.uuid().safeParse(id);
  if (!pid.success || !ws || !admin || !allowed) return { error: ERROR };
  const { error } = await admin.from("academy_posts").delete().eq("id", pid.data).eq("academy_id", ws.workspace.id);
  if (error) return { error: ERROR };
  revalidatePath("/teacher/news");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/** A student opened a post: remember it, so the dot and the count go away. */
export async function markPostRead(id: unknown): Promise<Result> {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const pid = z.uuid().safeParse(id);
  if (!pid.success) return { error: ERROR };
  const supabase = await createClient();
  const { error } = await supabase.from("academy_post_reads").upsert({ user_id: user.id, post_id: pid.data }, { onConflict: "user_id,post_id", ignoreDuplicates: true });
  if (error) return { error: ERROR };
  return { ok: true };
}
