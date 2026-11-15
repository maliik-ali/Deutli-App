import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { TeacherCheckCard } from "@/components/exam/teacher-check-card";
import { WritingFeedbackCard } from "@/components/exam/writing-feedback";
import { requireUser } from "@/lib/auth/dal";
import { getAttempt, getPaperById } from "@/lib/papers/data";
import { getWritingFeedback } from "@/lib/writing/data";
import { getReviewForStudent, getTeacherName } from "@/lib/writing/teacher";
import { SECTIONS, WRITTEN_MAX, WRITTEN_PASS, partQuestions } from "@/lib/papers/template";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Your result" };

export default async function MockResultPage(props: PageProps<"/dashboard/exam/mock/[examId]/result">) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const { examId } = await props.params;
  const sp = await props.searchParams;
  const attempt = typeof sp.a === "string" ? await getAttempt(sp.a) : null;
  if (!attempt?.result) notFound();
  const paper = await getPaperById(attempt.paper_id);
  if (!paper || paper.slug !== examId) notFound();
  const r = attempt.result;
  // Writing: a student with a teacher only gets a message (the teacher checks it).
  // A standalone student gets the AI estimate and can ask for a teacher check.
  const review = await getReviewForStudent(attempt.id, user.id);
  const hasTeacher = !!user.teacherId || review?.source === "assigned" || review?.source === "code";
  const feedback = await getWritingFeedback(attempt.id);
  const teacherName = user.teacherId ? await getTeacherName(user.teacherId) : null;
  const parts = paper.structure.parts;

  return (
    <main className="mx-auto grid max-w-[820px] gap-6 px-4 py-6 sm:px-6 md:py-8">
      <Link href={`/dashboard/exam/mock/${examId}`} className="inline-flex w-fit items-center gap-1 py-2 pr-3 text-[14px] font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden /> {paper.title}
      </Link>

      <header className="grid gap-2">
        <p className="text-[12px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">telc B1 · {paper.title}</p>
        <h1 className="text-[28px] font-extrabold sm:text-[32px]">Your score</h1>
        <p className="text-lg">
          <strong className="text-3xl">{r.total}</strong> <span className="text-muted-foreground">of {r.max} points (reading, grammar and listening)</span>
        </p>
        <p className="text-[14px] text-muted-foreground">
          Your email ({r.writingWords} words) is marked separately below, by the AI or by a teacher. The telc written exam has {WRITTEN_MAX} points in total, including 45 for writing. You pass with {WRITTEN_PASS}.
        </p>
      </header>

      <Card className="grid gap-3 p-6">
        <CardTitle>Section scores</CardTitle>
        <ul className="divide-y divide-border">
          {parts.filter((p) => p.kind !== "write").map((p) => {
            const pr = r.parts.find((x) => x.id === p.id);
            return (
              <li key={p.id} className="flex items-center justify-between py-3">
                <span>
                  {SECTIONS.find((s) => s.id === p.section)?.title} · {p.title}
                </span>
                <span className="font-semibold">
                  {pr?.correct}/{pr?.count} right · {pr?.points}/{pr?.max} points
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {(!hasTeacher || feedback) && (
        <WritingFeedbackCard attemptId={attempt.id} text={attempt.writing} words={r.writingWords} initial={feedback} canCheck={!hasTeacher} />
      )}
      <TeacherCheckCard attemptId={attempt.id} words={r.writingWords} hasTeacher={hasTeacher} teacherName={teacherName} review={review} />

      <Card className="grid gap-4 p-6">
        <CardTitle>Your answers</CardTitle>
        <p className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-success/30" /> right</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-destructive/30" /> wrong (the right answer is shown)</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-muted" /> not answered</span>
        </p>
        {parts.filter((p) => p.kind !== "write").map((p) => (
          <div key={p.id} className="grid gap-2">
            <p className="text-[13px] font-semibold tracking-[0.1em] text-subtle-foreground uppercase">
              {SECTIONS.find((s) => s.id === p.section)?.title} · {p.title}
            </p>
            <div className="flex flex-wrap gap-2">
              {partQuestions(p).map((n) => {
                const q = r.review[String(n)];
                const show = (v: string | null) => (v === "+" ? "+" : v === "-" ? "−" : (v ?? "–").toUpperCase());
                return (
                  <span key={n} className={cn("grid min-w-20 gap-0.5 rounded-lg px-3 py-1.5 text-center text-[13px]", q?.ok ? "bg-success/20" : q?.given ? "bg-destructive/20" : "bg-muted")}>
                    <span className="font-bold">{n}</span>
                    <span>{q?.ok ? show(q.given) : q?.given ? `${show(q.given)} → ${show(q.right)}` : `– → ${show(q?.right ?? "")}`}</span>
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/exam/take/${examId}?new=1`}>Try again</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/exam">All mock exams</Link>
        </Button>
      </div>
    </main>
  );
}
