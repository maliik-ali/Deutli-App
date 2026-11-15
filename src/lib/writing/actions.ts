"use server";

import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { aiReady } from "@/lib/ai/provider";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { countWords } from "@/lib/papers/template";
import { checkWriting } from "./check";
import { FEEDBACK_COLUMNS, toFeedback, type FeedbackRow } from "./data";
import { MAX_CHECKS, MIN_WORDS, type WritingFeedback } from "./types";

const LEARNERS = ["student", "academy_admin", "super_admin"] as const;
type Out = { error: string } | { feedback: WritingFeedback };

/**
 * "Check my writing": runs the free grammar checker and the AI on a SUBMITTED attempt.
 * Limits (checked here, on the server): own attempt only, at least 20 words, 2 checks per attempt.
 * The email itself stays saved whatever happens.
 */
export async function requestWritingFeedback(attemptId: unknown): Promise<Out> {
  const user = await requireUser(LEARNERS);
  const id = z.string().uuid().safeParse(attemptId);
  if (!id.success) return { error: "That didn't work. Please try again." };

  const supabase = await createClient();
  const { data: attempt } = await supabase
    .from("mock_attempts")
    .select("id, paper_id, writing, submitted_at")
    .eq("id", id.data)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!attempt?.submitted_at) return { error: "Submit your exam first, then check your writing." };
  if (countWords(attempt.writing) < MIN_WORDS) return { error: `Write at least ${MIN_WORDS} words to get feedback.` };

  const { data: existing } = await supabase.from("writing_feedback").select(FEEDBACK_COLUMNS).eq("attempt_id", id.data).maybeSingle();
  const used = (existing as FeedbackRow | null)?.checks_used ?? 0;
  if (used >= MAX_CHECKS) return { feedback: toFeedback(existing as unknown as FeedbackRow) };

  const admin = createAdminClient();
  if (!admin || !aiReady()) return { error: "AI feedback isn't available right now. Your email is saved. Try again later." };

  // The task text of the writing part (optional, set by the admin per paper).
  const { data: paper } = await supabase.from("mock_papers").select("writing_task").eq("id", attempt.paper_id).maybeSingle();
  const task = (paper as { writing_task?: string } | null)?.writing_task ?? "";

  const result = await checkWriting(attempt.writing, task);
  if (!result) return { error: "The AI couldn't check your email this time. Your email is saved. Please try again." };

  const row = {
    attempt_id: id.data,
    user_id: user.id,
    summary: result.summary,
    criteria: result.criteria,
    mistakes: result.mistakes,
    provider: result.provider,
    model: result.model,
    checks_used: used + 1,
    teacher_status: "pending" as const,
    teacher_total: null,
    teacher_comment: null,
    updated_at: new Date().toISOString(),
  };
  const { data: saved, error } = await admin.from("writing_feedback").upsert(row, { onConflict: "attempt_id" }).select(FEEDBACK_COLUMNS).single();
  if (error || !saved) return { error: "We couldn't save your feedback. Your email is saved. Please try again." };
  return { feedback: toFeedback(saved as unknown as FeedbackRow) };
}
