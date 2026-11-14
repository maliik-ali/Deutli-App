import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, Lock } from "lucide-react";

import { ExamCover } from "@/components/exam/exam-cover";
import { SKILL_ICONS } from "@/components/exam/skill-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { EXAM_SKILLS, MOCK_EXAMS, examShortName, getMockExam } from "@/lib/exam/catalog";

export function generateStaticParams() {
  return MOCK_EXAMS.map((e) => ({ examId: e.id }));
}

export async function generateMetadata(props: PageProps<"/dashboard/exam/mock/[examId]">): Promise<Metadata> {
  const exam = getMockExam((await props.params).examId);
  return { title: exam ? `${exam.city} Modellprüfung` : "Mock exam" };
}

export default async function MockExamPage(props: PageProps<"/dashboard/exam/mock/[examId]">) {
  const exam = getMockExam((await props.params).examId);
  if (!exam) notFound();
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const total = EXAM_SKILLS.reduce((sum, s) => sum + s.minutes, 0);

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <Link
        href="/dashboard/exam"
        className="inline-flex w-fit items-center gap-1 rounded-full py-2 pr-3 text-[14px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden /> All mock exams
      </Link>

      <div className="grid items-start gap-8 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:gap-12">
        <ExamCover exam={exam} className="mx-auto mr-auto w-full max-w-[240px] pr-1.5 md:max-w-none" />

        <div className="grid gap-6">
          <div className="grid gap-2">
            <p className="text-[12px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              {examShortName(user.exam)} · B1 ·{" "}
              {exam.free ? <span className="text-success">Free</span> : <span className="text-gold-ink">Premium</span>}
            </p>
            <h1 className="text-[28px] font-extrabold sm:text-[32px]">{exam.city} Modellprüfung</h1>
            <p className="text-muted-foreground">Topics: {exam.topics}</p>
            <Badge className="mt-1">
              <Clock aria-hidden /> About {Math.round((total / 60) * 2) / 2} hours with breaks between parts
            </Badge>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {EXAM_SKILLS.map((s) => {
              const Icon = SKILL_ICONS[s.slug];
              return (
                <li key={s.slug} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="grid">
                    <span className="font-semibold">
                      {s.english} <span className="font-normal text-muted-foreground">· {s.german}</span>
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {s.parts.length} parts · {s.minutes} min
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="grid gap-2 sm:flex sm:items-center sm:gap-4">
            {exam.free ? (
              <Button disabled className="w-full sm:w-auto">
                Start mock exam
              </Button>
            ) : (
              <Button disabled variant="outline" className="w-full sm:w-auto">
                <Lock aria-hidden /> Premium
              </Button>
            )}
            <p className="text-[14px] text-muted-foreground">
              {exam.free
                ? "The timed mock exam opens soon. We'll let you know."
                : "Premium mock exams come with the paid plan."}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
