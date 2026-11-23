"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { getManagedBatch } from "@/lib/batches/data";
import { COVER_TONES } from "@/lib/exam/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { PAPER_BUCKET } from "./data";
import { PAPER_EXAMS, PAPER_LEVELS, parseAnswerKey, partQuestions, type PaperExam, type PaperStructure } from "./template";

const GENERIC = "That didn't work. Please wait a moment and try again.";
const uuid = z.string().uuid();
type Result = { error: string } | { ok: true };

async function teacher() {
  const user = await requireUser(["teacher"]);
  const ws = await getMyWorkspace(user.id);
  const admin = createAdminClient();
  return { user, ws, admin };
}

/** A paper the teacher owns (admins use the admin screens). */
async function ownPaper(admin: NonNullable<ReturnType<typeof createAdminClient>>, paperId: string, userId: string) {
  const { data } = await admin.from("mock_papers").select("id, owner_id").eq("id", paperId).maybeSingle();
  return data && data.owner_id === userId ? data : null;
}

export async function createTeacherUploadUrls(paperId: unknown, pages: unknown, audioName: unknown): Promise<{ error: string } | { pages: Record<number, string>; audio: { path: string; url: string } | null }> {
  const { ws, admin } = await teacher();
  const id = uuid.safeParse(paperId);
  const list = z.array(z.number().int().min(1).max(200)).min(1).max(120).safeParse(pages);
  if (!ws || !admin || !id.success || !list.success) return { error: GENERIC };
  const out: Record<number, string> = {};
  for (const n of list.data) {
    const { data, error } = await admin.storage.from(PAPER_BUCKET).createSignedUploadUrl(`${id.data}/p-${n}.jpg`, { upsert: true });
    if (error || !data) return { error: "We couldn't prepare the upload. Please try again." };
    out[n] = data.signedUrl;
  }
  let audio: { path: string; url: string } | null = null;
  if (typeof audioName === "string" && audioName) {
    const ext = audioName.split(".").pop()?.toLowerCase() ?? "";
    if (!["mp3", "m4a", "wav", "ogg"].includes(ext)) return { error: "Please choose an audio file (MP3, M4A, WAV or OGG)." };
    const path = `${id.data}/audio-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { data, error } = await admin.storage.from(PAPER_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return { error: "We couldn't prepare the audio upload. Please try again." };
    audio = { path: data.path, url: data.signedUrl };
  }
  return { pages: out, audio };
}

const partSchema = z.object({
  id: z.string(), section: z.enum(["lesen", "sprachbausteine", "hoeren", "schreiben"]), title: z.string(), task: z.string(), kind: z.enum(["match", "abc", "tf", "write"]),
  first: z.number().int().min(0).max(60), count: z.number().int().min(0).max(60), options: z.array(z.string()).optional(), points: z.number().min(0).max(300),
  fromPage: z.number().int().min(1).max(200), toPage: z.number().int().min(1).max(200),
});
const schema = z.object({
  id: uuid,
  title: z.string().trim().min(1, "Give the paper a title.").max(120),
  topics: z.string().trim().max(300),
  tone: z.enum(COVER_TONES),
  exam: z.enum(PAPER_EXAMS.map((e) => e.id) as [PaperExam, ...PaperExam[]]),
  level: z.enum(PAPER_LEVELS),
  visibility: z.enum(["batches", "academy"]),
  batchIds: z.array(uuid).max(50),
  rights: z.literal(true, { error: "Please confirm that you own this paper or have the right to use it." }),
  structure: z.object({ parts: z.array(partSchema).min(1).max(20) }),
  audioPath: z.string().max(300).nullable(),
  answersText: z.string().max(5000),
});

/** Save a private paper and its answer key after the files are uploaded. */
export async function createTeacherPaper(input: unknown): Promise<{ error: string } | { id: string }> {
  const { user, ws, admin } = await teacher();
  const p = schema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  if (!ws || !admin) return { error: "You need a workspace first. Please contact us." };
  const d = p.data;
  if (d.visibility === "batches" && d.batchIds.length === 0) return { error: "Choose at least one batch, or share with your whole workspace." };
  const batches = (await Promise.all(d.batchIds.map((b) => getManagedBatch(b, user.id)))).filter((b) => !!b && b.academy_id === ws.workspace.id);
  if (batches.length !== d.batchIds.length) return { error: "You can only share with your own batches." };

  const structure = d.structure as PaperStructure;
  const key = parseAnswerKey(d.answersText);
  const missing: number[] = [];
  for (const part of structure.parts) for (const n of partQuestions(part)) if (!key[String(n)]) missing.push(n);
  if (missing.length) return { error: `The answer key is missing question ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}.` };
  if (d.audioPath && !d.audioPath.startsWith(`${d.id}/`)) return { error: GENERIC };

  const slug = `${d.title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "paper"}-${crypto.randomUUID().slice(0, 6)}`;
  const { error } = await admin.from("mock_papers").insert({
    id: d.id, slug, title: d.title, topics: d.topics, tone: d.tone, exam: d.exam, level: d.level, is_free: true, structure, audio_path: d.audioPath,
    owner_id: user.id, academy_id: ws.workspace.id, visibility: d.visibility, rights_confirmed_at: new Date().toISOString(),
  });
  if (error) return { error: GENERIC };
  const keyRes = await admin.from("mock_paper_keys").insert({ paper_id: d.id, answers: key });
  if (keyRes.error) {
    await admin.from("mock_papers").delete().eq("id", d.id);
    return { error: GENERIC };
  }
  if (d.visibility === "batches") await admin.from("paper_batches").insert(d.batchIds.map((b) => ({ paper_id: d.id, batch_id: b, academy_id: ws.workspace.id })));
  revalidatePath("/teacher/papers");
  return { id: d.id };
}

const textSchema = z.record(z.string().regex(/^\d{1,3}$/), z.array(z.tuple([z.string().max(200), z.number(), z.number(), z.number(), z.number()])).max(4000));
export async function setTeacherPaperText(id: unknown, pages: unknown): Promise<Result> {
  const { user, admin } = await teacher();
  const pid = uuid.safeParse(id);
  const t = textSchema.safeParse(pages);
  if (!admin || !pid.success || !t.success || !(await ownPaper(admin, pid.data, user.id))) return { error: GENERIC };
  const { error } = await admin.from("mock_papers").update({ page_text: t.data }).eq("id", pid.data);
  return error ? { error: GENERIC } : { ok: true };
}

export async function setTeacherPaperPublished(id: unknown, published: unknown): Promise<Result> {
  const { user, admin } = await teacher();
  const pid = uuid.safeParse(id);
  if (!admin || !pid.success || typeof published !== "boolean" || !(await ownPaper(admin, pid.data, user.id))) return { error: GENERIC };
  await admin.from("mock_papers").update({ is_published: published }).eq("id", pid.data);
  revalidatePath("/teacher/papers");
  revalidatePath("/dashboard/exam", "layout");
  return { ok: true };
}

export async function deleteTeacherPaper(id: unknown): Promise<Result> {
  const { user, admin } = await teacher();
  const pid = uuid.safeParse(id);
  if (!admin || !pid.success || !(await ownPaper(admin, pid.data, user.id))) return { error: GENERIC };
  const { data: files } = await admin.storage.from(PAPER_BUCKET).list(pid.data, { limit: 200 });
  if (files?.length) await admin.storage.from(PAPER_BUCKET).remove(files.map((f) => `${pid.data}/${f.name}`));
  await admin.from("mock_papers").delete().eq("id", pid.data);
  revalidatePath("/teacher/papers");
  revalidatePath("/dashboard/exam", "layout");
  return { ok: true };
}

/** A student (or teacher) reports a paper that should not be here. Admins read the reports. */
export async function reportPaper(paperId: unknown, reason: unknown): Promise<Result> {
  const user = await requireUser(["student", "teacher", "academy_admin", "super_admin"]);
  const id = uuid.safeParse(paperId);
  const r = z.string().trim().min(3, "Tell us briefly what is wrong.").max(500).safeParse(reason);
  const admin = createAdminClient();
  if (!id.success || !admin) return { error: GENERIC };
  if (!r.success) return { error: r.error.issues[0].message };
  const { error } = await admin.from("paper_reports").insert({ paper_id: id.data, reporter_id: user.id, reason: r.data });
  return error ? { error: GENERIC } : { ok: true };
}
