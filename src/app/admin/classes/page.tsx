import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { ClassesEmpty } from "@/components/classes/classes-empty";
import { ManagedRow } from "@/components/classes/managed-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { listManagedClasses } from "@/lib/classes/data";
import { timeZoneLabel } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Live classes" };

const pill = (on: boolean) =>
  cn(
    "inline-flex h-11 items-center rounded-full border px-4 text-[14px] font-semibold transition-colors",
    on ? "border-gold-ink bg-gold-soft text-foreground" : "border-border text-muted-foreground hover:text-foreground",
  );

export default async function AdminClassesPage(props: PageProps<"/admin/classes">) {
  const user = await requireUser(["academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const scope = sp.scope === "past" ? "past" : "upcoming";
  const classes = await listManagedClasses(null, scope);

  return (
    <AdminShell
      title="Live classes"
      description={`Every class of every teacher. Times in ${timeZoneLabel(user.timeZone)}.`}
      back={{ href: "/admin", label: "Admin" }}
      actions={
        <Button asChild size="lg">
          <Link href="/admin/classes/new">
            <Plus aria-hidden /> New class
          </Link>
        </Button>
      }
    >
      <div className="flex gap-2" role="tablist" aria-label="Classes">
        <Link role="tab" aria-selected={scope === "upcoming"} href="/admin/classes" className={pill(scope === "upcoming")}>
          Upcoming
        </Link>
        <Link role="tab" aria-selected={scope === "past"} href="/admin/classes?scope=past" className={pill(scope === "past")}>
          Past
        </Link>
      </div>
      <Card className="gap-0 overflow-hidden p-0">
        {classes === null ? (
          <ClassesEmpty title="Classes aren't available right now" body="Check that SUPABASE_SECRET_KEY is set, then try again." />
        ) : classes.length === 0 ? (
          <ClassesEmpty
            title={scope === "upcoming" ? "No upcoming classes" : "No past classes yet"}
            body={scope === "upcoming" ? "Create a class for a teacher, or ask teachers to add their own from their menu." : "Finished classes will be listed here."}
            action={scope === "upcoming" ? { href: "/admin/classes/new", label: "Create a class" } : undefined}
          />
        ) : (
          <ul className="divide-y divide-border">
            {classes.map((c) => (
              <ManagedRow key={c.id} c={c} tz={user.timeZone} editBase="/admin/classes" showTeacher />
            ))}
          </ul>
        )}
      </Card>
    </AdminShell>
  );
}
