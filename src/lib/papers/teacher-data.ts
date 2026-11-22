import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type TeacherPaper = { id: string; title: string; is_published: boolean; visibility: string; created_at: string };

/** The teacher's own private papers. Call with the logged-in teacher's id. */
export async function listTeacherPapers(userId: string): Promise<TeacherPaper[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("mock_papers").select("id, title, is_published, visibility, created_at").eq("owner_id", userId).order("created_at", { ascending: false });
  return (data ?? []) as TeacherPaper[];
}

/** Is this paper a teacher's private paper? (Read on its own so a missing column never breaks the exam pages.) */
export async function isTeacherPaper(paperId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { data, error } = await admin.from("mock_papers").select("owner_id").eq("id", paperId).maybeSingle();
  return !error && !!data?.owner_id;
}

export type PaperReport = { id: string; paperTitle: string; reason: string; createdAt: string };

/** Reports about papers, newest first, for the admin screen. */
export async function listPaperReports(): Promise<PaperReport[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data, error } = await admin.from("paper_reports").select("id, reason, created_at, mock_papers(title)").order("created_at", { ascending: false }).limit(30);
  if (error) return [];
  return ((data ?? []) as unknown as { id: string; reason: string; created_at: string; mock_papers: { title: string } | null }[]).map((r) => ({ id: r.id, paperTitle: r.mock_papers?.title ?? "Deleted paper", reason: r.reason, createdAt: r.created_at }));
}
