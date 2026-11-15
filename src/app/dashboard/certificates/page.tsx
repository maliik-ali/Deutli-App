import type { Metadata } from "next";
import Link from "next/link";
import { Award } from "lucide-react";

import { PracticeCertificate } from "@/components/exam/practice-certificate";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { certDate, certScores } from "@/lib/papers/certificate";
import { getFinishedAttempts, getPaperById } from "@/lib/papers/data";
import { getWritingFeedback } from "@/lib/writing/data";
import { getReviewForStudent } from "@/lib/writing/teacher";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Certificates" };

export default async function CertificatesPage(props: PageProps<"/dashboard/certificates">) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const attempts = (await getFinishedAttempts(user.id, 10)).filter((a) => a.result);
  const chosen = attempts.find((a) => a.id === sp.a) ?? attempts[0];

  let content: React.ReactNode;
  if (!chosen) {
    content = (
      <Card className="items-center py-14 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-gold-soft text-gold-ink">
          <Award className="size-7" aria-hidden />
        </span>
        <div className="grid gap-2">
          <h2 className="text-lg font-bold">Your certificate is waiting</h2>
          <p className="max-w-sm text-muted-foreground">Finish a mock exam and your practice certificate appears here, with your name and your real scores.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/exam">Start a mock exam</Link>
        </Button>
      </Card>
    );
  } else {
    const paper = await getPaperById(chosen.paper_id);
    const [review, feedback] = await Promise.all([getReviewForStudent(chosen.id, user.id), getWritingFeedback(chosen.id)]);
    const scores = paper && chosen.result ? certScores({ name: user.fullName, title: paper.title, structure: paper.structure, result: chosen.result, date: certDate(chosen.submitted_at ?? chosen.started_at), review, feedback }) : null;
    const titles = new Map<string, string>();
    for (const a of attempts) if (!titles.has(a.paper_id)) titles.set(a.paper_id, (await getPaperById(a.paper_id))?.title ?? "Mock exam");
    content = (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {scores && <PracticeCertificate s={scores} />}
        <Card>
          <div className="grid gap-1">
            <CardTitle>Your results</CardTitle>
            <CardDescription>Pick a result to see its certificate.</CardDescription>
          </div>
          <ul className="grid gap-1">
            {attempts.map((a) => (
              <li key={a.id}>
                <Link href={`/dashboard/certificates?a=${a.id}`} aria-current={a.id === chosen.id ? "true" : undefined} className={cn("flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 py-2 text-[14px] transition-colors", a.id === chosen.id ? "bg-gold-soft font-semibold" : "hover:bg-muted")}>
                  <span>
                    {titles.get(a.paper_id)}
                    <span className="block text-[12px] font-normal text-muted-foreground">{certDate(a.submitted_at ?? a.started_at)}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {a.result?.total}/{a.result?.max}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  }

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="grid gap-1">
        <h1 className="text-[28px] font-extrabold sm:text-[32px]">Certificates</h1>
        <p className="text-muted-foreground">A preview of how your result looks on a real telc B1 certificate. This is a Deutli practice sample, not an official certificate.</p>
      </div>
      {content}
    </main>
  );
}
