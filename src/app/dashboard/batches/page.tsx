import type { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { listMyBatches } from "@/lib/batches/data";

export const metadata: Metadata = { title: "My batches" };

export default async function MyBatchesPage() {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const batches = await listMyBatches(user.id);
  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-1">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">My batches</h1>
        <p className="text-[15px] text-muted-foreground">Your groups with your teacher or school: announcements, classes and material.</p>
      </header>
      {batches.length === 0 ? (
        <Card className="max-w-[720px] items-center gap-2 py-10 text-center">
          <Layers className="size-8 text-gold-ink" aria-hidden />
          <p className="font-semibold">You are not in a batch yet</p>
          <p className="text-[14px] text-muted-foreground">If your teacher or school gave you a code, enter it under <Link href="/dashboard/account" className="underline underline-offset-4">Account</Link>.</p>
        </Card>
      ) : (
        <ul className="grid max-w-[960px] gap-3">
          {batches.map((b) => (
            <li key={b.id}>
              <Link href={`/dashboard/batches/${b.id}`} className="grid gap-1 rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-muted">
                <span className="flex flex-wrap items-center gap-2"><span className="font-bold">{b.name}</span>{b.level && <Badge variant="gold">{b.level}</Badge>}</span>
                <span className="text-[13px] text-muted-foreground">{b.teacherName ? `Teacher: ${b.teacherName}` : ""}</span>
                {b.latest && <span className="mt-1 text-[14px]"><span className="text-muted-foreground">Latest: </span>{b.latest.title}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
