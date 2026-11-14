"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PAPER_BUCKET } from "./data";
import { grade, parseAnswerKey, partQuestions, type PaperStructure } from "./template";

const ADMINS = ["academy_admin", "super_admin"] as const;
const LEARNERS = ["student", "academy_admin", "super_admin"] as const;
const GENERIC = "That didn't work. Please wait a moment and try again.";
const uuid = z.string().uuid();
type Result = { error: string } | { ok: true };

function refresh() {
  revalidatePath("/admin/mock-papers");
  revalidatePath("/dashboard/exam", "layout");
}

// ADMIN ---------------------------------------------------------------------

/** Step 1: one-time upload links for the page images and the audio. */
export async function createPaperUploadUrls(
  paperId: unknown,
  pages: unknown,
  audioName: unknown,
): Promise<{ error: string } | { pages: Record<number, string>; audio: { path: string; url: string } | null }> {
  await requireUser(ADMINS);
  const id = uuid.safeParse(paperId);
  const list = z.array(z.number().int().min(1).max(200)).min(1).max(120).safeParse(pages);
  if (!id.success || !list.success) return { error: GENERIC };
  const supabase = await createClient();

  const out: Record<number, string> = {};
  for (const n of list.data) {
    const { data, error } = await supabase.storage.from(PAPER_BUCKET).createSignedUploadUrl(`${id.data}/p-${n}.jpg`, { upsert: true });
    if (error || !data) return { error: "We couldn't prepare the upload. Please try again." };
    out[n] = data.signedUrl;
  }
  let audio: { path: string; url: string } | null = null;
  if (typeof audioName === "string" && audioName) {
    const ext = audioName.split(".").pop()?.toLowerCase() ?? "";
    if (!["mp3", "m4a", "wav", "ogg"].includes(ext)) return { error: "Please choose an audio file (MP3, M4A, WAV or OGG)." };
    const path = `${id.data}/audio-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { data, error } = await supabase.storage.from(PAPER_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return { error: "We couldn't prepare the audio upload. Please try again." };
    audio = { path: data.path, url: data.signedUrl };
  }
  return { pages: out, audio };
}

const partSchema = z.object({
  id: z.string(),
  section: z.enum(["lesen", "sprachbausteine", "hoeren", "schreiben"]),
  title: z.string(),
  task: z.string(),
  kind: z.enum(["match", "abc", "tf", "write"]),
  first: z.number().int().min(0).max(60),
  count: z.number().int().min(0).max(60),
  options: z.array(z.string()).optional(),
  points: z.number().min(0).max(300),
  fromPage: z.number().int().min(1).max(200),
  toPage: z.number().int().min(1).max(200),
});

const createSchema = z.object({
  id: uuid,
  slug: z.string().regex(/^[a-z0-9-]{2,40}$/, "Use a short address with small letters, numbers and dashes, e.g. hamburg."),
  title: z.string().trim().min(1, "Give the paper a title.").max(120),
  topics: z.string().trim().max(300),
  tone: z.enum(["navy", "violet", "teal", "indigo"]),
  isFree: z.boolean(),
  structure: z.object({ parts: z.array(partSchema).min(1).max(20) }),
  audioPath: z.string().max(300).nullable(),
  answersText: z.string().max(5000),
});

/** Step 2: save the paper and its answer key after the files are uploaded. */
export async function createPaper(input: unknown): Promise<{ error: string } | { id: string }> {
  await requireUser(ADMINS);
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const structure = d.structure as PaperStructure;

  const key = parseAnswerKey(d.answersText);
  const missing: number[] = [];
  for (const p of structure.parts) for (const n of partQuestions(p)) if (!key[String(n)]) missing.push(n);
  if (missing.length) return { error: `The answer key is missing question ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}.` };
  if (d.audioPath && !d.audioPath.startsWith(`${d.id}/`)) return { error: GENERIC };

  const supabase = await createClient();
  const { error } = await supabase.from("mock_papers").insert({
    id: d.id,
    slug: d.slug,
    title: d.title,
    topics: d.topics,
    tone: d.tone,
    is_free: d.isFree,
    structure,
    audio_path: d.audioPath,
  });
  if (error) return { error: error.code === "23505" ? "That address is already used by another paper." : GENERIC };
  const keyRes = await supabase.from("mock_paper_keys").insert({ paper_id: d.id, answers: key });
  if (keyRes.error) {
    await supabase.from("mock_papers").delete().eq("id", d.id);
    return { error: GENERIC };
  }
  refresh();
  return { id: d.id };
}

export async function setPaperPublished(id: unknown, published: unknown): Promise<Result> {
  await requireUser(ADMINS);
  const pid = uuid.safeParse(id);
  if (!pid.success || typeof published !== "boolean") return { error: GENERIC };
  const supabase = await createClient();
  const { error } = await supabase.from("mock_papers").update({ is_published: published }).eq("id", pid.data);
  if (error) return { error: GENERIC };
  refresh();
  return { ok: true };
}

export async function deletePaper(id: unknown): Promise<Result> {
  await requireUser(ADMINS);
  const pid = uuid.safeParse(id);
  if (!pid.success) return { error: GENERIC };
  const supabase = await createClient();
  const { data: files } = await supabase.storage.from(PAPER_BUCKET).list(pid.data, { limit: 200 });
  if (files?.length) await supabase.storage.from(PAPER_BUCKET).remove(files.map((f) => `${pid.data}/${f.name}`));
  const { error } = await supabase.from("mock_papers").delete().eq("id", pid.data);
  if (error) return { error: GENERIC };
  refresh();
  return { ok: true };
}

// STUDENT -------------------------------------------------------------------

const answersSchema = z.record(z.string().regex(/^\d{1,2}$/), z.string().regex(/^([a-o]|x|\+|-)$/));

/** Save progress (called a moment after every change). */
export async function saveAttempt(attemptId: unknown, answers: unknown, writing: unknown): Promise<Result> {
  const user = await requireUser(LEARNERS);
  const id = uuid.safeParse(attemptId);
  const a = answersSchema.safeParse(answers);
  const w = z.string().max(6000).safeParse(writing);
  if (!id.success || !a.success || !w.success) return { error: GENERIC };
  const supabase = await createClient();
  const { error } = await supabase
    .from("mock_attempts")
    .update({ answers: a.data, writing: w.data })
    .eq("id", id.data)
    .eq("user_id", user.id)
    .is("submitted_at", null);
  return error ? { error: "We couldn't save your answers. Check your internet." } : { ok: true };
}

/** Finish the exam: save the last answers, mark them with the official key, store the result. */
export async function submitAttempt(attemptId: unknown, answers: unknown, writing: unknown): Promise<{ error: string } | { id: string }> {
  const user = await requireUser(LEARNERS);
  const id = uuid.safeParse(attemptId);
  const a = answersSchema.safeParse(answers);
  const w = z.string().max(6000).safeParse(writing);
  if (!id.success || !a.success || !w.success) return { error: GENERIC };

  const supabase = await createClient();
  const { data: attempt } = await supabase
    .from("mock_attempts")
    .select("id, paper_id, submitted_at")
    .eq("id", id.data)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!attempt) return { error: GENERIC };
  if (attempt.submitted_at) return { id: attempt.id };
  const { data: paper } = await supabase.from("mock_papers").select("structure").eq("id", attempt.paper_id).maybeSingle();
  if (!paper) return { error: GENERIC };

  // The answer key is only readable with the server's secret key.
  const admin = createAdminClient();
  if (!admin) return { error: "Marking is not available right now. Your answers are saved; please try again later." };
  const { data: keyRow } = await admin.from("mock_paper_keys").select("answers").eq("paper_id", attempt.paper_id).maybeSingle();
  if (!keyRow) return { error: GENERIC };

  const result = grade(paper.structure as PaperStructure, keyRow.answers as Record<string, string>, a.data, w.data);
  const { error } = await admin
    .from("mock_attempts")
    .update({ answers: a.data, writing: w.data, result, submitted_at: new Date().toISOString() })
    .eq("id", id.data)
    .is("submitted_at", null);
  if (error) return { error: GENERIC };
  revalidatePath("/dashboard/exam", "layout");
  return { id: id.data };
}
