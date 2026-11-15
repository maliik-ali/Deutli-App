import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PaperStructure } from "./template";

export const PAPER_BUCKET = "mock-papers";

export type PaperRow = {
  id: string;
  slug: string;
  title: string;
  topics: string;
  tone: import("@/lib/exam/catalog").CoverTone;
  is_free: boolean;
  is_published: boolean;
  structure: PaperStructure;
  audio_path: string | null;
  /** Optional cover photo in the mock-papers bucket (needs migration 20261114000014). */
  cover_path?: string | null;
  created_at: string;
};

const BASE_COLUMNS = "id, slug, title, topics, tone, is_free, is_published, structure, audio_path, created_at";
// If the cover migration has not been run yet, fall back to the old columns so nothing breaks.
const COLUMNS = `${BASE_COLUMNS}, cover_path`;

/** Papers students may see (RLS hides unpublished ones from students). */
export async function getPapers(): Promise<PaperRow[]> {
  const supabase = await createClient();
  const first = await supabase.from("mock_papers").select(COLUMNS).order("created_at", { ascending: true });
  if (!first.error) return (first.data ?? []) as unknown as PaperRow[];
  const { data } = await supabase.from("mock_papers").select(BASE_COLUMNS).order("created_at", { ascending: true });
  return (data ?? []) as unknown as PaperRow[];
}

export async function getPaperBySlug(slug: string): Promise<PaperRow | null> {
  const supabase = await createClient();
  const first = await supabase.from("mock_papers").select(COLUMNS).eq("slug", slug).maybeSingle();
  if (!first.error) return (first.data as unknown as PaperRow | null) ?? null;
  const { data } = await supabase.from("mock_papers").select(BASE_COLUMNS).eq("slug", slug).maybeSingle();
  return (data as unknown as PaperRow | null) ?? null;
}

export async function getPaperById(id: string): Promise<PaperRow | null> {
  const supabase = await createClient();
  const first = await supabase.from("mock_papers").select(COLUMNS).eq("id", id).maybeSingle();
  if (!first.error) return (first.data as unknown as PaperRow | null) ?? null;
  const { data } = await supabase.from("mock_papers").select(BASE_COLUMNS).eq("id", id).maybeSingle();
  return (data as unknown as PaperRow | null) ?? null;
}

/** All PDF page numbers used by the paper, mapped to 3-hour signed image links. */
export async function getPageUrls(paper: PaperRow): Promise<Record<number, string>> {
  const pages = new Set<number>();
  for (const p of paper.structure.parts) for (let n = p.fromPage; n <= p.toPage; n++) if (n > 0) pages.add(n);
  const list = [...pages];
  if (list.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(PAPER_BUCKET)
    .createSignedUrls(
      list.map((n) => `${paper.id}/p-${n}.jpg`),
      60 * 60 * 3,
    );
  const out: Record<number, string> = {};
  data?.forEach((row, i) => {
    if (row.signedUrl) out[list[i]] = row.signedUrl;
  });
  return out;
}

export async function getAudioUrl(paper: PaperRow): Promise<string | null> {
  if (!paper.audio_path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(PAPER_BUCKET).createSignedUrl(paper.audio_path, 60 * 60 * 3);
  return data?.signedUrl ?? null;
}

export type AttemptRow = {
  id: string;
  paper_id: string;
  answers: Record<string, string>;
  writing: string;
  started_at: string;
  submitted_at: string | null;
  result: import("./template").AttemptResult | null;
};
const ATTEMPT_COLUMNS = "id, paper_id, answers, writing, started_at, submitted_at, result";

/** The student's unfinished attempt for a paper, or a new one (or always a new one with `fresh`). */
export async function openAttempt(userId: string, paperId: string, fresh = false): Promise<AttemptRow | null> {
  const supabase = await createClient();
  if (!fresh) {
    const { data } = await supabase
      .from("mock_attempts")
      .select(ATTEMPT_COLUMNS)
      .eq("user_id", userId)
      .eq("paper_id", paperId)
      .is("submitted_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data as AttemptRow;
  }
  const { data } = await supabase.from("mock_attempts").insert({ paper_id: paperId }).select(ATTEMPT_COLUMNS).single();
  return (data as AttemptRow | null) ?? null;
}

export async function getAttempt(id: string): Promise<AttemptRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("mock_attempts").select(ATTEMPT_COLUMNS).eq("id", id).maybeSingle();
  return (data as AttemptRow | null) ?? null;
}

/** The student's latest finished attempt for a paper (for the mock detail page). */
export async function getLastResult(userId: string, paperId: string): Promise<AttemptRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mock_attempts")
    .select(ATTEMPT_COLUMNS)
    .eq("user_id", userId)
    .eq("paper_id", paperId)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as AttemptRow | null) ?? null;
}

/** Selectable text of the paper pages (empty if the admin has not added it). */
export async function getPageText(paperId: string): Promise<Record<number, import("./render").TextItem[]>> {
  const supabase = await createClient();
  const { data } = await supabase.from("mock_papers").select("page_text").eq("id", paperId).maybeSingle();
  const raw = ((data as { page_text?: Record<string, import("./render").TextItem[]> } | null)?.page_text ?? {}) as Record<string, import("./render").TextItem[]>;
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [Number(k), v]));
}
