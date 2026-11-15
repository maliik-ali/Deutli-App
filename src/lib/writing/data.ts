import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Criterion, Mistake, WritingFeedback } from "./types";

export type FeedbackRow = {
  summary: string;
  criteria: Criterion[];
  mistakes: Mistake[];
  model: string;
  checks_used: number;
  teacher_status: "pending" | "confirmed" | "changed";
  teacher_total: number | null;
  teacher_comment: string | null;
};

export const FEEDBACK_COLUMNS = "summary, criteria, mistakes, model, checks_used, teacher_status, teacher_total, teacher_comment";

export function toFeedback(row: FeedbackRow): WritingFeedback {
  return {
    summary: row.summary,
    criteria: row.criteria,
    total: row.criteria.reduce((s, c) => s + c.score, 0),
    max: 45,
    mistakes: row.mistakes,
    model: row.model,
    checksUsed: row.checks_used,
    teacher: { status: row.teacher_status, total: row.teacher_total, comment: row.teacher_comment },
  };
}

/** The student's saved feedback for an attempt (row level security: only their own). */
export async function getWritingFeedback(attemptId: string): Promise<WritingFeedback | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("writing_feedback").select(FEEDBACK_COLUMNS).eq("attempt_id", attemptId).maybeSingle();
  if (error || !data) return null; // Also covers "migration not run yet".
  return toFeedback(data as unknown as FeedbackRow);
}
