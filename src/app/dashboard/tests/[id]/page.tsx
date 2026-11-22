import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { StartTestButton } from "@/components/tests/start-button";
import { TestPlayer } from "@/components/tests/test-player";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { getStudentTest } from "@/lib/tests/data";

export const metadata: Metadata = { title: "Test" };

export default async function TakeTestPage(props: PageProps<"/dashboard/tests/[id]">) {
  const user = await requireUser(["student"]);
  const { id } = await props.params;
  const take = (await props.searchParams).take;
  const t = await getStudentTest(id, user.id);
  if (!t) notFound();
  const back = <Link href="/dashboard/tests" className="inline-flex w-fit items-center gap-1 py-2 pr-3 text-[14px] font-medium text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" aria-hidden /> Tests</Link>;
  if ("reason" in t) return <main className="mx-auto grid max-w-[760px] gap-4 px-4 py-6 sm:px-6 md:px-8">{back}<Card><p className="font-semibold">{t.reason}</p></Card></main>;
  if (t.attempt?.submitted_at) redirect(`/dashboard/tests/${id}/result`);

  const running = !!t.attempt && typeof take === "string" && take === t.attempt.id;
  const deadline = t.attempt && t.test.time_limit_min ? new Date(t.attempt.started_at).getTime() + t.test.time_limit_min * 60_000 : null;
  return (
    <main className="mx-auto grid max-w-[860px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      {back}
      {running && t.attempt ? (
        <TestPlayer testId={id} attemptId={t.attempt.id} title={t.test.title} questions={t.questions.map((q) => ({ id: q.id, kind: q.kind, prompt: q.prompt, options: q.options, points: q.points }))} initial={t.attempt.answers ?? {}} deadlineMs={deadline} />
      ) : (
        <Card className="gap-4">
          <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">{t.test.title}</h1>
          {t.test.instructions && <p className="whitespace-pre-line text-[15px]">{t.test.instructions}</p>}
          <p className="text-[14px] text-muted-foreground">{t.questions.length} questions{t.test.time_limit_min ? ` · ${t.test.time_limit_min} minutes. The timer starts when you press the button and cannot be paused.` : " · no time limit"}. Your answers are saved as you go. You can take the test once.</p>
          <StartTestButton testId={id} resume={!!t.attempt} />
        </Card>
      )}
    </main>
  );
}
