import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Kind } from "./grade";

export type TestRow = { id: string; academy_id: string; owner_id: string; title: string; instructions: string | null; time_limit_min: number | null; opens_at: string | null; closes_at: string | null; published: boolean; created_at: string };
export type Question = { id: string; position: number; kind: Kind; prompt: string; options: string[]; points: number };
const TEST_COLS = "id, academy_id, owner_id, title, instructions, time_limit_min, opens_at, closes_at, published, created_at";
const Q_COLS = "id, position, kind, prompt, options, points";

const asQuestions = (rows: unknown): Question[] => ((rows ?? []) as (Omit<Question, "options"> & { options: unknown })[]).map((r) => ({ ...r, options: Array.isArray(r.options) ? (r.options as string[]) : [], points: Number(r.points) }));

/** The teacher's tests (owners and admins of the workspace see all of the workspace's), with batches, attempts and average score. */
export async function listTeacherTests(userId: string, academyId: string, seeAll: boolean) {
  const admin = createAdminClient();
  if (!admin) return [] as (TestRow & { batches: string[]; attempts: number; submitted: number; avgPct: number | null })[];
  let q = admin.from("tests").select(TEST_COLS).order("created_at", { ascending: false }).limit(100);
  q = seeAll ? q.eq("academy_id", academyId) : q.eq("owner_id", userId);
  const rows = ((await q).data ?? []) as TestRow[];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [{ data: tb }, { data: at }] = await Promise.all([
    admin.from("test_batches").select("test_id, batches(name)").in("test_id", ids),
    admin.from("test_attempts").select("test_id, submitted_at, score, max_score").in("test_id", ids),
  ]);
  const names = new Map<string, string[]>();
  for (const r of (tb ?? []) as unknown as { test_id: string; batches: { name: string } | null }[]) names.set(r.test_id, [...(names.get(r.test_id) ?? []), r.batches?.name ?? "Batch"]);
  const att = (at ?? []) as { test_id: string; submitted_at: string | null; score: number | null; max_score: number | null }[];
  return rows.map((t) => {
    const mine = att.filter((a) => a.test_id === t.id);
    const done = mine.filter((a) => a.submitted_at && a.max_score);
    const avg = done.length ? Math.round((done.reduce((s, a) => s + (Number(a.score) / Number(a.max_score)) * 100, 0) / done.length)) : null;
    return { ...t, batches: names.get(t.id) ?? [], attempts: mine.length, submitted: done.length, avgPct: avg };
  });
}

/** A test the teacher may manage, with its questions. Never sent to students. */
export async function getManagedTest(id: string, userId: string) {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("tests").select(TEST_COLS).eq("id", id).maybeSingle();
  const t = data as TestRow | null;
  if (!t) return null;
  if (t.owner_id !== userId) {
    const { data: m } = await admin.from("academy_members").select("role").eq("academy_id", t.academy_id).eq("user_id", userId).maybeSingle();
    if (!m || (m.role !== "owner" && m.role !== "admin")) return null;
  }
  const { data: qs } = await admin.from("test_questions").select(Q_COLS).eq("test_id", id).order("position");
  return { test: t, questions: asQuestions(qs) };
}

/** Results of one test: who took it, scores, and the share of correct answers per question. */
export async function getTestResults(testId: string) {
  const admin = createAdminClient();
  if (!admin) return { students: [], perQuestion: new Map<string, number>(), batchStudents: 0 };
  const [{ data: at }, { data: tb }] = await Promise.all([
    admin.from("test_attempts").select("student_id, submitted_at, score, max_score, result").eq("test_id", testId),
    admin.from("test_batches").select("batch_id").eq("test_id", testId),
  ]);
  const attempts = (at ?? []) as { student_id: string; submitted_at: string | null; score: number | null; max_score: number | null; result: { perQuestion?: Record<string, { ok: boolean }> } | null }[];
  const batchIds = ((tb ?? []) as { batch_id: string }[]).map((b) => b.batch_id);
  const members = batchIds.length ? ((await admin.from("batch_members").select("student_id").in("batch_id", batchIds)).data ?? []) as { student_id: string }[] : [];
  const everyone = [...new Set([...members.map((m) => m.student_id), ...attempts.map((a) => a.student_id)])];
  const profs = everyone.length ? (((await admin.from("profiles").select("id, full_name").in("id", everyone)).data ?? []) as { id: string; full_name: string | null }[]) : [];
  const name = new Map(profs.map((p) => [p.id, p.full_name ?? "Student"]));
  const byStudent = new Map(attempts.map((a) => [a.student_id, a]));
  const students = everyone
    .map((id) => {
      const a = byStudent.get(id);
      return { id, name: name.get(id) ?? "Student", status: !a ? ("not started" as const) : a.submitted_at ? ("submitted" as const) : ("in progress" as const), score: a?.submitted_at ? Number(a.score) : null, max: a?.submitted_at ? Number(a.max_score) : null };
    })
    .sort((x, y) => x.name.localeCompare(y.name));
  const tally = new Map<string, { ok: number; n: number }>();
  for (const a of attempts) if (a.submitted_at && a.result?.perQuestion) for (const [q, v] of Object.entries(a.result.perQuestion)) { const t = tally.get(q) ?? { ok: 0, n: 0 }; t.n++; if (v.ok) t.ok++; tally.set(q, t); }
  const perQuestion = new Map([...tally].map(([q, t]) => [q, Math.round((t.ok / t.n) * 100)]));
  return { students, perQuestion, batchStudents: members.length };
}

