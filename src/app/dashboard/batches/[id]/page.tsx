import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { getMyBatch, listAnnouncements, listBatchClasses } from "@/lib/batches/data";

export const metadata: Metadata = { title: "Batch" };

export default async function MyBatchPage(props: PageProps<"/dashboard/batches/[id]">) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const { id } = await props.params;
  const batch = await getMyBatch(id, user.id);
  if (!batch) notFound();
  const [announcements, classes] = await Promise.all([listAnnouncements(batch.id), listBatchClasses(batch.id)]);
  const when = (d: string) => new Date(d).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: user.timeZone });
  return (
    <main className="mx-auto grid max-w-[960px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <Link href="/dashboard/batches" className="inline-flex w-fit items-center gap-1 py-2 pr-3 text-[14px] font-medium text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" aria-hidden /> My batches</Link>
      <header className="grid gap-1">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">{batch.name}</h1>
        <p className="text-[14px] text-muted-foreground">{batch.teacherName ? `Teacher: ${batch.teacherName}` : ""}{batch.level ? ` · ${batch.level}` : ""}</p>
      </header>
      <Card>
        <div className="grid gap-1"><CardTitle>Upcoming classes</CardTitle><CardDescription>Times in your time zone. Open Classes to register and join.</CardDescription></div>
        {classes.length === 0 ? <p className="text-[14px] text-muted-foreground">No classes planned yet.</p> : <ul className="divide-y divide-border">{classes.map((c) => <li key={c.id} className="flex justify-between gap-3 py-2.5 text-[15px]"><Link className="font-semibold hover:text-gold-ink" href={`/dashboard/classes/${c.id}`}>{c.title}</Link><span className="text-muted-foreground">{when(c.starts_at)}</span></li>)}</ul>}
      </Card>
      <Card>
        <CardTitle>Announcements</CardTitle>
        {announcements.length === 0 ? <p className="text-[14px] text-muted-foreground">Nothing posted yet.</p> : (
          <ul className="divide-y divide-border">{announcements.map((a) => <li key={a.id} className="grid gap-1 py-3"><p className="font-semibold">{a.title}</p><p className="text-[12px] text-muted-foreground">{when(a.created_at)}</p><p className="text-[15px] whitespace-pre-line">{a.body}</p></li>)}</ul>
        )}
      </Card>
    </main>
  );
}
