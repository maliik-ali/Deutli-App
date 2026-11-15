import type { Metadata } from "next";
import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";
import { Logo } from "@/components/logo";
import { TakeButton } from "@/components/teacher/take-button";
import { Card, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureTeacherCode } from "@/lib/writing/teacher";

export const metadata: Metadata = { title: "Teacher" };

type Row = { id: string; student_id: string; attempt_id: string; teacher_id: string | null; status: "requested" | "done"; source: string; total: number | null; created_at: string };

export default async function TeacherPage() {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const admin = createAdminClient();
  const code = user.role === "teacher" ? await ensureTeacherCode(user.id) : null;

  let mine: Row[] = [];
  let open: Row[] = [];
  const names = new Map<string, string>();
  if (admin) {
    const cols = "id, student_id, attempt_id, teacher_id, status, source, total, created_at";
    const [m, o] = await Promise.all([
      admin.from("writing_reviews").select(cols).eq("teacher_id", user.id).order("created_at", { ascending: false }).limit(50),
      admin.from("writing_reviews").select(cols).is("teacher_id", null).eq("status", "requested").order("created_at", { ascending: true }).limit(50),
    ]);
    mine = (m.data ?? []) as Row[];
    open = (o.data ?? []) as Row[];
    const ids = [...new Set([...mine, ...open].map((r) => r.student_id))];
    if (ids.length) {
      const { data } = await admin.from("profiles").select("id, full_name").in("id", ids);
      for (const p of (data ?? []) as { id: string; full_name: string | null }[]) names.set(p.id, p.full_name ?? "Student");
    }
  }
  const todo = mine.filter((r) => r.status === "requested");
  const done = mine.filter((r) => r.status === "done");
  const when = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });
  const label = (r: Row) => (r.source === "offer" ? "asked for a teacher" : r.source === "code" ? "sent with your code" : "your student");

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-8">
        <Logo href="/" />
        <SignOutButton compact />
      </header>
      <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8 sm:px-8">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Hello {user.fullName ?? "there"}</p>
          <h1 className="text-3xl font-extrabold">Writing to check</h1>
        </div>

        {code && (
          <Card className="grid gap-1 p-6">
            <CardTitle>Your teacher code</CardTitle>
            <p className="font-mono text-3xl font-extrabold tracking-[0.2em]">{code}</p>
            <p className="text-[14px] text-muted-foreground">Give this code to students. They enter it on their result page to send you their email. After that they are your students: you check their writing.</p>
          </Card>
        )}

        <Card className="grid gap-2 p-6">
          <CardTitle>To check ({todo.length})</CardTitle>
          {todo.length === 0 ? (
            <p className="text-[14px] text-muted-foreground">Nothing waiting. New emails from your students appear here.</p>
          ) : (
            <ul className="divide-y divide-border">
              {todo.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <span>
                    <Link href={`/teacher/review/${r.id}`} className="font-semibold underline-offset-2 hover:underline">
                      {names.get(r.student_id) ?? "Student"}
                    </Link>
                    <span className="block text-[13px] text-muted-foreground">
                      {label(r)} · {when(r.created_at)}
                    </span>
                  </span>
                  <Link href={`/teacher/review/${r.id}`} className="text-[14px] font-medium text-gold-ink">
                    Check
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="grid gap-2 p-6">
          <CardTitle>Open requests ({open.length})</CardTitle>
          <p className="text-[13px] text-muted-foreground">Students without a teacher asked for a check. Take one to check it.</p>
          {open.length > 0 && (
            <ul className="divide-y divide-border">
              {open.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <span>
                    <span className="font-semibold">{names.get(r.student_id) ?? "Student"}</span>
                    <span className="block text-[13px] text-muted-foreground">{when(r.created_at)}</span>
                  </span>
                  <TakeButton reviewId={r.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {done.length > 0 && (
          <Card className="grid gap-2 p-6">
            <CardTitle>Checked</CardTitle>
            <ul className="divide-y divide-border">
              {done.slice(0, 15).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-[14px]">
                  <Link href={`/teacher/review/${r.id}`} className="underline-offset-2 hover:underline">
                    {names.get(r.student_id) ?? "Student"}
                  </Link>
                  <span className="text-muted-foreground">
                    {r.total} / 45 · {when(r.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </main>
    </div>
  );
}
