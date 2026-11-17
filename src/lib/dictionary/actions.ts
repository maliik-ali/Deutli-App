"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { readDictionarySheet, toLevel, type DictionaryRow, type Level } from "./csv";

export type ImportResult =
  | { error: string }
  | {
      added: number;
      updated: number;
      /** Words added to or updated in a level list (A1/A2/B1), if any. */
      levelWords: number;
      /** Rows that were skipped, with the line number in the sheet. */
      problems: { line: number; reason: string }[];
    };

const ADMINS = ["academy_admin", "super_admin"] as const;
// Comfortably above 5,000 rows; the browser checks the size first.
const fileText = z.string().max(2_000_000, "The file is too big. Split it into smaller files (max 5,000 words each).");

type Entry = { word_key: string; dictionary_form: string; translations: Record<string, string>; source: "sheet" };

const optionsSchema = z
  .object({
    level: z.string().optional(),
    topic: z.string().trim().max(80, "Keep the topic short (max 80 letters).").optional(),
  })
  .optional();

/**
 * Upload a word sheet (CSV) into the shared dictionary. Sheet meanings replace
 * AI meanings for the same word and language; other languages are kept.
 * The plural is added as its own entry so students who select it get the meaning too.
 * With a level (A1/A2/B1), the words are also added to that level's list for the Vocabulary page.
 */
export async function importDictionarySheet(text: unknown, options?: unknown): Promise<ImportResult> {
  await requireUser(ADMINS);
  const parsedText = fileText.safeParse(text);
  if (!parsedText.success) return { error: parsedText.error.issues[0].message };
  const opts = optionsSchema.safeParse(options);
  if (!opts.success) return { error: opts.error.issues[0].message };
  const defaultLevel = toLevel(opts.data?.level);
  const defaultTopic = opts.data?.topic || null;

  const sheet = readDictionarySheet(parsedText.data);
  if ("error" in sheet) return sheet;
  if (sheet.rows.length === 0) return { added: 0, updated: 0, levelWords: 0, problems: sheet.problems };

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

  // Level lists: rows with a level (from the sheet's "level" column or the level picked in the form).
  const levelRows = sheet.rows
    .map((row) => ({ row, level: row.level ?? defaultLevel }))
    .filter((r): r is { row: DictionaryRow; level: Level } => r.level !== null);
  const levelResult = await saveLevelWords(admin, levelRows, defaultTopic);
  if ("error" in levelResult) return levelResult;

  revalidatePath("/admin/dictionary");
  revalidatePath("/dashboard/vocabulary");
  const updated = keys.filter((k) => existing.has(k)).length;
  return { added: keys.length - updated, updated, levelWords: levelResult.count, problems: sheet.problems };
}

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

/** Adds or updates words in the A1/A2/B1 lists. New words go to the end, in sheet order. */
async function saveLevelWords(
  admin: Admin,
  rows: { row: DictionaryRow; level: Level }[],
  defaultTopic: string | null,
): Promise<{ count: number } | { error: string }> {
  if (rows.length === 0) return { count: 0 };
  const now = new Date().toISOString();
  let count = 0;

  for (const level of [...new Set(rows.map((r) => r.level))]) {
    const list = rows.filter((r) => r.level === level).map((r) => r.row);
    const { data: current, error } = await admin
      .from("level_words")
      .select("word_key, position, topic, translations, examples")
      .eq("level", level)
      .limit(10000);
    if (error) return { error: "We couldn't read the level list. Please try again." };

    const byKey = new Map((current ?? []).map((c) => [c.word_key, c]));
    let next = Math.max(0, ...(current ?? []).map((c) => c.position)) + 1;
    const upserts = list.map((row) => {
      const key = row.german.toLowerCase();
      const old = byKey.get(key);
      return {
        level,
        word_key: key,
        german: row.german,
        article: row.article,
        plural: row.plural,
        position: old?.position ?? next++,
        topic: row.topic ?? defaultTopic ?? old?.topic ?? null,
        translations: { ...((old?.translations ?? {}) as Record<string, string>), ...row.translations },
        examples: { ...((old?.examples ?? {}) as Record<string, string>), ...row.examples },
        updated_at: now,
      };
    });
    for (let i = 0; i < upserts.length; i += 500) {
      const { error: saveError } = await admin
        .from("level_words")
        .upsert(upserts.slice(i, i + 500), { onConflict: "level,word_key" });
      if (saveError) return { error: `The ${level.toUpperCase()} list stopped saving after ${count + i} words.` };
    }
    count += upserts.length;
  }
  return { count };
}
