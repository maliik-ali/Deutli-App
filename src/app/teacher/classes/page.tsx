import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { ClassesEmpty } from "@/components/classes/classes-empty";
import { ManagedRow } from "@/components/classes/managed-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { listManagedClasses } from "@/lib/classes/data";
import { timeZoneLabel } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My classes" };

const pill = (on: boolean) =>
  cn(
    "inline-flex h-11 items-center rounded-full border px-4 text-[14px] font-semibold transition-colors",
    on ? "border-gold-ink bg-gold-soft text-foreground" : "border-border text-muted-foreground hover:text-foreground",
  );

export default async function TeacherClassesPage(props: PageProps<"/teacher/classes">) {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const scope = sp.scope === "past" ? "past" : "upcoming";
  const classes = await listManagedClasses(user.id, scope);

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">My classes</h1>
          <p className="text-muted-foreground">Live classes you teach. Times in {timeZoneLabel(user.timeZone)}.</p>
        </div>
        <Button asChild size="lg">
          <Link href="/teacher/classes/new">
            <Plus aria-hidden /> New class
          </Link>
        </Button>
      </div>

      <div className="grid max-w-[960px] gap-5">
        <div className="flex gap-2" role="tablist" aria-label="Classes">
          <Link role="tab" aria-selected={scope === "upcoming"} href="/teacher/classes" className={pill(scope === "upcoming")}>
            Upcoming
          </Link>
          <Link role="tab" aria-selected={scope === "past"} href="/teacher/classes?scope=past" className={pill(scope === "past")}>
            Past
          </Link>
        </div>
        <Card className="gap-0 overflow-hidden p-0">
          {classes === null ? (
            <ClassesEmpty title="Classes aren't available right now" body="Please try again in a few minutes." />
          ) : classes.length === 0 ? (
            scope === "upcoming" ? (
              <ClassesEmpty
                title="No upcoming classes"
                body="Create a class and students can register for it straight away."
                action={{ href: "/teacher/classes/new", label: "Create your first class" }}
              />
            ) : (
              <ClassesEmpty title="No past classes yet" body="Classes you have taught will be listed here." />
            )
          ) : (
            <ul className="divide-y divide-border">
              {classes.map((c) => (
                <ManagedRow key={c.id} c={c} tz={user.timeZone} editBase="/teacher/classes" />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}
