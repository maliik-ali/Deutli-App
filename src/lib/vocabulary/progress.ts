import "server-only";

import { createClient } from "@/lib/supabase/server";
import { addDays, LEARNED_BOX } from "./srs";
import type { VocabWord } from "./data";

export type WeakWord = { id: string; head: string; translations: Record<string, string>; wrong: number; right: number };
export type VocabProgress = {
  /** Words the student has: never practised (new), on the way (learning), learned. */
  stages: { new: number; learning: number; learned: number };
  /** Answers in the last 7 days, or null if there were none. */
  week: { right: number; wrong: number } | null;
  /** Days in a row with at least one answer (today may still be empty). */
  streak: number;
  /** At least one answer today. */
  today: boolean;
  /** The words answered wrong more often than right, worst first. */
  weak: WeakWord[];
  /** False for a student who has not answered anything yet: the strip stays hidden. */
  hasData: boolean;
};

/** The numbers behind "Your progress". Only real answers count; nothing is made up. */
export async function getVocabProgress(userId: string, today: string, words: VocabWord[]): Promise<VocabProgress> {
  const supabase = await createClient();
  const { data } = await supabase.from("vocab_activity").select("day, right_count, wrong_count").eq("user_id", userId).gte("day", addDays(today, -60)).limit(100);
  const days = (data ?? []) as { day: string; right_count: number; wrong_count: number }[];

  const weekStart = addDays(today, -6);
  const week = days.filter((d) => d.day >= weekStart && d.day <= today).reduce((a, d) => ({ right: a.right + d.right_count, wrong: a.wrong + d.wrong_count }), { right: 0, wrong: 0 });

  const active = new Set(days.filter((d) => d.right_count + d.wrong_count > 0).map((d) => d.day));
  let cursor = active.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (active.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  const stages = { new: 0, learning: 0, learned: 0 };
  for (const w of words) {
    if (w.box >= LEARNED_BOX) stages.learned++;
    else if (w.box > 0) stages.learning++;
    else stages.new++;
  }
  const weak = words
    .filter((w) => w.wrongCount > w.rightCount)
    .sort((a, b) => b.wrongCount - b.rightCount - (a.wrongCount - a.rightCount) || b.wrongCount - a.wrongCount)
    .slice(0, 5)
    .map((w) => ({ id: w.id, head: w.dictionaryForm ?? w.word, translations: w.translations, wrong: w.wrongCount, right: w.rightCount }));

  const answered = words.some((w) => w.rightCount + w.wrongCount > 0);
  return { stages, today: active.has(today), week: week.right + week.wrong > 0 ? week : null, streak, weak, hasData: answered || days.length > 0 };
}
