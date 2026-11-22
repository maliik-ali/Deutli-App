import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronLeft, X } from "lucide-react";

import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { getStudentResult } from "@/lib/tests/data";

export const metadata: Metadata = { title: "Test result" };

export default async function TestResultPage(props: PageProps<"/dashboard/tests/[id]/result">) {
  const user = await requireUser(["student"]);
  const { id } = await props.params;
  const r = await getStudentResult(id, user.id);
  if (!r) notFound();
  const pct = r.max ? Math.round((r.score / r.max) * 100) : 0;
  const show = (v: number | boolean | string | string[] | null, q: { kind: string; options: string[] }) => {
    if (v === null || v === undefined || v === "") return "No answer";
    if (q.kind === "mc") return typeof v === "number" ? (q.options[v] ?? "–") : "–";
    if (q.kind === "tf") return v === true ? "True" : "False";
    return Array.isArray(v) ? v.join(" / ") : String(v);
  };
  return (
    <main className="mx-auto grid max-w-[860px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <Link href="/dashboard/tests" className="inline-flex w-fit items-center gap-1 py-2 pr-3 text-[14px] font-medium text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" aria-hidden /> Tests</Link>
      <Card className="gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">{r.title}</h1>
        <p className="text-5xl font-extrabold">{r.score} <span className="text-2xl text-muted-foreground">/ {r.max}</span></p>
        <p className="text-muted-foreground">{pct}% correct</p>
      </Card>
      <ol className="grid gap-3">
        {r.questions.map((q, i) => (
          <li key={q.id} className="grid gap-2 rounded-2xl border border-border bg-card p-5">
            <p className="flex items-start gap-2 font-semibold">{q.ok ? <Check className="mt-0.5 size-5 shrink-0 text-success" aria-label="Correct" /> : <X className="mt-0.5 size-5 shrink-0 text-destructive" aria-label="Wrong" />}<span><span className="text-muted-foreground">{i + 1}. </span>{q.prompt}</span></p>
            <p className="text-[14px]"><span className="text-muted-foreground">Your answer: </span>{show(q.given, q)}</p>
            {!q.ok && <p className="text-[14px]"><span className="text-muted-foreground">Correct: </span><span className="font-semibold">{show(q.answer, q)}</span></p>}
          </li>
        ))}
      </ol>
    </main>
  );
}
