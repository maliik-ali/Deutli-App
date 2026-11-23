import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { TestButtons } from "@/components/tests/test-admin-buttons";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { getManagedTest, getTestResults } from "@/lib/tests/data";

export const metadata: Metadata = { title: "Test results" };

export default async function TeacherTestPage(props: PageProps<"/teacher/tests/[id]">) {
  const user = await requireUser(["teacher"]);
  const { id } = await props.params;
  const m = await getManagedTest(id, user.id);
  if (!m) notFound();
  const res = await getTestResults(id);
  const submitted = res.students.filter((s) => s.status === "submitted");
  return (
    <main className="mx-auto grid max-w-[960px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <Link href="/teacher/tests" className="inline-flex w-fit items-center gap-1 py-2 pr-3 text-[14px] font-medium text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" aria-hidden /> Chapter tests</Link>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1">
          <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">{m.test.title}</h1>
          <p className="flex flex-wrap items-center gap-2 text-[14px] text-muted-foreground"><Badge variant={m.test.published ? "success" : "outline"}>{m.test.published ? "Published" : "Draft"}</Badge>{m.questions.length} {m.questions.length === 1 ? "question" : "questions"}{m.test.time_limit_min ? ` · ${m.test.time_limit_min} min` : ""}</p>
        </div>
        <TestButtons id={m.test.id} published={m.test.published} />
      </header>
      <Card>
        <div className="grid gap-1"><CardTitle>Results per student ({submitted.length} of {res.students.length} handed in)</CardTitle></div>
        {res.students.length === 0 ? <p className="text-[14px] text-muted-foreground">No students yet. Share the test with a batch that has students.</p> : (
          <ul className="divide-y divide-border">{res.students.map((s) => <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-[15px]"><Link href={`/teacher/students/${s.id}`} className="hover:text-gold-ink">{s.name}</Link>{s.status === "submitted" ? <span className="font-semibold">{s.score} / {s.max}</span> : <span className="text-[13px] text-muted-foreground">{s.status}</span>}</li>)}</ul>
        )}
      </Card>
      <Card>
        <div className="grid gap-1"><CardTitle>Per question</CardTitle><CardDescription>The share of students who got each question right.</CardDescription></div>
        <ol className="grid gap-3">
          {m.questions.map((q, i) => {
            const pct = res.perQuestion.get(q.id);
            return (
              <li key={q.id} className="grid gap-1.5">
                <div className="flex justify-between gap-3 text-[14px]"><span><span className="text-muted-foreground">{i + 1}. </span>{q.prompt}</span><span className="shrink-0 font-semibold">{pct == null ? "–" : `${pct}%`}</span></div>
                {pct != null && <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Question ${i + 1} correct`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className={`h-full rounded-full ${pct < 50 ? "bg-gold" : "bg-brand-cyan"}`} style={{ width: `${pct}%` }} /></div>}
              </li>
            );
          })}
        </ol>
      </Card>
    </main>
  );
}
