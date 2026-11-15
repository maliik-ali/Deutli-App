import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Celebration } from "@/components/exam/celebration";
import { PracticeCertificate } from "@/components/exam/practice-certificate";
import { ScoreHero } from "@/components/exam/score-hero";
import { BlurFade } from "@/components/magicui/blur-fade";
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
  const pct = r.max ? r.total / r.max : 0;
  const sum = (section: string) => {
    const ids = parts.filter((p) => p.section === section).map((p) => p.id);
    const rows = r.parts.filter((x) => ids.includes(x.id));
    return { got: rows.reduce((a, x) => a + x.points, 0), max: rows.reduce((a, x) => a + x.max, 0) };
  };
  const lesen = sum("lesen");
  const sprach = sum("sprachbausteine");
  const hoeren = sum("hoeren");
  const skills = [
    { label: "Lesen", ...lesen },
    { label: "Sprachbausteine", ...sprach },
    { label: "Hören", ...hoeren },
  ];
  // Writing score on the certificate: the teacher's if marked, else the AI estimate, else nothing yet.
  const writingScore = review?.status === "done" && review.total != null ? review.total : (feedback?.total ?? null);
  const writingBy = review?.status === "done" && review.total != null ? ("teacher" as const) : feedback ? ("ai" as const) : null;
  const when = new Date(attempt.submitted_at ?? attempt.started_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Karachi" });

  return (
    <main className="mx-auto grid max-w-[820px] gap-6 px-4 py-6 sm:px-6 md:py-8">
      <Link href={`/dashboard/exam/mock/${examId}`} className="inline-flex w-fit items-center gap-1 py-2 pr-3 text-[14px] font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden /> {paper.title}
      </Link>

      {pct >= 0.6 && <Celebration attemptId={attempt.id} level={pct >= 0.85 ? 2 : 1} />}
      <p className="text-[12px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">telc B1 · {paper.title}</p>
      <ScoreHero total={r.total} max={r.max} passLine={Math.round(r.max * 0.6)} caption={`Reading, grammar and listening. The pass line is ${Math.round(r.max * 0.6)}. Your email (${r.writingWords} words) is marked separately below: the telc written exam has ${WRITTEN_MAX} points including 45 for writing, and you pass with ${WRITTEN_PASS}.`} />

      <div className="grid gap-3 sm:grid-cols-3">
        {skills.map((k, i) => (
          <BlurFade key={k.label} delay={0.08 * i}>
            <Card className="grid gap-2 p-4">
              <p className="text-[12px] font-semibold tracking-[0.1em] text-subtle-foreground uppercase">{k.label}</p>
              <p className="text-2xl font-extrabold tabular-nums">
                {k.got}
                <span className="text-base font-semibold text-muted-foreground"> / {k.max}</span>
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
                <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${k.max ? Math.round((k.got / k.max) * 100) : 0}%` }} />
              </div>
            </Card>
          </BlurFade>
        ))}
      </div>

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

      <section aria-label="Sample certificate" className="grid gap-3">
        <h2 className="text-xl font-extrabold">Your certificate preview</h2>
        <PracticeCertificate s={{ name: user.fullName ?? "Your name", examTitle: paper.title, date: when, lesen, sprach, hoeren, writing: writingScore, writingBy }} />
      </section>

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
