import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Sparkles } from "lucide-react";

import { ReviewForm } from "@/components/teacher/review-form";
import { Card, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Check writing" };

export default async function ReviewPage(props: PageProps<"/teacher/review/[id]">) {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const { id } = await props.params;
  const admin = createAdminClient();
  if (!admin) notFound();

  const { data: review } = await admin.from("writing_reviews").select("id, attempt_id, student_id, teacher_id, status, criteria, comment").eq("id", id).maybeSingle();
  // A teacher sees only their own students' emails; admins see all. Open requests must be taken first.
  if (!review || (review.teacher_id !== user.id && user.role === "teacher")) notFound();

  const [{ data: attempt }, { data: student }, { data: ai }] = await Promise.all([
    admin.from("mock_attempts").select("writing, paper_id").eq("id", review.attempt_id).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", review.student_id).maybeSingle(),
    admin.from("writing_feedback").select("summary, criteria").eq("attempt_id", review.attempt_id).maybeSingle(),
  ]);
  if (!attempt) notFound();
  const { data: paper } = await admin.from("mock_papers").select("title, writing_task").eq("id", attempt.paper_id).maybeSingle();
  const done = review.status === "done";
  const old = (review.criteria ?? []) as { id: string; score: number }[];
  const score = (k: string) => old.find((c) => c.id === k)?.score ?? 0;
  const aiTotal = ai ? ((ai.criteria ?? []) as { score: number }[]).reduce((s, c) => s + c.score, 0) : null;

  return (
    <main className="mx-auto grid max-w-3xl gap-5 px-4 py-8 sm:px-8">
      <Link href="/teacher" className="inline-flex w-fit items-center gap-1 py-2 pr-3 text-[14px] font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden /> Back
      </Link>
      <div>
        <p className="text-[12px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{paper?.title ?? "Mock exam"} · Schriftlicher Ausdruck</p>
        <h1 className="text-2xl font-extrabold">{student?.full_name ?? "Student"}</h1>
      </div>
      {paper?.writing_task && (
        <Card className="grid gap-1 p-5">
          <CardTitle>Task</CardTitle>
          <p className="text-[14px] whitespace-pre-wrap text-muted-foreground">{paper.writing_task}</p>
        </Card>
      )}
      <Card className="grid gap-2 p-6">
        <CardTitle>Email</CardTitle>
        <p className="text-[16px] leading-[1.8] whitespace-pre-wrap" lang="de">
          {attempt.writing}
        </p>
      </Card>
      {ai && (
        <Card className="grid gap-1 p-5">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.12em] text-subtle-foreground uppercase">
            <Sparkles className="size-3.5" aria-hidden /> AI estimate: {aiTotal} / 45 (the student also saw this)
          </p>
          <p className="text-[14px]">{ai.summary}</p>
        </Card>
      )}
      <Card className="grid gap-3 p-6">
        <CardTitle>{done ? "Your decision (you can change it)" : "Your decision"}</CardTitle>
        <ReviewForm reviewId={review.id} initial={done ? { scores: { task: score("task"), communication: score("communication"), accuracy: score("accuracy") }, comment: review.comment ?? "" } : undefined} />
      </Card>
    </main>
  );
}
