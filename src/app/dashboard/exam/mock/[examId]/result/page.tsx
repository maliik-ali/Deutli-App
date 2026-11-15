import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { AnswersTable, type PartDots } from "@/components/exam/answers-table";
import { DifficultySurvey } from "@/components/exam/difficulty-survey";
import { Celebration } from "@/components/exam/celebration";
import { CertificateCard } from "@/components/exam/certificate-card";
import { ScoreHero } from "@/components/exam/score-hero";
import { TeacherCheckCard } from "@/components/exam/teacher-check-card";
import { WritingResult } from "@/components/exam/writing-feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { certDate, certScores } from "@/lib/papers/certificate";
import { getAttempt, getPaperById } from "@/lib/papers/data";
import { SECTIONS, WRITTEN_MAX, WRITTEN_PASS, partQuestions } from "@/lib/papers/template";
import { getWritingFeedback } from "@/lib/writing/data";
import { getReviewForStudent, getTeacherName } from "@/lib/writing/teacher";

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
  const { data: fb } = await (await createClient()).from("mock_feedback").select("difficulty").eq("attempt_id", attempt.id).maybeSingle();

  const pct = r.max ? r.total / r.max : 0;
  // Effort: how many questions got an answer. Mostly blank = the student skipped / did not try.
  const questions = Object.values(r.review);
  const answeredCount = questions.filter((q) => q.given).length;
  const skipped = questions.length > 0 && answeredCount / questions.length < 0.5;

  const scores = certScores({ name: user.fullName, title: paper.title, structure: paper.structure, result: r, date: certDate(attempt.submitted_at ?? attempt.started_at), review, feedback });
  const skills = [
    { label: "Lesen", ...scores.lesen },
    { label: "Sprachbausteine", ...scores.sprach },
    { label: "Hören", ...scores.hoeren },
  ];

  const dots: PartDots[] = parts
    .filter((p) => p.kind !== "write")
    .map((p) => ({
      id: p.id,
      title: `${SECTIONS.find((s) => s.id === p.section)?.title} · ${p.title}`,
      got: r.parts.find((x) => x.id === p.id)?.correct ?? 0,
      count: p.count,
      rows: partQuestions(p).map((n) => {
        const q = r.review[String(n)];
        return { n, part: `${SECTIONS.find((s) => s.id === p.section)?.title} · ${p.title}`, given: q?.given ?? null, right: q?.right ?? "", ok: !!q?.ok };
      }),
    }));

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {!skipped && <Celebration attemptId={attempt.id} level={pct >= 0.85 ? 2 : 1} />}
      <Link href={`/dashboard/exam/mock/${examId}`} className="inline-flex w-fit items-center gap-1 py-2 pr-3 text-[14px] font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden /> {paper.title}
      </Link>
      <p className="-mb-3 text-[12px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">telc B1 · {paper.title}</p>

      <ScoreHero
        skipped={skipped}
        left={questions.length - answeredCount}
        total={r.total}
        max={r.max}
        passLine={Math.round(r.max * 0.6)}
        skills={skills}
        caption={`Reading, grammar and listening. The pass line is ${Math.round(r.max * 0.6)}. The telc written exam has ${WRITTEN_MAX} points including 45 for writing, and you pass with ${WRITTEN_PASS}.`}
      />

      {skipped && (
        <Card className="flex-row flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-[15px]">Take it again when you are ready. Even a quick second try will show you how much you already know.</p>
          <Button asChild>
            <Link href={`/exam/take/${examId}?new=1`}>Try again</Link>
          </Button>
        </Card>
      )}

      <WritingResult
        attemptId={attempt.id}
        text={attempt.writing}
        words={r.writingWords}
        initial={feedback}
        canCheck={!hasTeacher}
        teacher={<TeacherCheckCard attemptId={attempt.id} words={r.writingWords} hasTeacher={hasTeacher} teacherName={teacherName} review={review} />}
        certificate={<CertificateCard attemptId={attempt.id} scores={scores} />}
      />

      <AnswersTable parts={dots} />

      <DifficultySurvey attemptId={attempt.id} initial={fb?.difficulty ?? null} />

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
