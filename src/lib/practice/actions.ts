"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { AUDIO_BUCKET } from "./data";
import { LANGUAGE_CODES, MAX_LANGUAGES, type LanguageCode } from "@/lib/languages";
import { translateWord } from "@/lib/translate/word";
import { LEVELS } from "./levels";
import { SAVED_WORD_COLUMNS, todayPKT, type SavedWord } from "./plan";

export type PracticeActionResult = { error: string } | undefined;

const ADMINS = ["academy_admin", "super_admin"] as const;
const LEARNERS = ["student", "academy_admin", "super_admin"] as const;
const GENERIC = "That didn't work. Please wait a moment and try again.";
const uuid = z.string().uuid();

function refresh(setId?: string) {
  revalidatePath("/dashboard/daily-practice");
  revalidatePath("/admin/daily-practice");
  if (setId) revalidatePath(`/admin/daily-practice/${setId}`);
}

// STUDENT ------------------------------------------------------------------

/** Tick or untick "I practised this text today". */
export async function setPractisedToday(trackId: unknown, done: unknown): Promise<PracticeActionResult> {
  const user = await requireUser(LEARNERS);
  const id = uuid.safeParse(trackId);
  if (!id.success) return { error: GENERIC };

  const supabase = await createClient();
  const today = todayPKT();
  const { error } = done
    ? await supabase
        .from("practice_log")
        .upsert({ user_id: user.id, track_id: id.data, practised_on: today }, { ignoreDuplicates: true })
    : await supabase.from("practice_log").delete().match({ user_id: user.id, track_id: id.data, practised_on: today });
  if (error) return { error: "We couldn't save your practice. Check your internet and try again." };

  revalidatePath("/dashboard/daily-practice");
  revalidatePath(`/practice/${id.data}`);
}

const wordSchema = z.object({
  word: z.string().trim().min(1).max(80, "Select a shorter piece of text (up to 80 letters)."),
  context: z.string().trim().max(500).optional(),
  trackId: uuid.optional(),
});
const WORD_ERROR = "We couldn't save this word. Check your internet and try again.";

/** Save a word or phrase the student selected in a text. Saving it twice returns the existing one. */
export async function saveVocabularyWord(input: unknown): Promise<{ error: string } | { word: SavedWord }> {
  const user = await requireUser(LEARNERS);
  const parsed = wordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { word, context, trackId } = parsed.data;

  const supabase = await createClient();
  const existing = await supabase
    .from("vocabulary_words")
    .select(SAVED_WORD_COLUMNS)
    .eq("user_id", user.id)
    .ilike("word", word.replace(/[%_\\]/g, "\\$&"))
    .maybeSingle();
  if (existing.data) return { word: existing.data as SavedWord };

  const { data, error } = await supabase
    .from("vocabulary_words")
    .insert({ user_id: user.id, word, context: context || null, track_id: trackId ?? null })
    .select(SAVED_WORD_COLUMNS)
    .single();
  if (error || !data) return { error: WORD_ERROR };
  revalidatePath("/dashboard");
  return { word: data as SavedWord };
}

// Limits automatic translation per student per day (keeps costs predictable).
const DAILY_TRANSLATIONS = 150;

/**
 * Fill in the meanings of a saved word in the student's languages, automatically.
 * Only languages that have no meaning yet are translated. Returns the updated word.
 */
export async function translateVocabularyWord(wordId: unknown): Promise<{ error: string } | { word: SavedWord }> {
  const user = await requireUser(LEARNERS);
  const id = uuid.safeParse(wordId);
  if (!id.success) return { error: GENERIC };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("vocabulary_words")
    .select("id, word, context, dictionary_form, translations")
    .eq("id", id.data)
    .maybeSingle();
  if (!row) return { error: GENERIC };
  const current = (row.translations ?? {}) as Record<string, string>;
  const asWord = (translations: Record<string, string>, dictionaryForm: string | null): SavedWord => ({
    id: row.id,
    word: row.word,
    dictionaryForm,
    translations,
  });

  const missing = user.languages.filter((code) => !current[code]);
  if (missing.length === 0) return { word: asWord(current, row.dictionary_form) };

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await supabase
    .from("vocabulary_words")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if ((count ?? 0) > DAILY_TRANSLATIONS) {
    return { error: "You've saved a lot of words today, so please type the meaning yourself." };
  }

  const result = await translateWord(row.word, row.context, missing);
  if (!result) return { error: "We couldn't translate this word right now. You can type the meaning yourself." };

  const translations = { ...result.translations, ...current };
  const dictionaryForm = row.dictionary_form ?? result.dictionaryForm;
  const { error } = await supabase
    .from("vocabulary_words")
    .update({ translations, dictionary_form: dictionaryForm })
    .eq("id", row.id);
  if (error) return { error: WORD_ERROR };
  revalidatePath("/dashboard");
  return { word: asWord(translations, dictionaryForm) };
}

