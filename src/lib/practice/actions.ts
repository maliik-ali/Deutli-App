"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { AUDIO_BUCKET } from "./data";
import { LEVELS } from "./levels";
import { todayPKT } from "./plan";

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
