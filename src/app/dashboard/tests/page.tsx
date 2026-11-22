import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { listMyTests } from "@/lib/tests/data";

export const metadata: Metadata = { title: "Tests" };

export default async function MyTestsPage() {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const tests = await listMyTests(user.id);
  return (
    <main className="mx-auto grid max-w-[960px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-1">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Tests</h1>
        <p className="text-[15px] text-muted-foreground">Chapter tests from your teacher. You see your result as soon as you hand in.</p>
      </header>
      {tests.length === 0 ? (
        <Card className="items-center gap-2 py-10 text-center"><ClipboardCheck className="size-8 text-gold-ink" aria-hidden /><p className="font-semibold">No tests right now</p><p className="text-[14px] text-muted-foreground">When your teacher publishes a test for your batch, it shows up here.</p></Card>
      ) : (
        <ul className="grid gap-3">
          {tests.map((t) => (
            <li key={t.id}>
              <Link href={t.status === "done" ? `/dashboard/tests/${t.id}/result` : `/dashboard/tests/${t.id}`} className="grid gap-1 rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-muted">
                <span className="flex flex-wrap items-center gap-2"><span className="font-bold">{t.title}</span>{t.status === "done" ? <Badge variant="success">Done · {t.pct}%</Badge> : t.status === "in progress" ? <Badge variant="gold">In progress</Badge> : t.closed ? <Badge variant="outline">Closed</Badge> : <Badge variant="gold">New</Badge>}</span>
                <span className="text-[13px] text-muted-foreground">{t.time_limit_min ? `${t.time_limit_min} minutes` : "No time limit"}{t.closes_at ? ` · open until ${new Date(t.closes_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: user.timeZone })}` : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
