import type { Metadata } from "next";
import Link from "next/link";
import { PenLine } from "lucide-react";

import { StudentMaterial } from "@/components/materials/material-item";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { listMyHomework } from "@/lib/materials/data";

export const metadata: Metadata = { title: "Homework" };

export default async function HomeworkPage() {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const all = await listMyHomework(user.id);
  const sorted = [...all].sort((a, b) => Number(a.done) - Number(b.done) || (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999"));
  return (
    <main className="mx-auto grid max-w-[960px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-1">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Homework</h1>
        <p className="text-[15px] text-muted-foreground">Homework from your teacher, across all your batches.</p>
      </header>
      {sorted.length === 0 ? (
        <Card className="items-center gap-2 py-10 text-center">
          <PenLine className="size-8 text-gold-ink" aria-hidden />
          <p className="font-semibold">No homework right now</p>
          <p className="text-[14px] text-muted-foreground">When your teacher shares homework with your batch, it shows up here. Not in a batch yet? <Link href="/dashboard/account" className="underline underline-offset-4">Join with a code</Link>.</p>
        </Card>
      ) : (
        <Card><ul className="divide-y divide-border">{sorted.map((m) => <StudentMaterial key={m.id} m={m} done={m.done} />)}</ul></Card>
      )}
    </main>
  );
}
