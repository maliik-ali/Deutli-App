import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, Inbox, Users, type LucideIcon } from "lucide-react";

import { JoinCodeCard } from "@/components/join/join-code-card";
import { WorkspaceCard } from "@/components/academies/workspace-card";
import { GettingStarted } from "@/components/getting-started";
import { CheckedCard, ToCheckCard } from "@/components/teacher/review-lists";
import { Card, CardTitle } from "@/components/ui/card";
import { formatMinor, getMyWorkspace } from "@/lib/academies/data";
import { getOrCreateJoinCode, joinLink, qrSvg } from "@/lib/join/codes";
import { requireUser } from "@/lib/auth/dal";
import { getTeacherData } from "@/lib/teachers/data";
import { getTeacherSetup } from "@/lib/teachers/setup";
import { ensureTeacherCode } from "@/lib/writing/teacher";

export const metadata: Metadata = { title: "Teacher dashboard" };

function Stat({ icon: Icon, label, value, href }: { icon: LucideIcon; label: string; value: number | string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted">
      <Icon className="size-5 text-gold-ink" aria-hidden />
      <p className="mt-3 text-3xl font-extrabold">{value}</p>
      <p className="text-[13px] text-muted-foreground">{label}</p>
    </Link>
  );
}

export default async function TeacherPage() {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const isAdmin = user.role !== "teacher";
  const [data, code, workspace, setup] = await Promise.all([getTeacherData(user.id, isAdmin), isAdmin ? null : ensureTeacherCode(user.id), isAdmin ? null : getMyWorkspace(user.id), isAdmin ? [] : getTeacherSetup(user.id)]);
  const join = workspace ? await getOrCreateJoinCode(user.id, workspace.workspace.id) : null;
  const link = join ? await joinLink(join.code) : null;
  const qr = link ? await qrSvg(link) : null;
  const todo = data.mine.filter((r) => r.status === "requested");
  const done = data.mine.filter((r) => r.status === "done");
  const scored = done.filter((r) => r.total != null);
  const avg = scored.length ? Math.round(scored.reduce((s, r) => s + (r.total ?? 0), 0) / scored.length) : null;

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Hello {user.fullName ?? "there"}</p>
        <h1 className="text-3xl font-extrabold">Teacher dashboard</h1>
      </div>

      <GettingStarted steps={setup} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Clock} label="Waiting for you" value={todo.length} href="/teacher/reviews" />
        <Stat icon={Inbox} label="Open requests" value={data.open.length} href="/teacher/reviews" />
        <Stat icon={Users} label={isAdmin ? "Students (see Admin)" : "My students"} value={isAdmin ? "–" : data.students.length} href="/teacher/students" />
        <Stat icon={CheckCircle2} label={avg != null ? `Checked · average ${avg} / 45` : "Checked"} value={done.length} href="/teacher/reviews" />
      </div>

      {workspace && (
        <WorkspaceCard
          data={{
            name: workspace.workspace.name,
            kind: workspace.workspace.kind,
            planName: workspace.plan?.name ?? "No plan",
            priceLabel: workspace.plan?.eur_cents ? `${formatMinor(workspace.plan.eur_cents, "EUR")} a month` : "Free plan",
            students: workspace.students,
            maxStudents: workspace.plan?.max_students ?? null,
            teachers: workspace.teachers,
            maxTeachers: workspace.plan?.max_teachers ?? null,
            discountPercent: workspace.workspace.discount_percent,
            discountUntil: workspace.workspace.discount_until,
            isOwner: workspace.role === "owner",
          }}
        />
      )}

      {join && link && qr && <JoinCodeCard code={join.code} active={join.active} link={link} qr={qr} />}

      {code && !join && (
        <Card className="grid gap-1 p-6">
          <CardTitle>Your teacher code</CardTitle>
          <p className="font-mono text-3xl font-extrabold tracking-[0.2em]">{code}</p>
          <p className="text-[14px] text-muted-foreground">Give this code to students. They enter it on their result page to send you their email. After that they are your students: you check their writing.</p>
        </Card>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ToCheckCard timeZone={user.timeZone} rows={todo} names={data.names} limit={5} />
        <CheckedCard timeZone={user.timeZone} rows={done} names={data.names} limit={5} />
      </div>
    </main>
  );
}
