import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { listTeacherTests } from "@/lib/tests/data";

export const metadata: Metadata = { title: "Chapter tests" };

export default async function TeacherTestsPage() {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const ws = user.role === "teacher" ? await getMyWorkspace(user.id) : null;
  const tests = ws ? await listTeacherTests(user.id, ws.workspace.id, ws.role !== "teacher") : [];
  return (
    <main className="mx-auto grid max-w-[960px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-1">
          <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Chapter tests</h1>
          <p className="max-w-xl text-[15px] text-muted-foreground">Tests your students take on Deutli, marked automatically. You see the result per student and per question.</p>
        </div>
        {ws && <Button asChild size="lg"><Link href="/teacher/tests/new"><Plus aria-hidden /> New test</Link></Button>}
      </header>
      {!ws ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted-foreground">Tests belong to a teacher&apos;s workspace.</p>
      ) : tests.length === 0 ? (
        <Card className="items-center gap-2 py-10 text-center"><p className="font-semibold">No tests yet</p><p className="text-[14px] text-muted-foreground">Create a test with multiple choice, true or false and fill-in-the-blank questions.</p></Card>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {tests.map((t) => (
              <li key={t.id}>
                <Link href={`/teacher/tests/${t.id}`} className="flex min-h-14 flex-wrap items-center justify-between gap-2 py-3 hover:text-gold-ink">
                  <span className="grid gap-0.5"><span className="font-semibold">{t.title}</span><span className="text-[13px] text-muted-foreground">{t.batches.join(", ") || "No batch"}</span></span>
                  <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                    <Badge variant={t.published ? "success" : "outline"}>{t.published ? "Published" : "Draft"}</Badge>
                    {t.submitted} handed in{t.avgPct != null ? ` · average ${t.avgPct}%` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}
