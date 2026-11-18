import Link from "next/link";

import { formatDayLong, formatDayShort } from "@/lib/time";
import { cn } from "@/lib/utils";

export type StripDay = { key: string; count: number };

/** The next two weeks as tappable days. A dot marks days that have classes. */
export function DayStrip({
  days,
  selected,
  today,
  hrefFor,
}: {
  days: StripDay[];
  selected: string;
  today: string;
  hrefFor: (day: string) => string;
}) {
  return (
    <nav aria-label="Pick a day" className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {days.map((d) => {
          const { weekday, date } = formatDayShort(d.key);
          const on = d.key === selected;
          return (
            <li key={d.key}>
              <Link
                href={hrefFor(d.key)}
                scroll={false}
                aria-current={on ? "date" : undefined}
                aria-label={`${formatDayLong(d.key)}${d.key === today ? ", today" : ""}, ${d.count === 0 ? "no classes" : d.count === 1 ? "1 class" : `${d.count} classes`}`}
                className={cn(
                  "grid h-[72px] w-14 content-center justify-items-center gap-0.5 rounded-2xl border text-center transition-colors",
                  on ? "border-gold-ink bg-gold-soft" : "border-border bg-card hover:border-gold-ink/60",
                )}
              >
                <span className={cn("text-[12px] font-medium", on ? "text-foreground" : "text-muted-foreground")}>
                  {d.key === today ? "Today" : weekday}
                </span>
                <span className="text-[18px] leading-none font-bold">{date}</span>
                <span
                  aria-hidden
                  className={cn("size-1.5 rounded-full", d.count > 0 ? "bg-brand-cyan" : "bg-transparent")}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