/** The tests a student may take: published, shared with one of their batches, and inside the open window. */
export async function listMyTests(studentId: string) {
  const admin = createAdminClient();
  if (!admin) return [] as (TestRow & { status: "new" | "in progress" | "done"; pct: number | null; closed: boolean })[];
  const { data: bm } = await admin.from("batch_members").select("batch_id").eq("student_id", studentId);
  const batchIds = ((bm ?? []) as { batch_id: string }[]).map((b) => b.batch_id);
  if (!batchIds.length) return [];
  const { data: tb } = await admin.from("test_batches").select("test_id").in("batch_id", batchIds);
  const ids = [...new Set(((tb ?? []) as { test_id: string }[]).map((r) => r.test_id))];
  if (!ids.length) return [];
  const [{ data: ts }, { data: at }] = await Promise.all([
    admin.from("tests").select(TEST_COLS).in("id", ids).eq("published", true).order("created_at", { ascending: false }),
    admin.from("test_attempts").select("test_id, submitted_at, score, max_score").eq("student_id", studentId).in("test_id", ids),
  ]);
  const att = new Map(((at ?? []) as { test_id: string; submitted_at: string | null; score: number | null; max_score: number | null }[]).map((a) => [a.test_id, a]));
  const now = Date.now();
  return ((ts ?? []) as TestRow[]).map((t) => {
    const a = att.get(t.id);
    return { ...t, status: a ? (a.submitted_at ? ("done" as const) : ("in progress" as const)) : ("new" as const), pct: a?.submitted_at && a.max_score ? Math.round((Number(a.score) / Number(a.max_score)) * 100) : null, closed: !!t.closes_at && new Date(t.closes_at).getTime() < now };
  });
}

/** Is this student allowed to take this test now? Returns the test, or a short reason. */
export async function getStudentTest(testId: string, studentId: string): Promise<{ test: TestRow; questions: Question[]; attempt: { id: string; started_at: string; submitted_at: string | null; answers: Record<string, number | boolean | string> } | null } | { reason: string } | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("tests").select(TEST_COLS).eq("id", testId).maybeSingle();
  const t = data as TestRow | null;
  if (!t || !t.published) return null;
  const [{ data: tb }, { data: bm }] = await Promise.all([admin.from("test_batches").select("batch_id").eq("test_id", testId), admin.from("batch_members").select("batch_id").eq("student_id", studentId)]);
  const mine = new Set(((bm ?? []) as { batch_id: string }[]).map((b) => b.batch_id));
  if (!((tb ?? []) as { batch_id: string }[]).some((b) => mine.has(b.batch_id))) return null;
  const { data: a } = await admin.from("test_attempts").select("id, started_at, submitted_at, answers").eq("test_id", testId).eq("student_id", studentId).maybeSingle();
  const attempt = (a as { id: string; started_at: string; submitted_at: string | null; answers: Record<string, number | boolean | string> } | null) ?? null;
  if (!attempt) {
    if (t.opens_at && new Date(t.opens_at).getTime() > Date.now()) return { reason: "This test is not open yet." };
    if (t.closes_at && new Date(t.closes_at).getTime() < Date.now()) return { reason: "This test is closed." };
  }
  const { data: qs } = await admin.from("test_questions").select(Q_COLS).eq("test_id", testId).order("position");
  return { test: t, questions: asQuestions(qs), attempt };
}

/** After submitting: the questions with the right answers and what the student gave. Only for a submitted attempt of this student. */
export async function getStudentResult(testId: string, studentId: string) {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: a } = await admin.from("test_attempts").select("id, submitted_at, score, max_score, result").eq("test_id", testId).eq("student_id", studentId).maybeSingle();
  if (!a?.submitted_at) return null;
  const [{ data: t }, { data: qs }] = await Promise.all([admin.from("tests").select("title").eq("id", testId).maybeSingle(), admin.from("test_questions").select(Q_COLS).eq("test_id", testId).order("position")]);
  const questions = asQuestions(qs);
  const { data: keys } = await admin.from("test_keys").select("question_id, answer").in("question_id", questions.map((q) => q.id));
  const key = new Map(((keys ?? []) as { question_id: string; answer: unknown }[]).map((k) => [k.question_id, k.answer]));
  const per = ((a.result as { perQuestion?: Record<string, { ok: boolean; given: number | boolean | string | null }> } | null)?.perQuestion) ?? {};
  return { title: (t?.title as string) ?? "Test", score: Number(a.score), max: Number(a.max_score), questions: questions.map((q) => ({ ...q, answer: key.get(q.id) as number | boolean | string[], ok: per[q.id]?.ok ?? false, given: per[q.id]?.given ?? null })) };
}
