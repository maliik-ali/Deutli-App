"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { countWords } from "@/lib/papers/template";
import { MIN_WORDS, type Criterion } from "./types";

const LEARNERS = ["student", "academy_admin", "super_admin"] as const;
const STAFF = ["teacher", "academy_admin", "super_admin"] as const;
const GENERIC = "That didn't work. Please try again.";
type Result = { error: string } | { ok: true };

/** The student's own submitted attempt with a real email, or an error message. */
async function ownSubmittedAttempt(userId: string, attemptId: unknown) {
  const id = z.string().uuid().safeParse(attemptId);
  const admin = createAdminClient();
  if (!id.success || !admin) return { error: GENERIC } as const;
  const { data } = await admin.from("mock_attempts").select("id, writing, submitted_at").eq("id", id.data).eq("user_id", userId).maybeSingle();
  if (!data?.submitted_at) return { error: "Submit your exam first." } as const;
  if (countWords(data.writing) < MIN_WORDS) return { error: `Write at least ${MIN_WORDS} words to get a check.` } as const;
  const { data: existing } = await admin.from("writing_reviews").select("id").eq("attempt_id", id.data).maybeSingle();
  if (existing) return { error: "This email was already sent to a teacher." } as const;
  return { admin, attemptId: id.data } as const;
}

/** A student without a teacher asks for a real teacher check (open request, any teacher can take it). */
export async function requestTeacherCheck(attemptId: unknown): Promise<Result> {
  const user = await requireUser(LEARNERS);
  if (user.teacherId) return { error: "Your teacher already checks your writing." };
  const a = await ownSubmittedAttempt(user.id, attemptId);
  if ("error" in a && a.error) return { error: a.error };
  if (!a.admin) return { error: GENERIC };
  const { error } = await a.admin.from("writing_reviews").insert({ attempt_id: a.attemptId, student_id: user.id, teacher_id: null, source: "offer" });
  if (error) return { error: GENERIC };
  revalidatePath("/teacher");
  return { ok: true };
}

/** A student sends this email to a teacher with the teacher's code. The teacher then becomes their teacher. */
export async function sendToTeacher(attemptId: unknown, code: unknown): Promise<Result> {
  const user = await requireUser(LEARNERS);
  const c = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/).safeParse(code);
  if (!c.success) return { error: "That code isn't right. Ask your teacher for their 6-letter code." };
  const a = await ownSubmittedAttempt(user.id, attemptId);
  if ("error" in a && a.error) return { error: a.error };
  if (!a.admin) return { error: GENERIC };
  const { data: teacher } = await a.admin.from("profiles").select("id, role").eq("teacher_code", c.data).maybeSingle();
  if (!teacher || teacher.role !== "teacher") return { error: "That code isn't right. Ask your teacher for their 6-letter code." };
  const { error } = await a.admin.from("writing_reviews").insert({ attempt_id: a.attemptId, student_id: user.id, teacher_id: teacher.id, source: "code" });
  if (error) return { error: GENERIC };
  // From now on this student is taught by that teacher (only if they had none).
  await a.admin.from("profiles").update({ teacher_id: teacher.id }).eq("id", user.id).is("teacher_id", null);
  revalidatePath("/teacher");
  return { ok: true };
}

/** A teacher takes an open request. */
export async function takeRequest(reviewId: unknown): Promise<Result> {
  const user = await requireUser(STAFF);
  const id = z.string().uuid().safeParse(reviewId);
  const admin = createAdminClient();
  if (!id.success || !admin) return { error: GENERIC };
  const { data } = await admin.from("writing_reviews").update({ teacher_id: user.id }).eq("id", id.data).is("teacher_id", null).eq("status", "requested").select("id");
  if (!data?.length) return { error: "Someone else already took this one." };
  revalidatePath("/teacher");
  return { ok: true };
}

const reviewSchema = z.object({
  task: z.number().int().min(0).max(15),
  communication: z.number().int().min(0).max(15),
  accuracy: z.number().int().min(0).max(15),
  comment: z.string().trim().max(2000),
});

/** The teacher's score and comment. Only the review's own teacher (or an admin) may save it. */
export async function saveTeacherReview(reviewId: unknown, input: unknown): Promise<Result> {
  const user = await requireUser(STAFF);
  const id = z.string().uuid().safeParse(reviewId);
  const v = reviewSchema.safeParse(input);
  const admin = createAdminClient();
  if (!id.success || !v.success || !admin) return { error: "Scores must be whole numbers from 0 to 15." };
  const { data: review } = await admin.from("writing_reviews").select("id, teacher_id").eq("id", id.data).maybeSingle();
  if (!review) return { error: GENERIC };
  const isAdmin = user.role !== "teacher";
  if (review.teacher_id !== user.id && !isAdmin) return { error: "This email belongs to another teacher." };
  const criteria: Criterion[] = [
    { id: "task", score: v.data.task, max: 15, note: "" },
    { id: "communication", score: v.data.communication, max: 15, note: "" },
    { id: "accuracy", score: v.data.accuracy, max: 15, note: "" },
  ];
  const { error } = await admin
    .from("writing_reviews")
    .update({
      status: "done",
      criteria,
      total: v.data.task + v.data.communication + v.data.accuracy,
      comment: v.data.comment || null,
      reviewed_at: new Date().toISOString(),
      teacher_id: review.teacher_id ?? user.id,
    })
    .eq("id", id.data);
  if (error) return { error: GENERIC };
  revalidatePath("/teacher");
  return { ok: true };
}
