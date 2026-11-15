import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { PersonRow, type Person } from "@/components/admin/person-row";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Teachers" };

const PAGE = 25;
type P = { id: string; full_name: string | null; role: "student" | "teacher"; teacher_id: string | null; teacher_code: string | null };

export default async function AdminTeachersPage(props: PageProps<"/admin/teachers">) {
  await requireUser(["academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);
  const admin = createAdminClient();

  let teachers: P[] = [];
  let people: P[] = [];
  let total = 0;
  let withTeacher = 0;
  let students = 0;
  const counts = new Map<string, number>();
  const emails = new Map<string, string | null>();

  if (admin) {
    const cols = "id, full_name, role, teacher_id, teacher_code";
    const [t, all, c] = await Promise.all([
      admin.from("profiles").select(cols).eq("role", "teacher").order("full_name"),
      admin.from("profiles").select("teacher_id", { count: "exact" }).eq("role", "student"),
      admin.from("profiles").select("teacher_id").eq("role", "student").not("teacher_id", "is", null),
    ]);
    teachers = (t.data ?? []) as P[];
    students = all.count ?? 0;
    withTeacher = c.data?.length ?? 0;
    for (const r of (c.data ?? []) as { teacher_id: string }[]) counts.set(r.teacher_id, (counts.get(r.teacher_id) ?? 0) + 1);

    let query = admin.from("profiles").select(cols, { count: "exact" }).in("role", ["student", "teacher"]);
    if (q) query = query.ilike("full_name", `%${q.replace(/[%_,()]/g, " ")}%`);
    const res = await query.order("role", { ascending: false }).order("full_name").range((page - 1) * PAGE, page * PAGE - 1);
    people = (res.data ?? []) as P[];
    total = res.count ?? 0;
    await Promise.all(
      people.map(async (p) => {
        const { data } = await admin.auth.admin.getUserById(p.id);
        emails.set(p.id, data.user?.email ?? null);
      }),
    );
  }

  const options = teachers.map((t) => ({ id: t.id, name: t.full_name ?? "Teacher" }));
  const rows: Person[] = people.map((p) => ({
    id: p.id,
    name: p.full_name ?? "Unnamed",
    email: emails.get(p.id) ?? null,
    role: p.role,
    teacherId: p.teacher_id,
    code: p.teacher_code,
    students: counts.get(p.id) ?? 0,
  }));
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (n: number) => `/admin/teachers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) })}`;

  return (
    <AdminShell
      title="Teachers and students"
      description="Make someone a teacher, and give students their teacher. A student with a teacher has their writing checked by that teacher, not by the AI."
      back={{ href: "/admin", label: "Admin" }}
    >
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Teachers", value: teachers.length },
          { label: "Students with a teacher", value: withTeacher },
          { label: "Standalone students", value: Math.max(0, students - withTeacher) },
        ].map((s) => (
          <Card key={s.label} className="gap-1 p-4 sm:p-6">
            <span className="text-[13px] text-muted-foreground">{s.label}</span>
            <span className="font-heading text-2xl font-extrabold tabular-nums sm:text-[32px]">{s.value}</span>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-1">
            <CardTitle className="text-lg">People</CardTitle>
            <CardDescription>Search by name. Choose a teacher in the list to assign a student.</CardDescription>
          </div>
          <form action="/admin/teachers" className="flex gap-2">
            <label htmlFor="q" className="sr-only">
              Search by name
            </label>
            <input id="q" name="q" defaultValue={q} placeholder="Search by name" className="h-11 w-48 rounded-lg border border-input bg-background px-3 text-[14px]" />
            <Button type="submit" variant="outline" aria-label="Search">
              <Search aria-hidden />
            </Button>
          </form>
        </div>
        {!admin ? (
          <p className="text-[14px] text-muted-foreground">This needs SUPABASE_SECRET_KEY on the server.</p>
        ) : rows.length === 0 ? (
          <p className="text-[14px] text-muted-foreground">No one found.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((p) => (
              <PersonRow key={p.id} person={p} teachers={options} />
            ))}
          </ul>
        )}
        {pages > 1 && (
          <nav className="flex items-center justify-between text-[14px]" aria-label="Pages">
            {page > 1 ? <Link href={href(page - 1)}>← Previous</Link> : <span />}
            <span className="text-muted-foreground">
              Page {page} of {pages}
            </span>
            {page < pages ? <Link href={href(page + 1)}>Next →</Link> : <span />}
          </nav>
        )}
      </Card>
    </AdminShell>
  );
}
