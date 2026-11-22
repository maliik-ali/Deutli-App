import type { Metadata } from "next";
import Link from "next/link";

import { DeleteSlot, NewSlotsForm } from "@/components/classes/one-to-one-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { listOneToOneSlots } from "@/lib/classes/data";
import { addDays, dayKeyIn, formatClock, formatDayLong, timeZoneLabel } from "@/lib/time";

export const metadata: Metadata = { title: "1:1 lessons" };

export default async function TeacherLessonsPage() {
  const user = await requireUser(["teacher", "academy_admin", "super_admin"]);
  const isTeacher = user.role === "teacher";
  const slots = isTeacher ? await listOneToOneSlots(user.id, true) : [];
  const tz = user.timeZone;
  return (
    <main className="mx-auto grid max-w-[960px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-1">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">1:1 lessons</h1>
        <p className="text-[15px] text-muted-foreground">Offer free slots. A student books one from your profile. You agree the price and get paid outside Deutli. Times in {timeZoneLabel(tz)}.</p>
      </header>
      {!isTeacher ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted-foreground">Teachers manage their own 1:1 slots here.</p>
      ) : (
        <>
          <Card>
            <div className="grid gap-1"><CardTitle>New slot</CardTitle><CardDescription>One seat per slot. Repeat weekly to add the same time on the next weeks.</CardDescription></div>
            <NewSlotsForm defaultDate={addDays(dayKeyIn(tz, new Date()), 1)} />
          </Card>
          <Card>
            <CardTitle>Your slots ({slots.length})</CardTitle>
            {slots.length === 0 ? <p className="text-[14px] text-muted-foreground">No upcoming slots.</p> : (
              <ul className="divide-y divide-border">
                {slots.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <span className="grid gap-0.5">
                      <span className="font-semibold">{formatDayLong(dayKeyIn(tz, s.startsAt))} · {formatClock(s.startsAt, tz)} · {s.durationMin} min</span>
                      <span className="text-[13px] text-muted-foreground">{s.priceEurCents != null ? `€${s.priceEurCents / 100}` : "Price to agree"}</span>
                    </span>
                    {s.booked ? <span className="flex items-center gap-2"><Badge variant="success">Booked{s.bookedBy ? ` by ${s.bookedBy}` : ""}</Badge><Link className="text-[13px] underline underline-offset-4" href={`/teacher/classes/${s.id}`}>Open</Link></span> : <span className="flex items-center gap-2"><Badge variant="outline">Free</Badge><DeleteSlot id={s.id} /></span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </main>
  );
}
