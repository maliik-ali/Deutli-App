import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { canSeeStudent, getStudentOverview } from "@/lib/teachers/student";

export const metadata: Metadata = { title: "Student" };

export default async function TeacherStudentPage(props: PageProps<"/teacher/students/[id]">) {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const { id } = await props.params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !(await canSeeStudent(user.id, user.role, id))) notFound();
  const o = await getStudentOverview(id, { id: user.id, isAdmin: user.role !== "teacher" });
  if (!o) notFound();
  const day = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: user.timeZone });

  return (
    <main className="mx-auto grid max-w-[960px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <Link href="/teacher/students" className="inline-flex w-fit items-center gap-1 py-2 pr-3 text-[14px] font-medium text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" aria-hidden /> My students</Link>
      <header className="grid gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">{o.name}</h1>
        <p className="flex flex-wrap items-center gap-2 text-[14px] text-muted-foreground">
          {o.batches.length === 0 ? "Not in a batch" : o.batches.map((b) => <Link key={b.id} href={`/teacher/batches/${b.id}`}><Badge variant="outline">{b.name}</Badge></Link>)}
          {o.homework.total > 0 && <span>· Homework done: {o.homework.done} of {o.homework.total}</span>}
        </p>
      </header>

      <Card>
        <div className="grid gap-1"><CardTitle>Exam readiness</CardTitle><CardDescription>{o.readiness.exams === 0 ? "No finished mock exam yet." : `From ${o.readiness.exams} finished mock exam${o.readiness.exams === 1 ? "" : "s"}. Writing and speaking are not marked automatically.`}</CardDescription></div>
        {o.readiness.overall != null && <p className="text-4xl font-extrabold">{o.readiness.overall}%</p>}
        <ul className="grid gap-3 sm:grid-cols-2">
          {o.readiness.skills.map((s) => (
            <li key={s.key} className="grid gap-1.5">
              <div className="flex justify-between text-[14px]"><span>{s.name} <span className="text-muted-foreground">({s.english})</span></span><span className="font-semibold">{s.value == null ? "not marked" : `${s.value}%`}</span></div>
              {s.value != null && <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={s.name} aria-valuenow={s.value} aria-valuemin={0} aria-valuemax={100}><div className={`h-full rounded-full ${o.readiness.focusKey === s.key ? "bg-gold" : "bg-brand-cyan"}`} style={{ width: `${s.value}%` }} /></div>}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>Mock exams</CardTitle>
        {o.attempts.length === 0 ? <p className="text-[14px] text-muted-foreground">Nothing finished yet.</p> : (
          <ul className="divide-y divide-border">{o.attempts.map((a) => <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-[15px]"><span><span className="font-semibold">{a.title}</span> <span className="text-muted-foreground">· {day(a.submittedAt)}</span></span><span className="font-semibold">{a.total} / {a.max}</span></li>)}</ul>
        )}
      </Card>

      <Card>
        <CardTitle>Chapter tests</CardTitle>
        {o.chapterTests.length === 0 ? (
          <p className="text-[14px] text-muted-foreground">No chapter test handed in yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {o.chapterTests.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
                <span>
                  <span className="font-semibold">{t.title}</span> <span className="text-muted-foreground">· {day(t.submittedAt)}</span>
                </span>
                <span className="font-semibold">{t.score} / {t.max}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>Writing</CardTitle>
        {o.writing.length === 0 ? <p className="text-[14px] text-muted-foreground">No writing sent yet.</p> : (
          <ul className="divide-y divide-border">{o.writing.map((w) => <li key={w.id} className="flex items-center justify-between gap-3 py-2.5 text-[15px]"><span>{day(w.createdAt)}{w.teacherName ? <span className="text-muted-foreground"> · {w.teacherName}</span> : null}</span>{w.status === "done" ? <Badge variant="success">Checked · {w.total} / 45</Badge> : <Link href={`/teacher/review/${w.id}`}><Badge variant="gold">To check</Badge></Link>}</li>)}</ul>
        )}
      </Card>
    </main>
  );
}
