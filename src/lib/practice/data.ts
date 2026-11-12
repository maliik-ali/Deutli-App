import "server-only";

import { createClient } from "@/lib/supabase/server";
import { todayPKT, type SavedWord, type TrackSummary } from "./plan";

export const AUDIO_BUCKET = "practice-audio";
export { LEVELS } from "./levels";

export type PracticeSet = {
  id: string;
  title: string;
  description: string | null;
  level: string;
  isPublished: boolean;
  tracks: TrackSummary[];
};

type SetRow = {
  id: string;
  title: string;
  description: string | null;
  level: string;
  is_published: boolean;
  practice_tracks: { id: string; title: string; position: number; audio_path: string | null }[] | null;
};

/**
 * All practice sets the current user may see (students: published only —
 * the database decides that), with the user's own practice days per track.
 */
export async function getPracticeSets(userId: string): Promise<{ sets: PracticeSet[]; failed: boolean }> {
  const supabase = await createClient();
  const [setsRes, logRes] = await Promise.all([
    supabase
      .from("practice_sets")
      .select("id, title, description, level, is_published, practice_tracks (id, title, position, audio_path)")
      .order("created_at", { ascending: true }),
    supabase.from("practice_log").select("track_id, practised_on").eq("user_id", userId),
  ]);
  if (setsRes.error) return { sets: [], failed: true };

  const daysByTrack = new Map<string, string[]>();
  for (const row of (logRes.data ?? []) as { track_id: string; practised_on: string }[]) {
    daysByTrack.set(row.track_id, [...(daysByTrack.get(row.track_id) ?? []), row.practised_on]);
  }

  const sets = ((setsRes.data ?? []) as SetRow[]).map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    level: s.level,
    isPublished: s.is_published,
    tracks: [...(s.practice_tracks ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((t) => ({
        id: t.id,
        title: t.title,
        position: t.position,
        setId: s.id,
        setTitle: s.title,
        hasAudio: Boolean(t.audio_path),
        days: daysByTrack.get(t.id) ?? [],
      })),
  }));
  return { sets, failed: false };
}

export type PracticeTrack = {
  id: string;
  title: string;
  transcript: string;
  /** Short-lived link to the audio file, or null when no audio was uploaded. */
  audioUrl: string | null;
  doneToday: boolean;
  /** The student's saved words (all of them), so known words are marked in every text. */
  words: SavedWord[];
  set: { id: string; title: string; level: string };
  siblings: { id: string; title: string; doneToday: boolean }[];
};

/** One track with its text, a signed audio link and the other tracks of its set. */
export async function getPracticeTrack(trackId: string, userId: string): Promise<PracticeTrack | null> {
  if (!/^[0-9a-f-]{36}$/i.test(trackId)) return null;
  const supabase = await createClient();

  const { data: track } = await supabase
    .from("practice_tracks")
    .select("id, title, transcript, audio_path, set_id, practice_sets (id, title, level)")
    .eq("id", trackId)
    .maybeSingle();
  if (!track) return null;

  const set = (Array.isArray(track.practice_sets) ? track.practice_sets[0] : track.practice_sets) as
    | { id: string; title: string; level: string }
    | null;
  if (!set) return null;

  const today = todayPKT();
  const [siblingsRes, logRes, audioRes, words] = await Promise.all([
    supabase.from("practice_tracks").select("id, title, position").eq("set_id", track.set_id).order("position"),
    supabase.from("practice_log").select("track_id").eq("user_id", userId).eq("practised_on", today),
    track.audio_path
      ? supabase.storage.from(AUDIO_BUCKET).createSignedUrl(track.audio_path, 60 * 60 * 3)
      : Promise.resolve({ data: null }),
    getSavedWords(userId, 500),
  ]);
  const doneIds = new Set(((logRes.data ?? []) as { track_id: string }[]).map((r) => r.track_id));

  return {
    id: track.id,
    title: track.title,
    transcript: track.transcript,
    audioUrl: audioRes.data?.signedUrl ?? null,
    doneToday: doneIds.has(track.id),
    words,
    set,
    siblings: ((siblingsRes.data ?? []) as { id: string; title: string }[]).map((s) => ({
      id: s.id,
      title: s.title,
      doneToday: doneIds.has(s.id),
    })),
  };
}

/** The student's saved words, newest first. Empty if none (or the table is not set up yet). */
export async function getSavedWords(userId: string, limit = 5): Promise<SavedWord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vocabulary_words")
    .select("id, word, meaning")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as SavedWord[];
}

export type AdminTrack = { id: string; title: string; position: number; transcript: string; audioPath: string | null };
export type AdminSet = Omit<PracticeSet, "tracks"> & { tracks: AdminTrack[] };

/** Admin view of one set, with full texts for editing. */
export async function getAdminSet(setId: string): Promise<AdminSet | null> {
  if (!/^[0-9a-f-]{36}$/i.test(setId)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("practice_sets")
    .select("id, title, description, level, is_published, practice_tracks (id, title, position, transcript, audio_path)")
    .eq("id", setId)
    .maybeSingle();
  if (!data) return null;
  const tracks = (data.practice_tracks ?? []) as {
    id: string;
    title: string;
    position: number;
    transcript: string;
    audio_path: string | null;
  }[];
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    level: data.level,
    isPublished: data.is_published,
    tracks: [...tracks]
      .sort((a, b) => a.position - b.position)
      .map((t) => ({ id: t.id, title: t.title, position: t.position, transcript: t.transcript, audioPath: t.audio_path })),
  };
}
