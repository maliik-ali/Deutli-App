import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CalendarPlus, ChevronLeft, Clock, Hourglass, Layers } from "lucide-react";

import { ClassAction } from "@/components/classes/class-action";
import { ClassesEmpty } from "@/components/classes/classes-empty";
import { RateClass } from "@/components/classes/rate-class";
import { SyllabusText } from "@/components/classes/syllabus-text";
import { TeacherCard } from "@/components/classes/teacher-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { classPhase, durationText, levelLabel, seatsText, skillLabel } from "@/lib/classes/constants";
import { getClassDetail } from "@/lib/classes/data";
import { dayKeyIn, formatClock, formatDayLong, timeZoneLabel } from "@/lib/time";

export const metadata: Metadata = { title: "Class" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ClassPage(props: PageProps<"/dashboard/classes/[id]">) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();

  const detail = await getClassDetail(id, user.id);
  if (detail === null) notFound();

  const back = (
    <Link href="/dashboard/classes" className="inline-flex h-11 w-fit items-center gap-1 rounded-full pr-3 text-sm font-medium text-muted-foreground hover:text-foreground">
      <ChevronLeft className="size-4" aria-hidden /> Classes
    </Link>
  );

  if (detail.unavailable) {
    return (
      <main className="mx-auto grid max-w-[1240px] gap-4 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        {back}
        <Card className="max-w-[960px] gap-0 p-0">
          <ClassesEmpty title="This class isn't available right now" body="Please try again in a few minutes." />
        </Card>
      </main>
    );
  }

  const { card: c, syllabus, teacher, myRating } = detail;
  const tz = user.timeZone;
  const serverNow = new Date().getTime();
  const end = new Date(new Date(c.startsAt).getTime() + c.durationMin * 60_000);
  const seats = seatsText(c.capacity, c.taken);
  const phase = classPhase(c.startsAt, c.durationMin, serverNow);
  const started = phase === "live" || phase === "ended";
  const cancelled = c.status === "cancelled";

  const meta = [
    { icon: CalendarDays, text: formatDayLong(dayKeyIn(tz, c.startsAt)) },
    { icon: Clock, text: `${formatClock(c.startsAt, tz)} – ${formatClock(end, tz)}` },
    { icon: Hourglass, text: durationText(c.durationMin) },
    { icon: Layers, text: `${skillLabel(c.skill)} · ${levelLabel(c.level)}` },
  ];

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="grid max-w-[1040px] gap-6">
        <div className="grid gap-3">
          {back}
          <p className="text-[13px] font-semibold tracking-wide text-gold-ink uppercase">{c.courseTitle}</p>
          <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">{c.title}</h1>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-medium text-muted-foreground">
            {meta.map(({ icon: Icon, text }) => (
              <li key={text} className="inline-flex items-center gap-2">
                <Icon className="size-4 text-gold-ink" aria-hidden /> {text}
              </li>
            ))}
          </ul>
          <p className="text-[13px] text-subtle-foreground">
            Times in {timeZoneLabel(tz)} ·{" "}
            <Link href="/dashboard/account" className="underline underline-offset-4 hover:text-foreground">
              change
            </Link>
          </p>
        </div>

        {cancelled && (
          <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm font-medium text-destructive" role="status">
            This class was cancelled by the teacher.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <ClassAction
            classId={c.id}
            serverNow={serverNow}
            startsAt={c.startsAt}
            durationMin={c.durationMin}
            status={c.status}
            registered={c.registered}
            full={seats?.full ?? false}
            hasLink={c.hasLink}
            large
          />
          {c.registered && !cancelled && phase !== "ended" && (
            <Button asChild variant="outline" size="lg">
              <a href={`/dashboard/classes/${c.id}/calendar`}>
                <CalendarPlus aria-hidden /> Add to calendar
              </a>
            </Button>
          )}
          {seats && !cancelled && <Badge variant={seats.full ? "outline" : "gold"}>{seats.text}</Badge>}
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-6">
            {c.description && (
              <div className="rounded-2xl border border-border bg-card px-5 py-4 text-[16px]">{c.description}</div>
            )}
            {syllabus && (
              <section className="grid gap-3" aria-labelledby="syllabus-title">
                <h2 id="syllabus-title" className="text-xl font-bold">
                  Syllabus
                </h2>
                <SyllabusText text={syllabus} />
              </section>
            )}
            {!c.description && !syllabus && (
              <p className="text-[15px] text-muted-foreground">Your teacher hasn&apos;t added details for this class yet.</p>
            )}
            {c.registered && started && !cancelled && <RateClass classId={c.id} initial={myRating} />}
          </div>
          {teacher && <TeacherCard teacher={teacher} />}
        </div>
      </div>
    </main>
  );
}
