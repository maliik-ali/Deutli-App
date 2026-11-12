import "server-only";

import { fillFromDictionary } from "@/lib/practice/data";
import { todayPKT, type SavedWord } from "@/lib/practice/plan";
import { createClient } from "@/lib/supabase/server";
import { LEARNED_BOX } from "./srs";

export type VocabWord = SavedWord & {
  context: string | null;
  starred: boolean;
  box: number;
  dueOn: string;
  savedAt: string;
  rightCount: number;
  wrongCount: number;
  track: { id: string; title: string } | null;
};

export type VocabSet = "all" | "marked" | "due" | "learned";

const COLUMNS =
  "id, word, dictionaryForm:dictionary_form, translations, context, starred, box, dueOn:due_on, savedAt:created_at, rightCount:right_count, wrongCount:wrong_count, practice_tracks (id, title)";

/** All of the student's saved words (newest first), with meanings filled from the dictionary. */
export async function getVocabulary(userId: string): Promise<{ words: VocabWord[]; today: string; failed: boolean }> {
  const today = todayPKT();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vocabulary_words")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) return { words: [], today, failed: true };

  const rows = (data ?? []).map((r) => {
    const { practice_tracks: t, ...rest } = r as typeof r & { practice_tracks: unknown };
    const track = (Array.isArray(t) ? t[0] : t) as { id: string; title: string } | null;
    return { ...(rest as unknown as Omit<VocabWord, "track">), track: track ?? null };
  });
  return { words: await fillFromDictionary(rows), today, failed: false };
}

export function inSet(word: VocabWord, set: VocabSet, today: string) {
  if (set === "marked") return word.starred;
  if (set === "due") return word.dueOn <= today;
  if (set === "learned") return word.box >= LEARNED_BOX;
  return true;
}
