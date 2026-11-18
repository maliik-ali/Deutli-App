import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { ClassAction } from "@/components/classes/class-action";
import { Badge } from "@/components/ui/badge";
import type { ClassCard } from "@/lib/classes/data";
import {
  classPhase,
  durationText,
  levelLabel,
  seatsText,
  skillLabel,
} from "@/lib/classes/constants";
import { formatClock, formatShortDate } from "@/lib/time";
import { cn } from "@/lib/utils";

/** One class in a list: time, title, teacher and the Register / Join button. The whole row opens the class page. */
export function ClassRow({
  c,
  tz,
  serverNow,
  showDate,
}: {
  c: ClassCard;
  tz: string;
  serverNow: number;
  /** Show the weekday and date above the time (lists that span several days). */
  showDate?: boolean;
}) {
  const seats = seatsText(c.capacity, c.taken);
  const cancelled = c.status === "cancelled";
  const ended = classPhase(c.startsAt, c.durationMin, serverNow) === "ended";
  return (
    <li className="relative grid gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:px-6 lg:grid-cols-[96px_minmax(0,1fr)_176px_136px]">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:grid sm:gap-0.5">
        {showDate && (
          <span className="text-[13px] font-medium text-muted-foreground">
            {formatShortDate(c.startsAt, tz)}
          </span>
        )}
        <span
          className={cn(
            "text-[15px] font-semibold",
            cancelled && "text-muted-foreground",
          )}
        >
          {formatClock(c.startsAt, tz)}
        </span>
        <span className="text-[13px] text-subtle-foreground">
          {durationText(c.durationMin)}
        </span>
      </div>

      <div className="min-w-0">
        <Link
          href={`/dashboard/classes/${c.id}`}
          className={cn(
            "block rounded-md text-[16px] leading-snug font-semibold outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-gold-ink",
            cancelled && "text-muted-foreground line-through",
          )}
        >
          {c.title}
        </Link>
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
          {c.courseTitle}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge>{skillLabel(c.skill)}</Badge>
          <Badge>{levelLabel(c.level)}</Badge>
          {seats && !cancelled && !ended && (
            <Badge variant={seats.full ? "outline" : "gold"}>
              {seats.text}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end sm:gap-6 lg:contents">
        <Link
          href={`/dashboard/teachers/${c.teacher.id}`}
          className="relative z-10 flex min-h-11 min-w-0 items-center gap-2.5 rounded-full pr-2 text-[14px] font-semibold text-foreground hover:text-gold-ink"
        >
          <Avatar
            name={c.teacher.name}
            url={c.teacher.avatarUrl}
            className="size-9"
          />
          <span className="max-w-40 truncate">{c.teacher.name}</span>
        </Link>
        <div className="relative z-10 lg:justify-self-end">
          <ClassAction
            classId={c.id}
            serverNow={serverNow}
            startsAt={c.startsAt}
            durationMin={c.durationMin}
            status={c.status}
            registered={c.registered}
            full={seats?.full ?? false}
            hasLink={c.hasLink}
          />
        </div>
      </div>
    </li>
  );
}
