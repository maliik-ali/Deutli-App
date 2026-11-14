import type { Metadata } from "next";
import { CalendarDays, Coins, Flame } from "lucide-react";

import { FormNotice } from "@/components/auth/form-error";
import { BlurFade } from "@/components/magicui/blur-fade";
import { MotionProvider } from "@/components/magicui/motion-provider";
import { NumberTicker } from "@/components/magicui/number-ticker";
import {
  ContinueLearningCard,
  HomeworkFeedbackCard,
  MockExamCard,
  ReadinessCard,
  SpeakingClubCard,
  TodaysWordsCard,
} from "@/components/dashboard/cards";
import { requireUser } from "@/lib/auth/dal";
import { getReadiness } from "@/lib/papers/readiness";
import { getSavedWords } from "@/lib/practice/data";
import { examLabel } from "@/lib/exam/choice";
import { studentStats } from "@/lib/sample-data";

export const metadata: Metadata = { title: "Dashboard" };

function greetingPKT(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Karachi" }).format(now),
  );
  if (hour < 12) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const user = await requireUser(["student"]);
  const sp = await props.searchParams;
  const [savedWords, readiness] = await Promise.all([getSavedWords(user.id, 5), getReadiness(user.id)]);
  const firstName = (user.fullName ?? "").trim().split(/\s+/)[0] || "there";

  const now = new Date();
  // The student's own exam (from onboarding). No date given = no countdown.
  const examName = examLabel(user.exam);
  const examDate = user.examDate ? new Date(`${user.examDate}T09:00:00+05:00`) : null;
  const daysLeft = examDate ? Math.max(0, Math.ceil((examDate.getTime() - now.getTime()) / 86_400_000)) : null;
  const examDay = examDate
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Karachi",
      }).format(examDate)
    : null;

  return (
    <MotionProvider>
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {sp.password === "updated" && <FormNotice message="Your password has been changed." />}

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-2">
          <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">
            {greetingPKT(now)}, {firstName}
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
          <span className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold">
            <Flame className="size-4 text-gold-ink" aria-hidden />
            {studentStats.streakDays}-day streak
          </span>
          <span className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold">
            <Coins className="size-4 text-gold-ink" aria-hidden />
            {studentStats.coins} coins
          </span>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <BlurFade delay={0.05} className="[&>*]:h-full">
          <ReadinessCard data={readiness} />
        </BlurFade>
        <BlurFade delay={0.12} className="xl:col-span-2 [&>*]:h-full">
          <HomeworkFeedbackCard />
        </BlurFade>
        <BlurFade delay={0.19} className="[&>*]:h-full">
          <ContinueLearningCard />
        </BlurFade>
        <BlurFade delay={0.26} className="[&>*]:h-full">
          <SpeakingClubCard />
        </BlurFade>
        <BlurFade delay={0.33} className="md:col-span-2 xl:col-span-1 [&>*]:h-full">
          <MockExamCard />
        </BlurFade>
        <BlurFade delay={0.4} className="md:col-span-2 xl:col-span-3 [&>*]:h-full">
          <TodaysWordsCard saved={savedWords} languages={user.languages} />
        </BlurFade>
      </div>
    </main>
    </MotionProvider>
  );
}
