import type { Metadata } from "next";
import Link from "next/link";

import { InviteStudentsToggle } from "@/components/students/invite-form";
import { Card } from "@/components/ui/card";
import { getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { listTeacherBatches } from "@/lib/batches/data";
import { getTeacherData } from "@/lib/teachers/data";

export const metadata: Metadata = { title: "My students" };

export default async function StudentsPage() {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const isAdmin = user.role !== "teacher";
  const data = await getTeacherData(user.id, isAdmin);

  let batches: { id: string; name: string }[] = [];
  if (!isAdmin) {
    const ws = await getMyWorkspace(user.id);
    if (ws) batches = (await listTeacherBatches(user.id, ws.workspace.id, ws.role !== "teacher")).filter((b) => !b.archived).map((b) => ({ id: b.id, name: b.name }));
  }

  const rows = data.students.map((s) => {
    const mine = data.mine.filter((r) => r.student_id === s.id);
    const done = mine.filter((r) => r.status === "done" && r.total != null);
    const waiting = mine.filter((r) => r.status === "requested");
    const last = done[0]?.total ?? null; // newest first
    return { ...s, waiting: waiting[0]?.id ?? null, waitingCount: waiting.length, checked: done.length, last };
  });

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-3xl font-extrabold">My students</h1>
        <p className="text-muted-foreground">
          {isAdmin ? "Assign students to teachers in the Admin panel." : "Students assigned to you by the academy, or who sent you their email with your code."}
        </p>
      </div>
      {isAdmin ? (
        <Card className="p-6">
          <Link href="/admin/teachers" className="font-medium text-gold-ink">
            Open Teachers and students
          </Link>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="gap-4 p-6">
          <div className="grid gap-1">
            <p className="font-semibold">No students yet</p>
            <p className="text-[14px] text-muted-foreground">Invite them by email, or give them your join code from the <Link href="/teacher" className="font-medium text-gold-ink">Overview page</Link>.</p>
          </div>
          <InviteStudentsToggle batches={batches} defaultOpen />
        </Card>
      ) : (
        <Card className="p-2 sm:p-4">
          <div className="px-3 pt-3 sm:pt-1"><InviteStudentsToggle batches={batches} defaultOpen={false} /></div>
          <ul className="divide-y divide-border">
            {rows.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                <span>
                  <Link href={`/teacher/students/${s.id}`} className="font-semibold hover:text-gold-ink">{s.name}</Link>
                  <span className="block text-[13px] text-muted-foreground">
                    {s.checked} checked{s.last != null ? ` · last score ${s.last} / 45` : ""}
                  </span>
                </span>
                {s.waiting ? (
                  <Link href={`/teacher/review/${s.waiting}`} className="inline-flex h-9 items-center rounded-full bg-gold-soft px-4 text-[14px] font-semibold">
                    {s.waitingCount} to check
                  </Link>
                ) : (
                  <span className="text-[13px] text-muted-foreground">Nothing waiting</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}
