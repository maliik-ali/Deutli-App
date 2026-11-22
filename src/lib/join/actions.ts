"use server";

import { revalidatePath } from "next/cache";

import { getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { newCode } from "./codes";
import { redeemJoinCode } from "./redeem";

const GENERIC = "That didn't work. Please try again.";
type Result = { error: string } | { ok: true };

/** Student: "Join a teacher or school" under Account. */
export async function joinWithCode(code: unknown): Promise<{ error: string } | { ok: true; message: string }> {
  const user = await requireUser(["student"]);
  const r = await redeemJoinCode(user.id, code);
  if ("error" in r) return r;
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: r.teacherName ? `You joined ${r.academyName}. Your teacher is ${r.teacherName}.` : `You joined ${r.academyName}.` };
}

/** Teacher: switch the current code off or on. */
export async function setJoinCodeActive(active: unknown): Promise<Result> {
  const user = await requireUser(["teacher"]);
  const ws = await getMyWorkspace(user.id);
  const admin = createAdminClient();
  if (typeof active !== "boolean" || !ws || !admin) return { error: GENERIC };
  const { data } = await admin.from("join_codes").select("id").eq("teacher_id", user.id).eq("academy_id", ws.workspace.id).is("batch_id", null).order("created_at", { ascending: false }).limit(1);
  if (!data?.[0]) return { error: GENERIC };
  const { error } = await admin.from("join_codes").update({ active }).eq("id", data[0].id);
  if (error) return { error: GENERIC };
  revalidatePath("/teacher");
  return { ok: true };
}

/** Teacher: make a new code. The old one stops working. Students already in stay in. */
export async function makeNewJoinCode(): Promise<Result> {
  const user = await requireUser(["teacher"]);
  const ws = await getMyWorkspace(user.id);
  const admin = createAdminClient();
  if (!ws || !admin) return { error: GENERIC };
  await admin.from("join_codes").update({ active: false }).eq("teacher_id", user.id).eq("academy_id", ws.workspace.id).is("batch_id", null);
  for (let i = 0; i < 5; i++) {
    const { error } = await admin.from("join_codes").insert({ code: newCode(), academy_id: ws.workspace.id, teacher_id: user.id });
    if (!error) {
      revalidatePath("/teacher");
      return { ok: true };
    }
  }
  return { error: GENERIC };
}
