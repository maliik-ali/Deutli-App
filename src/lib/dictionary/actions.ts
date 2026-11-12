"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { readDictionarySheet } from "./csv";

export type ImportResult =
  | { error: string }
  | {
      added: number;
      updated: number;
      /** Rows that were skipped, with the line number in the sheet. */
      problems: { line: number; reason: string }[];
    };

const ADMINS = ["academy_admin", "super_admin"] as const;
// Comfortably above 5,000 rows; the browser checks the size first.
const fileText = z.string().max(2_000_000, "The file is too big. Split it into smaller files (max 5,000 words each).");

type Entry = { word_key: string; dictionary_form: string; translations: Record<string, string>; source: "sheet" };

/**
 * Upload a word sheet (CSV) into the shared dictionary. Sheet meanings replace
 * AI meanings for the same word and language; other languages are kept.
 * The plural is added as its own entry so students who select it get the meaning too.
 */
export async function importDictionarySheet(text: unknown): Promise<ImportResult> {
  await requireUser(ADMINS);
  const parsedText = fileText.safeParse(text);
  if (!parsedText.success) return { error: parsedText.error.issues[0].message };

  const sheet = readDictionarySheet(parsedText.data);
  if ("error" in sheet) return sheet;
  if (sheet.rows.length === 0) return { added: 0, updated: 0, problems: sheet.problems };

  const admin = createAdminClient();
  if (!admin) return { error: "The server's Supabase secret key is missing (SUPABASE_SECRET_KEY on Vercel)." };

  // One entry for the word, one for its plural (if given and different).
  const entries = new Map<string, Entry>();
  for (const row of sheet.rows) {
    const dictionaryForm = row.article ? `${row.article} ${row.german}` : row.german;
    const base = { dictionary_form: dictionaryForm, translations: row.translations as Record<string, string> };
    entries.set(row.german.toLowerCase(), { word_key: row.german.toLowerCase(), ...base, source: "sheet" });
    const pluralKey = row.plural?.toLowerCase();
    if (pluralKey && !entries.has(pluralKey)) entries.set(pluralKey, { word_key: pluralKey, ...base, source: "sheet" });
  }

  // Keep meanings in languages the sheet doesn't cover.
  const keys = [...entries.keys()];
  const existing = new Map<string, Record<string, string>>();
  for (let i = 0; i < keys.length; i += 200) {
    const { data, error } = await admin
      .from("word_dictionary")
      .select("word_key, translations")
      .in("word_key", keys.slice(i, i + 200));
    if (error) return { error: "We couldn't read the dictionary. Please try again." };
    for (const e of data ?? []) existing.set(e.word_key, (e.translations ?? {}) as Record<string, string>);
  }

  const now = new Date().toISOString();
  const rows = [...entries.values()].map((e) => ({
    ...e,
    translations: { ...(existing.get(e.word_key) ?? {}), ...e.translations },
    updated_at: now,
  }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from("word_dictionary").upsert(rows.slice(i, i + 500), { onConflict: "word_key" });
    if (error) return { error: `Saving stopped after ${i} words. Please upload the file again.` };
  }

  revalidatePath("/admin/dictionary");
  const updated = keys.filter((k) => existing.has(k)).length;
  return { added: keys.length - updated, updated, problems: sheet.problems };
}
