import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { VerbItem } from "./game";

/** All verbs in sheet order, with this student's right and wrong counts. */
export async function listVerbs(userId: string): Promise<VerbItem[]> {
  const supabase = await createClient();
  const [verbs, progress] = await Promise.all([
    supabase.from("verbs").select("id, german, praesens, praeteritum, perfekt, preposition, verb_case, translations, example_de, example_translations").order("position").limit(2000),
    supabase.from("verb_progress").select("verb_id, right_count, wrong_count").eq("user_id", userId).limit(2000),
  ]);
  const mine = new Map(((progress.data ?? []) as { verb_id: string; right_count: number; wrong_count: number }[]).map((p) => [p.verb_id, p]));
  return ((verbs.data ?? []) as {
    id: string; german: string; praesens: string | null; praeteritum: string | null; perfekt: string | null; preposition: string | null; verb_case: string | null;
    translations: Record<string, string>; example_de: string | null; example_translations: Record<string, string>;
  }[]).map((v) => ({
    id: v.id,
    german: v.german,
    praesens: v.praesens,
    praeteritum: v.praeteritum,
    perfekt: v.perfekt,
    preposition: v.preposition,
    verbCase: v.verb_case,
    translations: v.translations ?? {},
    exampleDe: v.example_de,
    exampleTranslations: v.example_translations ?? {},
    right: mine.get(v.id)?.right_count ?? 0,
    wrong: mine.get(v.id)?.wrong_count ?? 0,
  }));
}

export async function countVerbs(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("verbs").select("id", { count: "exact", head: true });
  return count ?? 0;
}
