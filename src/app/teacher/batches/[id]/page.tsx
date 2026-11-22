import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { AddStudents, ArchiveBatch, BatchCode, DeleteAnnouncement, PostAnnouncementForm, RemoveMember } from "@/components/batches/batch-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { getManagedBatch, listAddableStudents, listAnnouncements, listBatchClasses, listBatchMembers } from "@/lib/batches/data";

export const metadata: Metadata = { title: "Batch" };

export default async function TeacherBatchPage(props: PageProps<"/teacher/batches/[id]">) {
  const user = await requireUser(["teacher"]);
  const { id } = await props.params;
  const batch = await getManagedBatch(id, user.id);
  if (!batch) notFound();
  const [members, announcements, addable, classes] = await Promise.all([listBatchMembers(batch.id), listAnnouncements(batch.id), listAddableStudents(batch.teacher_id, batch.id), listBatchClasses(batch.id)]);
  const when = (d: string) => new Date(d).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: user.timeZone });

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <Link href="/teacher/batches" className="inline-flex w-fit items-center gap-1 py-2 pr-3 text-[14px] font-medium text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" aria-hidden /> Batches</Link>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-1">
          <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">{batch.name}</h1>
          <p className="flex flex-wrap items-center gap-2 text-[14px] text-muted-foreground">
            {batch.level && <Badge variant="gold">{batch.level}</Badge>}
            {batch.exam}{batch.starts_on ? ` · from ${batch.starts_on}` : ""}{batch.ends_on ? ` to ${batch.ends_on}` : ""}
            {batch.archived && <Badge variant="outline">Archived</Badge>}
          </p>
        </div>
        <ArchiveBatch batchId={batch.id} archived={batch.archived} />
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <Card>
            <div className="grid gap-1"><CardTitle>Announcements</CardTitle><CardDescription>Students see it in the app and get an email. It is a post, not a chat.</CardDescription></div>
            <PostAnnouncementForm batchId={batch.id} />
            {announcements.length > 0 && (
              <ul className="divide-y divide-border">
                {announcements.map((a) => (
                  <li key={a.id} className="grid gap-1 py-3">
                    <div className="flex items-start justify-between gap-3"><p className="font-semibold">{a.title}</p><DeleteAnnouncement batchId={batch.id} id={a.id} /></div>
                    <p className="text-[12px] text-muted-foreground">{when(a.created_at)}</p>
                    <p className="text-[15px] whitespace-pre-line">{a.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <div className="grid gap-1"><CardTitle>Schedule</CardTitle><CardDescription>Upcoming classes for this batch.</CardDescription></div>
            {classes.length === 0 ? <p className="text-[14px] text-muted-foreground">No classes for this batch yet.</p> : <ul className="divide-y divide-border">{classes.map((c) => <li key={c.id} className="flex justify-between gap-3 py-2.5 text-[15px]"><Link className="font-semibold hover:text-gold-ink" href={`/teacher/classes/${c.id}`}>{c.title}</Link><span className="text-muted-foreground">{when(c.starts_at)}</span></li>)}</ul>}
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline"><Link href={`/teacher/classes/new?batch=${batch.id}`}>New class for this batch</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href={`/teacher/materials?batch=${batch.id}`}>Add material or homework</Link></Button>
            </div>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <div className="grid gap-1"><CardTitle>Students ({members.length})</CardTitle></div>
            {members.length === 0 ? <p className="text-[14px] text-muted-foreground">No students yet.</p> : <ul className="divide-y divide-border">{members.map((m) => <li key={m.id} className="flex items-center justify-between gap-3 py-2"><span>{m.name}</span><RemoveMember batchId={batch.id} studentId={m.id} name={m.name} /></li>)}</ul>}
          </Card>
          <Card>
            <CardTitle>Add your students</CardTitle>
            <AddStudents batchId={batch.id} students={addable} />
          </Card>
          <Card>
            <div className="grid gap-1"><CardTitle>Join with a code</CardTitle><CardDescription>New students can join this batch directly.</CardDescription></div>
            <BatchCode batchId={batch.id} />
          </Card>
        </div>
      </div>
    </main>
  );
}