const meaningsSchema = z.record(
  z.enum(LANGUAGE_CODES),
  z.string().trim().max(200, "Keep each meaning short (up to 200 letters).")
);

/** Save the meanings a student typed or corrected (empty = remove that meaning). */
export async function setVocabularyMeaning(
  wordId: unknown,
  meanings: unknown
): Promise<{ error: string } | { translations: Record<string, string> }> {
  await requireUser(LEARNERS);
  const id = uuid.safeParse(wordId);
  const parsed = meaningsSchema.safeParse(meanings);
  if (!id.success) return { error: GENERIC };
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: row } = await supabase.from("vocabulary_words").select("translations").eq("id", id.data).maybeSingle();
  if (!row) return { error: GENERIC };
  const translations: Record<string, string> = { ...((row.translations ?? {}) as Record<string, string>) };
  for (const [code, text] of Object.entries(parsed.data)) {
    if (text) translations[code] = text;
    else delete translations[code];
  }
  const { error } = await supabase.from("vocabulary_words").update({ translations }).eq("id", id.data);
  if (error) return { error: WORD_ERROR };
  revalidatePath("/dashboard");
  return { translations };
}

const languagesSchema = z
  .array(z.enum(LANGUAGE_CODES))
  .min(1, "Pick at least one language.")
  .max(MAX_LANGUAGES, `Pick up to ${MAX_LANGUAGES} languages.`)
  .refine((list) => new Set(list).size === list.length, "Pick each language once.");

/** Change the languages the student gets word meanings in. */
export async function setMyLanguages(languages: unknown): Promise<{ error: string } | { languages: LanguageCode[] }> {
  const user = await requireUser();
  const parsed = languagesSchema.safeParse(languages);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ languages: parsed.data }).eq("id", user.id);
  if (error) return { error: "We couldn't save your languages. Please try again." };
  revalidatePath("/dashboard");
  return { languages: parsed.data };
}

export async function removeVocabularyWord(wordId: unknown): Promise<PracticeActionResult> {
  await requireUser(LEARNERS);
  const id = uuid.safeParse(wordId);
  if (!id.success) return { error: GENERIC };
  const supabase = await createClient();
  const { error } = await supabase.from("vocabulary_words").delete().eq("id", id.data);
  if (error) return { error: "We couldn't remove this word. Please try again." };
  revalidatePath("/dashboard");
}

// ADMIN --------------------------------------------------------------------
// Every action checks the admin role on the server; the database checks it again (RLS).

const setSchema = z.object({
  title: z.string().trim().min(1, "Give the set a title.").max(120, "The title is too long (max 120 letters)."),
  description: z.string().trim().max(300, "The description is too long (max 300 letters).").optional(),
  level: z.enum(LEVELS),
});

export async function createPracticeSet(input: unknown): Promise<PracticeActionResult | { id: string }> {
  await requireUser(ADMINS);
  const parsed = setSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("practice_sets")
    .insert({ ...parsed.data, description: parsed.data.description || null })
    .select("id")
    .single();
  if (error || !data) return { error: GENERIC };
  refresh();
  return { id: data.id as string };
}

export async function setPracticeSetPublished(setId: unknown, published: unknown): Promise<PracticeActionResult> {
  await requireUser(ADMINS);
  const id = uuid.safeParse(setId);
  if (!id.success) return { error: GENERIC };
  const supabase = await createClient();
  const { error } = await supabase.from("practice_sets").update({ is_published: Boolean(published) }).eq("id", id.data);
  if (error) return { error: GENERIC };
  refresh(id.data);
}

