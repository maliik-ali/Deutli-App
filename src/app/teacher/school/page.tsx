import type { Metadata } from "next";
import Link from "next/link";

import { UsageMeter } from "@/components/academies/usage-meter";
import { AddTeacherForm, BulkStudentsForm, RemoveTeacher } from "@/components/school/school-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getMyWorkspace } from "@/lib/academies/data";
import { requireUser } from "@/lib/auth/dal";
import { getSchoolOverview } from "@/lib/school/data";

export const metadata: Metadata = { title: "My school" };

export default async function SchoolPage() {
  const user = await requireUser(["teacher"]);
  const ws = await getMyWorkspace(user.id);
  const allowed = !!ws && ws.workspace.kind === "school" && ws.role !== "teacher";
  const o = allowed ? await getSchoolOverview(ws.workspace.id, ws.workspace.plan_id) : null;
  const pct = (n: number | null) => (n == null ? "–" : `${n}%`);

  return (
    <main className="mx-auto grid max-w-[1100px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-1">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">{ws?.workspace.name ?? "My school"}</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">Teachers, students and reports across all batches.</p>
      </header>
      {!o || !ws ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted-foreground">The school tools are for the owner or an admin of a school workspace.</p>
      ) : (
        <>
          <Card className="grid gap-4 sm:grid-cols-2">
            <UsageMeter label="Students" used={o.students} limit={o.maxStudents} />
            <UsageMeter label="Teachers" used={o.teachers.length} limit={o.maxTeachers} />
          </Card>

          <Card>
            <div className="grid gap-1"><CardTitle>Reports by batch</CardTitle><CardDescription>Attendance is the average over students of classes attended against classes held. Homework is how much was ticked done.</CardDescription></div>
            {o.batches.length === 0 ? <p className="text-[14px] text-muted-foreground">No batches yet.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[14px]">
                  <thead className="text-[12px] text-muted-foreground uppercase"><tr><th className="py-2 pr-3 font-semibold">Batch</th><th className="py-2 pr-3 font-semibold">Teacher</th><th className="py-2 pr-3 font-semibold">Students</th><th className="py-2 pr-3 font-semibold">Classes held</th><th className="py-2 pr-3 font-semibold">Attendance</th><th className="py-2 font-semibold">Homework</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {o.batches.map((b) => (
                      <tr key={b.id}><td className="py-2.5 pr-3 font-semibold"><Link className="hover:text-gold-ink" href={`/teacher/batches/${b.id}`}>{b.name}</Link></td><td className="py-2.5 pr-3">{b.teacherName}</td><td className="py-2.5 pr-3">{b.students}</td><td className="py-2.5 pr-3">{b.held}</td><td className="py-2.5 pr-3">{pct(b.attendancePct)}</td><td className="py-2.5">{pct(b.homeworkPct)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <div className="grid gap-1"><CardTitle>Teachers</CardTitle><CardDescription>Invite a teacher who already has a Deutli account. When a teacher leaves, their students stay with the school.</CardDescription></div>
            <ul className="divide-y divide-border">
              {o.teachers.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="grid gap-0.5"><span className="font-semibold">{t.name} {t.role !== "teacher" && <Badge variant="gold">{t.role === "owner" ? "Owner" : "Admin"}</Badge>}</span><span className="text-[13px] text-muted-foreground">{t.email ?? "no email"} · {t.students} student{t.students === 1 ? "" : "s"}</span></span>
                  {t.role === "teacher" && <RemoveTeacher id={t.id} name={t.name} />}
                </li>
              ))}
            </ul>
            <AddTeacherForm />
          </Card>

          <Card>
            <div className="grid gap-1"><CardTitle>Add students in bulk</CardTitle><CardDescription>Each student gets an invite email and joins this school with the teacher you choose. Stops at your plan&apos;s student limit.</CardDescription></div>
            <BulkStudentsForm teachers={o.teachers.map((t) => ({ id: t.id, name: t.name }))} />
          </Card>
        </>
      )}
    </main>
  );
}
