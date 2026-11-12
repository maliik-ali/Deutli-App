import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { NewSetForm } from "@/components/admin/practice-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { getPracticeSets } from "@/lib/practice/data";

export const metadata: Metadata = { title: "Daily Practice texts" };

export default async function AdminDailyPracticePage() {
  const user = await requireUser(["academy_admin", "super_admin"]);
  const { sets, failed } = await getPracticeSets(user.id);

  return (
    <AdminShell
      title="Daily Practice texts"
      description="A set is a group of short texts, each with an audio file. Students listen, read and speak along."
      back={{ href: "/admin", label: "Admin" }}
      actions={
        <Button asChild variant="outline">
          <Link href="/dashboard/daily-practice">See the student page</Link>
        </Button>
      }
    >
      <Card>
        <div className="grid gap-1">
          <CardTitle className="text-lg">Sets</CardTitle>
          <CardDescription>Only published sets are visible to students.</CardDescription>
        </div>
        {failed ? (
          <p className="text-destructive" role="alert">
            The sets couldn&apos;t load. Reload the page and try again.
          </p>
        ) : sets.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-muted-foreground">
            No sets yet. Create your first one below.
          </p>
        ) : (
          <ul className="grid gap-3">
            {sets.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/daily-practice/${s.id}`}
                  className="flex min-h-16 items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted"
                >
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <p className="truncate text-base font-semibold" lang="de">
                      {s.title}
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {s.level} · {s.tracks.length} {s.tracks.length === 1 ? "text" : "texts"} ·{" "}
                      {s.tracks.filter((t) => t.hasAudio).length} with audio
                    </p>
                  </div>
                  <Badge variant={s.isPublished ? "success" : "outline"}>{s.isPublished ? "Published" : "Draft"}</Badge>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle className="text-lg">New set</CardTitle>
        <NewSetForm />
      </Card>
    </AdminShell>
  );
}
