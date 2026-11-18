import Link from "next/link";
import { Video } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { ClassAction } from "@/components/classes/class-action";
import { Button } from "@/components/ui/button";
import type { ClassCard } from "@/lib/classes/data";
import { durationText, seatsText } from "@/lib/classes/constants";
import { addDays, dayKeyIn, formatClock, formatShortDate } from "@/lib/time";

/** "Today", "Tomorrow" or "Wed, 18 Nov" in the student's time zone. */
function dayWord(startsAt: string, tz: string, serverNow: number) {
  const today = dayKeyIn(tz, new Date(serverNow));
  const day = dayKeyIn(tz, startsAt);
  if (day === today) return "Today";
  if (day === addDays(today, 1)) return "Tomorrow";
  return formatShortDate(startsAt, tz);
}

/** Dashboard card: your next registered class with a Join button, or a gentle prompt to pick one. */
export function NextClassCard({ next, tz, serverNow }: { next: ClassCard | null; tz: string; serverNow: number }) {
  const icon = (
    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
      <Video className="size-6" aria-hidden />
    </span>
  );

  if (!next) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex flex-1 items-center gap-4">
          {icon}
          <span className="grid gap-0.5">
            <span className="text-base font-bold">Join a live class</span>
            <span className="text-sm text-muted-foreground">Practise with a real teacher. Pick a class and register in one tap.</span>
          </span>
        </div>
        <Button asChild variant="outline" className="sm:shrink-0">
          <Link href="/dashboard/classes">See classes</Link>
        </Button>
      </div>
    );
  }

  const seats = seatsText(next.capacity, next.taken);
  return (
    <div className="relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:p-6">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {icon}
        <span className="grid min-w-0 gap-0.5">
          <span className="text-[13px] font-semibold tracking-wide text-gold-ink uppercase">Your next class</span>
          <Link
            href={`/dashboard/classes/${next.id}`}
            className="line-clamp-2 rounded-md text-base font-bold outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-gold-ink"
          >
            {next.title}
          </Link>
          <span className="text-sm text-muted-foreground">
            {dayWord(next.startsAt, tz, serverNow)}, {formatClock(next.startsAt, tz)} · {durationText(next.durationMin)}
          </span>
        </span>
      </div>
      <div className="relative z-10 flex items-center justify-between gap-4 sm:justify-end sm:gap-6">
        <Link
          href={`/dashboard/teachers/${next.teacher.id}`}
          className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-full pr-2 text-[14px] font-semibold hover:text-gold-ink"
        >
          <Avatar name={next.teacher.name} url={next.teacher.avatarUrl} className="size-9" />
          <span className="max-w-36 truncate">{next.teacher.name}</span>
        </Link>
        <ClassAction
          classId={next.id}
          serverNow={serverNow}
          startsAt={next.startsAt}
          durationMin={next.durationMin}
          status={next.status}
          registered
          full={seats?.full ?? false}
          hasLink={next.hasLink}
        />
      </div>
    </div>
  );
}
