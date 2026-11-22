import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CalendarPlus } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { levelLabel, skillLabel } from "@/lib/classes/constants";
import { listMyTimetable } from "@/lib/classes/data";
import { dayKeyIn, formatClock, formatDayLong, timeZoneLabel } from "@/lib/time";

export const metadata: Metadata = { title: "My timetable" };

export default async function TimetablePage() {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const classes = await listMyTimetable(user.id);
  const tz = user.timeZone;
  // One block per teacher, classes in time order.
  const byTeacher = new Map<string, { name: string; avatarUrl: string | null; id: string; items: typeof classes }>();
  for (const c of classes) {
    const g = byTeacher.get(c.teacher.id) ?? { name: c.teacher.name, avatarUrl: c.teacher.avatarUrl, id: c.teacher.id, items: [] };
    g.items.push(c);
    byTeacher.set(c.teacher.id, g);
  }

  return (
    <main className="mx-auto grid max-w-[960px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-1">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">My timetable</h1>
        <p className="text-[15px] text-muted-foreground">Your classes and your batches&apos; classes, by teacher. Times in {timeZoneLabel(tz)}.</p>
      </header>
      {classes.length === 0 ? (
        <Card className="items-center gap-2 py-10 text-center">
          <CalendarDays className="size-8 text-gold-ink" aria-hidden />
          <p className="font-semibold">Nothing planned yet</p>
          <p className="text-[14px] text-muted-foreground">Register for a class, or join your teacher&apos;s batch with a code.</p>
          <Button asChild size="sm" className="mt-2"><Link href="/dashboard/classes">Browse classes</Link></Button>
        </Card>
      ) : (
        [...byTeacher.values()].map((g) => (
          <Card key={g.id}>
            <Link href={`/dashboard/teachers/${g.id}`} className="flex items-center gap-3 hover:text-gold-ink">
              <Avatar name={g.name} url={g.avatarUrl} className="size-10 text-sm" />
              <span className="font-bold">{g.name}</span>
            </Link>
            <ul className="divide-y divide-border">
              {g.items.map((c) => (
                <li key={c.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="grid gap-0.5">
                    <Link href={`/dashboard/classes/${c.id}`} className="font-semibold hover:text-gold-ink">{c.title}</Link>
                    <span className="text-[13px] text-muted-foreground">{formatDayLong(dayKeyIn(tz, c.startsAt))} · {formatClock(c.startsAt, tz)} · {c.durationMin} min</span>
                    <span className="flex flex-wrap gap-1.5 pt-1"><Badge variant="outline">{levelLabel(c.level)}</Badge><Badge variant="outline">{skillLabel(c.skill)}</Badge>{c.registered ? <Badge variant="success">Registered</Badge> : <Badge variant="gold">Register to join</Badge>}</span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="h-11 w-fit sm:h-9"><a href={`/dashboard/classes/${c.id}/calendar`}><CalendarPlus aria-hidden /> Add to calendar</a></Button>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </main>
  );
}
