"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { todayPKT } from "@/lib/practice/plan";
import { createClient } from "@/lib/supabase/server";
import { nextReview } from "./srs";

const ROLES = ["student", "academy_admin", "super_admin"] as const;
const uuid = z.string().uuid();
const ERROR = "We couldn't save this. Check your internet and try again.";

export type VocabResult = { error: string } | { ok: true };

/** Mark or unmark a word (shows under "Marked"). */
export async function setWordStarred(wordId: unknown, starred: unknown): Promise<VocabResult> {
  await requireUser(ROLES);
  const id = uuid.safeParse(wordId);
  if (!id.success || typeof starred !== "boolean") return { error: ERROR };
  const supabase = await createClient();
  const { error } = await supabase.from("vocabulary_words").update({ starred }).eq("id", id.data);
  if (error) return { error: ERROR };
  revalidatePath("/dashboard/vocabulary");
  return { ok: true };
}

/** Save one answer from a practice session and schedule the next review. */
export async function recordReview(
  wordId: unknown,
  right: unknown,
): Promise<{ error: string } | { box: number; dueOn: string }> {
  await requireUser(ROLES);
  const id = uuid.safeParse(wordId);
  if (!id.success || typeof right !== "boolean") return { error: ERROR };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("vocabulary_words")
    .select("box, right_count, wrong_count")
    .eq("id", id.data)
    .maybeSingle();
  if (!row) return { error: ERROR };

  const next = nextReview(row.box ?? 0, right, todayPKT());
  const { error } = await supabase
    .from("vocabulary_words")
    .update({
      box: next.box,
      due_on: next.dueOn,
      reviewed_at: new Date().toISOString(),
      right_count: (row.right_count ?? 0) + (right ? 1 : 0),
      wrong_count: (row.wrong_count ?? 0) + (right ? 0 : 1),
    })
    .eq("id", id.data);
  if (error) return { error: ERROR };
  revalidatePath("/dashboard/vocabulary");
  return next;
}
