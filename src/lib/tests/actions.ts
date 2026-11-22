"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { getManagedBatch } from "@/lib/batches/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { zonedToUtc } from "@/lib/time";
import { gradeTest, type Answers, type KeyedQuestion } from "./grade";
import { getManagedTest, getStudentTest } from "./data";

const GENERIC = "That didn't work. Please try again.";
const uuid = z.string().uuid();
type Result = { error: string } | { ok: true };

const questionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("mc"), prompt: z.string().trim().min(1, "Every question needs text.").max(1000), points: z.number().positive().max(100), options: z.array(z.string().trim().min(1, "Fill in every answer option.").max(300)).min(2, "Multiple choice needs at least 2 options.").max(6), correct: z.number().int().min(0) }),
  z.object({ kind: z.literal("tf"), prompt: z.string().trim().min(1, "Every question needs text.").max(1000), points: z.number().positive().max(100), correct: z.boolean() }),
  z.object({ kind: z.literal("fill"), prompt: z.string().trim().min(1, "Every question needs text.").max(1000), points: z.number().positive().max(100), accepted: z.array(z.string().trim().min(1).max(200)).min(1, "A fill-in question needs at least one accepted answer.").max(10) }),
]);
const createSchema = z.object({
  title: z.string().trim().min(1, "Give the test a title.").max(160),
  instructions: z.string().trim().max(2000),
  timeLimit: z.number().int().min(1).max(240).nullable(),
  closeDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use a valid closing date."),
  closeTime: z.string().regex(/^(\d{2}:\d{2})?$/, "Use a valid closing time."),
  batchIds: z.array(uuid).min(1, "Choose at least one batch.").max(50),
  questions: z.array(questionSchema).min(1, "Add at least one question.").max(100),
});

/** Teacher: create a test with its questions and answer keys. It starts as a draft. */
export async function createTest(input: unknown): Promise<{ error: string } | { ok: true; id: string }> {
  const user = await requireUser(["teacher"]);
  const ws = await getMyWorkspace(user.id);
  const admin = createAdminClient();
  const p = createSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  if (!ws || !admin) return { error: "You need a workspace first. Please contact us." };
  const v = p.data;
  for (const q of v.questions) if (q.kind === "mc" && q.correct >= q.options.length) return { error: "Choose the correct option for every multiple choice question." };
  const batches = (await Promise.all(v.batchIds.map((b) => getManagedBatch(b, user.id)))).filter((b) => !!b && b.academy_id === ws.workspace.id);
  if (batches.length !== v.batchIds.length) return { error: "You can only share with your own batches." };
  let closes: string | null = null;
  if (v.closeDate) {
    const d = zonedToUtc(v.closeDate, v.closeTime || "23:59", user.timeZone);
    if (!d) return { error: "Pick a valid closing date and time." };
    closes = d.toISOString();
  }

  const { data: t, error } = await admin.from("tests").insert({ academy_id: ws.workspace.id, owner_id: user.id, title: v.title, instructions: v.instructions || null, time_limit_min: v.timeLimit, closes_at: closes }).select("id").single();
  if (error || !t) return { error: GENERIC };
  await admin.from("test_batches").insert(v.batchIds.map((b) => ({ test_id: t.id, batch_id: b, academy_id: ws.workspace.id })));
  for (let i = 0; i < v.questions.length; i++) {
    const q = v.questions[i];
    const { data: row, error: qe } = await admin.from("test_questions").insert({ test_id: t.id, position: i + 1, kind: q.kind, prompt: q.prompt, options: q.kind === "mc" ? q.options : [], points: q.points }).select("id").single();
    if (qe || !row) {
      await admin.from("tests").delete().eq("id", t.id);
      return { error: GENERIC };
    }
    const answer = q.kind === "mc" ? q.correct : q.kind === "tf" ? q.correct : q.accepted;
    const { error: ke } = await admin.from("test_keys").insert({ question_id: row.id, answer });
    if (ke) {
      await admin.from("tests").delete().eq("id", t.id);
      return { error: GENERIC };
    }
  }
  revalidatePath("/teacher/tests");
  return { ok: true, id: t.id };
}

export async function setTestPublished(testId: unknown, published: unknown): Promise<Result> {
  const user = await requireUser(["teacher"]);
  const id = uuid.safeParse(testId);
  const admin = createAdminClient();
  if (!id.success || typeof published !== "boolean" || !admin || !(await getManagedTest(id.data, user.id))) return { error: GENERIC };
  await admin.from("tests").update({ published }).eq("id", id.data);
  revalidatePath("/teacher/tests");
  revalidatePath(`/teacher/tests/${id.data}`);
  return { ok: true };
}

