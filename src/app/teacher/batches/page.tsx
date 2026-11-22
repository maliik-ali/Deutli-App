import type { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";

import { NewBatchForm } from "@/components/batches/batch-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { listTeacherBatches } from "@/lib/batches/data";

export const metadata: Metadata = { title: "Batches" };

export default async function TeacherBatchesPage() {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const ws = user.role === "teacher" ? await getMyWorkspace(user.id) : null;
  const batches = ws ? await listTeacherBatches(user.id, ws.workspace.id, ws.role !== "teacher") : [];
  const active = batches.filter((b) => !b.archived);
  const archived = batches.filter((b) => b.archived);

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-1">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Batches</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">A batch is one group of students. Post announcements, share material and run classes for them, instead of a WhatsApp group.</p>
      </header>
      {!ws ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted-foreground">Batches belong to a teacher&apos;s workspace. Admins can see all workspaces under Workspaces.</p>
      ) : (
        <>
          <Card className="max-w-[960px]">
            <div className="grid gap-1"><CardTitle>New batch</CardTitle><CardDescription>You add students after you create it, or students join with a batch code.</CardDescription></div>
            <NewBatchForm />
          </Card>
          <Card className="max-w-[960px]">
            <CardTitle>Your batches ({active.length})</CardTitle>
            {active.length === 0 ? (
              <p className="text-[14px] text-muted-foreground">No batches yet. Create your first one above.</p>
            ) : (
              <ul className="divide-y divide-border">
                {active.map((b) => (
                  <li key={b.id}>
                    <Link href={`/teacher/batches/${b.id}`} className="flex min-h-14 flex-wrap items-center justify-between gap-2 py-3 hover:text-gold-ink">
                      <span className="flex items-center gap-3"><Layers className="size-5 text-gold-ink" aria-hidden /><span className="font-semibold">{b.name}</span></span>
                      <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
                        {b.level && <Badge variant="gold">{b.level}</Badge>}
                        {b.students} student{b.students === 1 ? "" : "s"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {archived.length > 0 && (
              <details className="text-[14px] text-muted-foreground">
                <summary className="min-h-11 cursor-pointer py-3">Archived ({archived.length})</summary>
                <ul className="divide-y divide-border">{archived.map((b) => <li key={b.id}><Link className="block py-3 hover:text-foreground" href={`/teacher/batches/${b.id}`}>{b.name}</Link></li>)}</ul>
              </details>
            )}
          </Card>
        </>
      )}
    </main>
  );
}
