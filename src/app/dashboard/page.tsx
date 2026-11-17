import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Flame, Sparkles } from "lucide-react";

import { FormNotice } from "@/components/auth/form-error";
import { FocusCard } from "@/components/dashboard/focus-card";
import { BlurFade } from "@/components/magicui/blur-fade";
import { MotionProvider } from "@/components/magicui/motion-provider";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { MockExamCard, ReadinessCard, TodaysWordsCard, WritingFeedbackCard, type LatestWriting } from "@/components/dashboard/cards";
import { requireUser } from "@/lib/auth/dal";
import { getReadiness } from "@/lib/papers/readiness";
import { getFinishedAttempts, getLastResult, getPaperById, getPapers } from "@/lib/papers/data";
import { getPracticeSets, getSavedWords } from "@/lib/practice/data";
import { practiceStreak } from "@/lib/practice/plan";
import { todayIn } from "@/lib/time";
import { examLabel } from "@/lib/exam/choice";
import { getWritingFeedback } from "@/lib/writing/data";
import { getReviewForStudent } from "@/lib/writing/teacher";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(now: Date, timeZone: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(now),
  );
  if (hour < 12) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const user = await requireUser(["student"]);
  const sp = await props.searchParams;
  const [savedWords, readiness, practice, papers, finished] = await Promise.all([
    getSavedWords(user.id, 5),
    getReadiness(user.id),
    getPracticeSets(user.id),
    getPapers(),
    getFinishedAttempts(user.id, 1),
  ]);
  const streak = practiceStreak(practice.sets.flatMap((x) => x.tracks), todayIn(user.timeZone));

  // Next mock exam: the first free paper (or the first one), with the last score if taken.
  const paper = papers.find((p) => p.is_free) ?? papers[0] ?? null;
  const lastTry = paper ? await getLastResult(user.id, paper.id) : null;
  const mock = paper ? { slug: paper.slug, title: paper.title, last: lastTry?.result ? { id: lastTry.id, total: lastTry.result.total, max: lastTry.result.max } : null } : null;

  // Writing feedback of the latest finished exam: the teacher's score if marked, else the AI estimate.
  let latest: LatestWriting = null;
  const att = finished[0];
  if (att?.result) {
    const [ap, fb, rv] = await Promise.all([getPaperById(att.paper_id), getWritingFeedback(att.id), getReviewForStudent(att.id, user.id)]);
    if (ap) latest = { slug: ap.slug, title: ap.title, attemptId: att.id, words: att.result.writingWords, aiTotal: fb?.total ?? null, teacherTotal: rv?.status === "done" ? rv.total : null, summary: fb?.summary ?? null };
  }
  const firstName = (user.fullName ?? "").trim().split(/\s+/)[0] || "there";

  const now = new Date();
  // The student's own exam (from onboarding). No date given = no countdown.
  const examName = examLabel(user.exam);
  // Calendar days from today (in the student's own time zone) to the exam day.
  const examDate = user.examDate ? new Date(`${user.examDate}T00:00:00Z`) : null;
  const daysLeft = examDate
    ? Math.max(0, Math.round((examDate.getTime() - Date.parse(`${todayIn(user.timeZone, now)}T00:00:00Z`)) / 86_400_000))
    : null;
  const examDay = examDate
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(examDate)
    : null;

  return (
    <MotionProvider>
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {sp.password === "updated" && <FormNotice message="Your password has been changed." />}

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-2">
          <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">
            {greeting(now, user.timeZone)}, {firstName}
          </h1>
          <p className="flex items-center gap-2 text-[15px] text-muted-foreground">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            {daysLeft !== null ? (
              <span>
                Your exam is in <span className="font-semibold text-foreground">
                  <NumberTicker value={daysLeft} /> days
                </span> · {examName},{" "}
                {examDay}
              </span>
            ) : (
              <span>Preparing for: {examName} · no exam date yet</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/daily-practice" className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold hover:bg-muted">
            <Flame className="size-4 text-gold-ink" aria-hidden />
            {streak}-day practice streak
          </Link>
          <Link href="/dashboard/upgrade" className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold hover:bg-muted">
            <Sparkles className="size-4 text-gold-ink" aria-hidden />
            Go Pro
          </Link>
        </div>
      </header>

      {user.focusSkills.length > 0 && (
        <BlurFade delay={0.02}>
          <FocusCard focusSkills={user.focusSkills} exam={user.exam} />
        </BlurFade>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <BlurFade delay={0.05} className="[&>*]:h-full">
          <ReadinessCard data={readiness} />
        </BlurFade>
        <BlurFade delay={0.12} className="xl:col-span-2 [&>*]:h-full">
          <WritingFeedbackCard latest={latest} />
        </BlurFade>
        <BlurFade delay={0.19} className="[&>*]:h-full">
          <MockExamCard mock={mock} />
        </BlurFade>
        <BlurFade delay={0.26} className="md:col-span-2 [&>*]:h-full">
          <TodaysWordsCard saved={savedWords} languages={user.languages} />
        </BlurFade>
      </div>
    </main>
    </MotionProvider>
  );
}
