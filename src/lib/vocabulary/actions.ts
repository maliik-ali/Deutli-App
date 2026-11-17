"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser, todayForUser } from "@/lib/auth/dal";
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
  return saveAnswer(await createClient(), id.data, right);
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function saveAnswer(
  supabase: Supabase,
  wordId: string,
  right: boolean,
): Promise<{ error: string } | { box: number; dueOn: string }> {
  const { data: row } = await supabase
    .from("vocabulary_words")
    .select("box, right_count, wrong_count")
    .eq("id", wordId)
    .maybeSingle();
  if (!row) return { error: ERROR };

  const next = nextReview(row.box ?? 0, right, await todayForUser());
  const { error } = await supabase
    .from("vocabulary_words")
    .update({
      box: next.box,
      due_on: next.dueOn,
      reviewed_at: new Date().toISOString(),
      right_count: (row.right_count ?? 0) + (right ? 1 : 0),
      wrong_count: (row.wrong_count ?? 0) + (right ? 0 : 1),
    })
    .eq("id", wordId);
  if (error) return { error: ERROR };
  revalidatePath("/dashboard/vocabulary");
  return next;
}

/**
 * The student's own row for a level word (A1/A2/B1 list), created the first time they
 * learn or mark it. If they already saved the same word while reading, that row is used.
 */
async function levelWordRow(supabase: Supabase, userId: string, levelWordId: string) {
  const { data: lw } = await supabase
    .from("level_words")
    .select("german, article, translations, examples")
    .eq("id", levelWordId)
    .maybeSingle();
  if (!lw) return null;

  const pattern = lw.german.replace(/[%_\\]/g, "\\$&");
  const { data: existing } = await supabase
    .from("vocabulary_words")
    .select("id")
    .eq("user_id", userId)
    .ilike("word", pattern)
    .maybeSingle();
  if (existing) return existing.id as string;

  const examples = (lw.examples ?? {}) as Record<string, string>;
  const { data: created } = await supabase
    .from("vocabulary_words")
    .insert({
      user_id: userId,
      word: lw.german,
      dictionary_form: lw.article ? `${lw.article} ${lw.german}` : lw.german,
      translations: lw.translations ?? {},
      context: examples.de?.slice(0, 500) || null,
      source: "level",
      due_on: await todayForUser(),
    })
    .select("id")
    .single();
  return (created?.id as string | undefined) ?? null;
}

/** Mark or unmark a word from a level list. */
export async function setLevelWordStarred(levelWordId: unknown, starred: unknown): Promise<VocabResult> {
  const user = await requireUser(ROLES);
  const id = uuid.safeParse(levelWordId);
  if (!id.success || typeof starred !== "boolean") return { error: ERROR };
  const supabase = await createClient();
  const rowId = await levelWordRow(supabase, user.id, id.data);
  if (!rowId) return { error: ERROR };
  const { error } = await supabase.from("vocabulary_words").update({ starred }).eq("id", rowId);
  if (error) return { error: ERROR };
  revalidatePath("/dashboard/vocabulary");
  return { ok: true };
}

/** Save one answer for a new level word (from "Learn new words"). Starts its spaced repetition. */
export async function recordLevelAnswer(
  levelWordId: unknown,
  right: unknown,
): Promise<{ error: string } | { box: number; dueOn: string }> {
  const user = await requireUser(ROLES);
  const id = uuid.safeParse(levelWordId);
  if (!id.success || typeof right !== "boolean") return { error: ERROR };
  const supabase = await createClient();
  const rowId = await levelWordRow(supabase, user.id, id.data);
  if (!rowId) return { error: ERROR };
  return saveAnswer(supabase, rowId, right);
}

/**
 * Save one answer from the der/die/das game. It doesn't move the word's review step (that is about
 * the meaning), but a wrong article brings the word back for review today. Words the student
 * hasn't started yet are not saved.
 */
export async function recordArticleAnswer(input: unknown, right: unknown): Promise<VocabResult> {
  const user = await requireUser(ROLES);
  const parsed = z.object({ id: uuid, kind: z.enum(["level", "mine"]) }).safeParse(input);
  if (!parsed.success || typeof right !== "boolean") return { error: ERROR };
  const supabase = await createClient();

  let rowId: string | null = parsed.data.kind === "mine" ? parsed.data.id : null;
  if (parsed.data.kind === "level") {
    const { data: lw } = await supabase.from("level_words").select("german").eq("id", parsed.data.id).maybeSingle();
    if (!lw) return { error: ERROR };
    const { data: mine } = await supabase
      .from("vocabulary_words")
      .select("id")
      .eq("user_id", user.id)
      .ilike("word", lw.german.replace(/[%_\\]/g, "\\$&"))
      .maybeSingle();
    rowId = (mine?.id as string | undefined) ?? null;
  }
  if (!rowId) return { ok: true };

  const { data: row } = await supabase
    .from("vocabulary_words")
    .select("right_count, wrong_count")
    .eq("id", rowId)
    .maybeSingle();
  if (!row) return { ok: true };
  const { error } = await supabase
    .from("vocabulary_words")
    .update(
      right
        ? { right_count: (row.right_count ?? 0) + 1 }
        : { wrong_count: (row.wrong_count ?? 0) + 1, due_on: await todayForUser() },
    )
    .eq("id", rowId);
  if (error) return { error: ERROR };
  return { ok: true };
}
