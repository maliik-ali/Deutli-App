import Link from "next/link";
import { LinkIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClassCard } from "@/lib/classes/data";
import { durationText, levelLabel, skillLabel } from "@/lib/classes/constants";
import { formatClock, formatShortDate } from "@/lib/time";
import { cn } from "@/lib/utils";

/** One class in a teacher's or admin's list: when, what, how many registered, and whether the join link is missing. */
export function ManagedRow({ c, tz, editBase, showTeacher }: { c: ClassCard; tz: string; editBase: string; showTeacher?: boolean }) {
  const cancelled = c.status === "cancelled";
  return (
    <li className="relative grid gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:px-6">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:grid sm:gap-0.5">
        <span className="text-[13px] font-medium text-muted-foreground">{formatShortDate(c.startsAt, tz)}</span>
        <span className={cn("text-[15px] font-semibold", cancelled && "text-muted-foreground")}>{formatClock(c.startsAt, tz)}</span>
        <span className="text-[13px] text-subtle-foreground">{durationText(c.durationMin)}</span>
      </div>
      <div className="min-w-0">
        <Link
          href={`${editBase}/${c.id}`}
          className={cn(
            "block rounded-md text-[16px] leading-snug font-semibold outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-gold-ink",
            cancelled && "text-muted-foreground line-through",
          )}
        >
          {c.title}
        </Link>
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
          {c.courseTitle}
          {showTeacher && ` · ${c.teacher.name}`}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge>{skillLabel(c.skill)}</Badge>
          <Badge>{levelLabel(c.level)}</Badge>
          <Badge variant={c.taken > 0 ? "gold" : "outline"}>
            {c.taken} registered{c.capacity != null && ` of ${c.capacity}`}
          </Badge>
          {cancelled ? (
            <Badge className="bg-destructive-soft text-destructive">Cancelled</Badge>
          ) : (
            !c.hasLink && (
              <Badge className="bg-destructive-soft text-destructive">
                <LinkIcon aria-hidden /> Add join link
              </Badge>
            )
          )}
        </div>
      </div>
      <div className="relative z-10">
        <Button asChild variant="outline" size="sm" className="h-11 sm:h-9">
          <Link href={`${editBase}/${c.id}`}>Open</Link>
        </Button>
      </div>
    </li>
  );
}
