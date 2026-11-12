import type { Metadata } from "next";
import { CalendarDays, Coins, Flame } from "lucide-react";

import { FormNotice } from "@/components/auth/form-error";
import {
  ContinueLearningCard,
  HomeworkFeedbackCard,
  MockExamCard,
  ReadinessCard,
  SpeakingClubCard,
  TodaysWordsCard,
} from "@/components/dashboard/cards";
import { requireUser } from "@/lib/auth/dal";
import { getSavedWords } from "@/lib/practice/data";
import { studentStats } from "@/lib/sample-data";

export const metadata: Metadata = { title: "Dashboard" };

function greetingPKT(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Karachi" }).format(now)
  );
  if (hour < 12) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const user = await requireUser(["student"]);
  const sp = await props.searchParams;
  const savedWords = await getSavedWords(user.id, 5);
  const firstName = (user.fullName ?? "").trim().split(/\s+/)[0] || "there";

  const now = new Date();
  const examDate = new Date(studentStats.exam.date);
  const daysLeft = Math.max(0, Math.ceil((examDate.getTime() - now.getTime()) / 86_400_000));
  const examDay = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  }).format(examDate);

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {sp.password === "updated" && <FormNotice message="Your password has been changed." />}

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-2">
          <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">
            {greetingPKT(now)}, {firstName}
          </h1>
          <p className="flex items-center gap-2 text-[15px] text-muted-foreground">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            <span>
              Your B1 exam is in <span className="font-semibold text-foreground">{daysLeft} days</span> ·{" "}
              {studentStats.exam.name}, {examDay}
            </span>
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
        <ReadinessCard />
        <HomeworkFeedbackCard className="xl:col-span-2" />
        <ContinueLearningCard />
        <SpeakingClubCard />
        <MockExamCard className="md:col-span-2 xl:col-span-1" />
        <TodaysWordsCard className="md:col-span-2 xl:col-span-3" saved={savedWords} languages={user.languages} />
      </div>
    </main>
  );
}