export async function deleteTest(testId: unknown): Promise<Result> {
  const user = await requireUser(["teacher"]);
  const id = uuid.safeParse(testId);
  const admin = createAdminClient();
  if (!id.success || !admin || !(await getManagedTest(id.data, user.id))) return { error: GENERIC };
  await admin.from("tests").delete().eq("id", id.data);
  revalidatePath("/teacher/tests");
  return { ok: true };
}

// STUDENT ---------------------------------------------------------------------

/** Start (or resume) the test. The time limit runs from the first start and cannot be restarted. */
export async function startTest(testId: unknown): Promise<{ error: string } | { ok: true; attemptId: string }> {
  const user = await requireUser(["student"]);
  const id = uuid.safeParse(testId);
  const admin = createAdminClient();
  if (!id.success || !admin) return { error: GENERIC };
  const t = await getStudentTest(id.data, user.id);
  if (!t) return { error: GENERIC };
  if ("reason" in t) return { error: t.reason };
  if (t.attempt) return t.attempt.submitted_at ? { error: "You already finished this test." } : { ok: true, attemptId: t.attempt.id };
  const { data, error } = await admin.from("test_attempts").insert({ test_id: t.test.id, student_id: user.id, academy_id: t.test.academy_id }).select("id").single();
  if (error || !data) return { error: GENERIC };
  return { ok: true, attemptId: data.id };
}

const answersSchema = z.record(z.string().uuid(), z.union([z.number().int().min(0).max(5), z.boolean(), z.string().max(300)]));

/** Open attempt of this student, still inside the time limit (plus 60 seconds for slow connections). */
async function openAttempt(attemptId: string, userId: string) {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: a } = await admin.from("test_attempts").select("id, test_id, started_at, submitted_at").eq("id", attemptId).eq("student_id", userId).maybeSingle();
  if (!a || a.submitted_at) return null;
  const { data: t } = await admin.from("tests").select("time_limit_min").eq("id", a.test_id).maybeSingle();
  const limit = t?.time_limit_min as number | null | undefined;
  const late = limit ? Date.now() > new Date(a.started_at as string).getTime() + (limit * 60 + 60) * 1000 : false;
  return { admin, attempt: a as { id: string; test_id: string; started_at: string }, late };
}

/** Autosave: called a moment after every change. */
export async function saveTestAnswers(attemptId: unknown, answers: unknown): Promise<Result> {
  const user = await requireUser(["student"]);
  const id = uuid.safeParse(attemptId);
  const a = answersSchema.safeParse(answers);
  if (!id.success || !a.success) return { error: GENERIC };
  const o = await openAttempt(id.data, user.id);
  if (!o || o.late) return { error: GENERIC };
  await o.admin.from("test_attempts").update({ answers: a.data }).eq("id", id.data);
  return { ok: true };
}

/** Hand in: graded on the server against the keys. A late hand-in is still graded with what was saved last. */
export async function submitTest(attemptId: unknown, answers: unknown): Promise<{ error: string } | { ok: true; testId: string }> {
  const user = await requireUser(["student"]);
  const id = uuid.safeParse(attemptId);
  const a = answersSchema.safeParse(answers);
  if (!id.success || !a.success) return { error: GENERIC };
  const o = await openAttempt(id.data, user.id);
  if (!o) return { error: GENERIC };
  let given: Answers = a.data;
  if (o.late) {
    const { data: saved } = await o.admin.from("test_attempts").select("answers").eq("id", id.data).maybeSingle();
    given = (saved?.answers as Answers) ?? {};
  }
  const { data: qs } = await o.admin.from("test_questions").select("id, kind, points").eq("test_id", o.attempt.test_id);
  const rows = (qs ?? []) as { id: string; kind: "mc" | "tf" | "fill"; points: number }[];
  const { data: keys } = await o.admin.from("test_keys").select("question_id, answer").in("question_id", rows.map((q) => q.id));
  const keyOf = new Map(((keys ?? []) as { question_id: string; answer: number | boolean | string[] }[]).map((k) => [k.question_id, k.answer]));
  const keyed: KeyedQuestion[] = rows.filter((q) => keyOf.has(q.id)).map((q) => ({ id: q.id, kind: q.kind, points: Number(q.points), answer: keyOf.get(q.id)! }));
  const result = gradeTest(keyed, given);
  await o.admin.from("test_attempts").update({ answers: given, submitted_at: new Date().toISOString(), score: result.score, max_score: result.max, result }).eq("id", id.data);
  revalidatePath("/dashboard/tests");
  return { ok: true, testId: o.attempt.test_id };
}
