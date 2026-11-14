import type { Metadata } from "next";
import Link from "next/link";

import { ExamCard } from "@/components/exam/exam-cover";
import { SKILL_ICONS } from "@/components/exam/skill-icons";
import { requireUser } from "@/lib/auth/dal";
import { MOCK_EXAMS, examShortName, getExamFormat } from "@/lib/exam/catalog";

export const metadata: Metadata = { title: "My B1 Exam" };

export default async function ExamPage() {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const examName = examShortName(user.exam);
  const format = getExamFormat(user.exam);

  return (
    <main className="mx-auto grid max-w-[1240px] gap-8 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-2">
        <h1 className="text-[28px] font-extrabold sm:text-[32px]">My B1 Exam</h1>
        <p className="max-w-2xl text-muted-foreground">
          Full mock exams with all four parts, timed like the real day. Start with the free one, or train one skill
          at a time.
        </p>
      </header>

      <nav aria-label="Train one skill" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {format.skills.map((s) => {
          const Icon = SKILL_ICONS[s.slug];
          return (
            <Link
              key={s.slug}
              href={`/dashboard/exam/${s.slug}`}
              className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:border-gold-ink/60"
            >
              <span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink sm:grid">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="grid min-w-0">
                <span className="font-semibold">{s.english}</span>
                <span className="text-[13px] text-muted-foreground">
                  {s.minutes} min · {s.maxPoints} points
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <section aria-labelledby="mocks" className="grid gap-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="mocks" className="text-xl font-bold">
            Mock exams
          </h2>
          <p className="text-[14px] text-muted-foreground">{MOCK_EXAMS.length} exams</p>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
          {MOCK_EXAMS.map((exam) => (
            <li key={exam.id}>
              <ExamCard exam={exam} examName={examName} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
