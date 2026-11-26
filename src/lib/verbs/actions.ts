"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { readVerbsSheet } from "./csv";

export type VerbImportResult = { error: string } | { added: number; updated: number; problems: { line: number; reason: string }[] };
const fileText = z.string().max(2_000_000, "The file is too big. Split it into smaller files.");

/** Admin: upload the verbs sheet. The same verb and meaning uploaded again is updated; new ones go to the end in sheet order. */
export async function importVerbsSheet(text: unknown): Promise<VerbImportResult> {
  await requireUser(["academy_admin", "super_admin"]);
  const t = fileText.safeParse(text);
  if (!t.success) return { error: t.error.issues[0].message };
  const sheet = readVerbsSheet(t.data);
  if ("error" in sheet) return sheet;
  if (sheet.rows.length === 0) return { added: 0, updated: 0, problems: sheet.problems };
  const admin = createAdminClient();
  if (!admin) return { error: "The server's Supabase secret key is missing (SUPABASE_SECRET_KEY on Vercel)." };

  const { data: current, error } = await admin.from("verbs").select("verb_key, position").limit(10000);
  if (error) return { error: "We couldn't read the verbs. Please try again." };
  const byKey = new Map((current ?? []).map((v) => [v.verb_key as string, v.position as number]));
  let next = Math.max(0, ...(current ?? []).map((v) => v.position as number)) + 1;
  const now = new Date().toISOString();
  const upserts = sheet.rows.map((r) => ({
    verb_key: r.key,
    german: r.german,
    praesens: r.praesens,
    praeteritum: r.praeteritum,
    perfekt: r.perfekt,
    preposition: r.preposition,
    verb_case: r.verbCase,
    translations: r.translations,
    example_de: r.exampleDe,
    example_translations: r.exampleTranslations,
    position: byKey.get(r.key) ?? next++,
    updated_at: now,
  }));
  for (let i = 0; i < upserts.length; i += 500) {
    const { error: e } = await admin.from("verbs").upsert(upserts.slice(i, i + 500), { onConflict: "verb_key" });
    if (e) return { error: `Saving stopped after ${i} verbs. Please upload the file again.` };
  }
  revalidatePath("/admin/dictionary");
  revalidatePath("/dashboard/vocabulary", "layout");
  const updated = sheet.rows.filter((r) => byKey.has(r.key)).length;
  return { added: sheet.rows.length - updated, updated, problems: sheet.problems };
}
