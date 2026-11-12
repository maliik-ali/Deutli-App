import "server-only";

import { createClient } from "@/lib/supabase/server";

export type DictionaryEntry = {
  key: string;
  dictionaryForm: string | null;
  translations: Record<string, string>;
  source: "ai" | "sheet";
};

export type DictionaryOverview = {
  total: number;
  fromSheet: number;
  fromAi: number;
  entries: DictionaryEntry[];
  failed: boolean;
};

/** Counts and a list of dictionary words (newest first, or matching a search). */
export async function getDictionaryOverview(search: string): Promise<DictionaryOverview> {
  const supabase = await createClient();
  const q = search.trim().toLowerCase().slice(0, 80);

  let list = supabase
    .from("word_dictionary")
    .select("word_key, dictionary_form, translations, source")
    .order("updated_at", { ascending: false })
    .limit(30);
  if (q) list = list.ilike("word_key", `%${q.replace(/[%_\\]/g, "\\$&")}%`);

  const [all, sheet, rows] = await Promise.all([
    supabase.from("word_dictionary").select("word_key", { count: "exact", head: true }),
    supabase.from("word_dictionary").select("word_key", { count: "exact", head: true }).eq("source", "sheet"),
    list,
  ]);
  if (all.error || rows.error) return { total: 0, fromSheet: 0, fromAi: 0, entries: [], failed: true };

  const total = all.count ?? 0;
  const fromSheet = sheet.count ?? 0;
  return {
    total,
    fromSheet,
    fromAi: total - fromSheet,
    failed: false,
    entries: (rows.data ?? []).map((r) => ({
      key: r.word_key,
      dictionaryForm: r.dictionary_form,
      translations: (r.translations ?? {}) as Record<string, string>,
      source: r.source === "sheet" ? "sheet" : "ai",
    })),
  };
}
