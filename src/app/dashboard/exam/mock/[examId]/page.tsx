import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, Lock, Sparkles } from "lucide-react";

import { ExamCover } from "@/components/exam/exam-cover";
import { SKILL_ICONS } from "@/components/exam/skill-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasPro, requireUser } from "@/lib/auth/dal";
import { getActivePlans, getFxRates } from "@/lib/pro/data";
import { fromLabel, getDisplayCurrency } from "@/lib/pro/display";
import { examShortName, getExamFormat } from "@/lib/exam/catalog";
import { getLastResult, getPaperBySlug } from "@/lib/papers/data";
import { listMocks } from "@/lib/papers/mocks";

export async function generateMetadata(props: PageProps<"/dashboard/exam/mock/[examId]">): Promise<Metadata> {
  const { examId } = await props.params;
  const exam = (await listMocks()).mocks.find((m) => m.id === examId);
  return { title: exam ? `${exam.city} Modellprüfung` : "Mock exam" };
}

export default async function MockExamPage(props: PageProps<"/dashboard/exam/mock/[examId]">) {
  const examId = (await props.params).examId;
  const exam = (await listMocks()).mocks.find((m) => m.id === examId);
  if (!exam) notFound();
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const [activePlans, rates] = await Promise.all([getActivePlans(), getFxRates()]);
  const from = fromLabel(activePlans, await getDisplayCurrency(user.timeZone, rates), rates);
  const paper = await getPaperBySlug(examId);
  const last = paper ? await getLastResult(user.id, paper.id) : null;
  const skills = getExamFormat(user.exam).skills;
  const total = skills.reduce((sum, s) => sum + s.minutes, 0);

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
              {!paper ? <span className="text-subtle-foreground">Coming soon</span> : exam.free ? <span className="text-success">Free</span> : <span className="text-gold-ink">Premium</span>}
            </p>
            <h1 className="text-[28px] font-extrabold sm:text-[32px]">{exam.city} Modellprüfung</h1>
            <p className="text-muted-foreground">Topics: {exam.topics}</p>
            <Badge className="mt-1">
              <Clock aria-hidden /> About {Math.round((total / 60) * 2) / 2} hours with breaks between parts
            </Badge>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {skills.map((s) => {
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
                      {s.parts.length === 1 ? "1 task" : `${s.parts.length} parts`} · {s.minutes} min
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          {last?.result && (
            <p className="rounded-2xl border border-border bg-card px-5 py-4 text-[15px]">
              Your last try: <strong>{last.result.total}</strong> of {last.result.max} points (writing not counted).{" "}
              <Link href={`/dashboard/exam/mock/${examId}/result?a=${last.id}`} className="font-semibold text-gold-ink hover:underline">
                See your answers
              </Link>
            </p>
          )}

          <div className="grid gap-2 sm:flex sm:items-center sm:gap-4">
            {!paper ? (
              // Not uploaded yet: offer Pro (it unlocks this mock the day it's published), but stay honest that it's not ready.
              !exam.free && !hasPro(user) ? (
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/dashboard/upgrade">
                    <Sparkles aria-hidden /> Go Pro{from ? ` · ${from}` : ""}
                  </Link>
                </Button>
              ) : null
            ) : paper.is_free || hasPro(user) ? (
              <Button asChild className="w-full sm:w-auto">
                <Link href={`/exam/take/${examId}`}>Start mock exam</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/dashboard/upgrade">
                  <Lock aria-hidden /> Unlock with Pro{from ? ` · ${from}` : ""}
                </Link>
              </Button>
            )}
            <p className="text-[14px] text-muted-foreground">
              {!paper
                ? exam.free
                  ? "This mock exam is not ready yet. Try the free Hamburg paper in the meantime."
                  : hasPro(user)
                    ? `You have Pro: ${exam.city} unlocks for you the day it's published.`
                    : `${exam.city} is coming soon. Pro unlocks it the day it's published, plus every premium mock exam.`
                : paper.is_free
                  ? "Solve the real paper on screen. Your answers are saved as you go."
                  : "Premium mock exams come with Deutli Pro. Tell us you are interested and we will contact you."}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