export async function deletePracticeSet(setId: unknown): Promise<PracticeActionResult> {
  await requireUser(ADMINS);
  const id = uuid.safeParse(setId);
  if (!id.success) return { error: GENERIC };
  const supabase = await createClient();

  const { data: tracks } = await supabase.from("practice_tracks").select("audio_path").eq("set_id", id.data);
  const { error } = await supabase.from("practice_sets").delete().eq("id", id.data);
  if (error) return { error: GENERIC };

  const paths = ((tracks ?? []) as { audio_path: string | null }[]).map((t) => t.audio_path).filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from(AUDIO_BUCKET).remove(paths);
  refresh(id.data);
}

const AUDIO_EXT = ["mp3", "m4a", "mp4", "aac", "wav", "ogg", "webm"];

/**
 * Step 1 of adding audio: the browser asks for a one-time upload link, then
 * sends the file straight to storage (audio files are too big to pass through the app).
 */
export async function createAudioUploadUrl(
  setId: unknown,
  fileName: unknown
): Promise<{ error: string } | { path: string; signedUrl: string }> {
  await requireUser(ADMINS);
  const id = uuid.safeParse(setId);
  const ext = typeof fileName === "string" ? fileName.split(".").pop()?.toLowerCase() : undefined;
  if (!id.success) return { error: GENERIC };
  if (!ext || !AUDIO_EXT.includes(ext))
    return { error: "Please choose an audio file (MP3, M4A, WAV or OGG)." };

  const supabase = await createClient();
  const path = `${id.data}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from(AUDIO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "We couldn't prepare the upload. Please try again." };
  return { path: data.path, signedUrl: data.signedUrl };
}

const trackSchema = z.object({
  setId: uuid,
  trackId: uuid.optional(),
  title: z.string().trim().min(1, "Give the text a title.").max(160, "The title is too long (max 160 letters)."),
  transcript: z
    .string()
    .trim()
    .min(1, "Paste the text of the audio.")
    .max(20000, "The text is too long (max 20,000 letters). Split it into two texts."),
  /** New audio file path (from createAudioUploadUrl). Leave out to keep the current audio. */
  audioPath: z.string().max(300).optional(),
});

/** Step 2: save a new text, or change an existing one (when trackId is given). */
export async function savePracticeTrack(input: unknown): Promise<PracticeActionResult> {
  await requireUser(ADMINS);
  const parsed = trackSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { setId, trackId, title, transcript, audioPath } = parsed.data;
  if (audioPath && !audioPath.startsWith(`${setId}/`)) return { error: GENERIC };

  const supabase = await createClient();

  if (trackId) {
    const { data: old } = await supabase.from("practice_tracks").select("audio_path").eq("id", trackId).maybeSingle();
    const { error } = await supabase
      .from("practice_tracks")
      .update({ title, transcript, ...(audioPath ? { audio_path: audioPath } : {}) })
      .eq("id", trackId)
      .eq("set_id", setId);
    if (error) return { error: GENERIC };
    if (audioPath && old?.audio_path && old.audio_path !== audioPath)
      await supabase.storage.from(AUDIO_BUCKET).remove([old.audio_path]);
  } else {
    const { data: last } = await supabase
      .from("practice_tracks")
      .select("position")
      .eq("set_id", setId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase.from("practice_tracks").insert({
      set_id: setId,
      position: ((last?.position as number | undefined) ?? 0) + 1,
      title,
      transcript,
      audio_path: audioPath ?? null,
    });
    if (error) return { error: GENERIC };
  }
  refresh(setId);
}

export async function deletePracticeTrack(trackId: unknown): Promise<PracticeActionResult> {
  await requireUser(ADMINS);
  const id = uuid.safeParse(trackId);
  if (!id.success) return { error: GENERIC };
  const supabase = await createClient();
  const { data: track } = await supabase.from("practice_tracks").select("set_id, audio_path").eq("id", id.data).maybeSingle();
  const { error } = await supabase.from("practice_tracks").delete().eq("id", id.data);
  if (error) return { error: GENERIC };
  if (track?.audio_path) await supabase.storage.from(AUDIO_BUCKET).remove([track.audio_path]);
  refresh(track?.set_id as string | undefined);
}
