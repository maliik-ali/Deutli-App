import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Criterion } from "./types";

export type ReviewView = {
  id: string;
  source: "assigned" | "code" | "offer";
  status: "requested" | "done";
  teacherName: string | null;
  total: number | null;
  criteria: Criterion[];
  comment: string | null;
};

type ReviewRow = {
  id: string;
  source: ReviewView["source"];
  status: ReviewView["status"];
  teacher_id: string | null;
  total: number | null;
  criteria: Criterion[];
  comment: string | null;
};

/** The review of an attempt as the student sees it. `userId` must already be checked by the caller. */
export async function getReviewForStudent(attemptId: string, userId: string): Promise<ReviewView | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("writing_reviews")
    .select("id, source, status, teacher_id, total, criteria, comment")
    .eq("attempt_id", attemptId)
    .eq("student_id", userId)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as ReviewRow;
  let teacherName: string | null = null;
  if (row.teacher_id) {
    const { data: t } = await admin.from("profiles").select("full_name").eq("id", row.teacher_id).maybeSingle();
    teacherName = (t as { full_name: string | null } | null)?.full_name ?? null;
  }
  return { id: row.id, source: row.source, status: row.status, teacherName, total: row.total, criteria: row.criteria ?? [], comment: row.comment };
}

/** Name of a student's teacher (for the "your teacher …" message). */
export async function getTeacherName(teacherId: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("profiles").select("full_name").eq("id", teacherId).maybeSingle();
  return (data as { full_name: string | null } | null)?.full_name ?? null;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** The teacher's short code (made on first use). Students type it to send an email to this teacher. */
export async function ensureTeacherCode(teacherId: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const read = async () =>
    ((await admin.from("profiles").select("teacher_code").eq("id", teacherId).maybeSingle()).data as { teacher_code: string | null } | null)?.teacher_code ?? null;
  const existing = await read();
  if (existing) return existing;
  for (let i = 0; i < 5; i++) {
    const { error } = await admin.from("profiles").update({ teacher_code: newCode() }).eq("id", teacherId).is("teacher_code", null);
    if (!error) break;
  }
  return read();
}
