import type { Metadata } from "next";
import Link from "next/link";

import { ClassRow } from "@/components/classes/class-row";
import { ClassesEmpty } from "@/components/classes/classes-empty";
import { DayStrip } from "@/components/classes/day-strip";
import { BlurFade } from "@/components/magicui/blur-fade";
import { MotionProvider } from "@/components/magicui/motion-provider";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { classPhase, SKILLS, type SkillId } from "@/lib/classes/constants";
import { listClassesBetween, listMyClasses } from "@/lib/classes/data";
import { addDays, dayKeyIn, formatDayLong, timeZoneLabel, zonedToUtc } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Classes" };

const DAYS_SHOWN = 14;

type View = { tab: "all" | "mine"; skill: SkillId | "all"; day?: string };

function href({ tab, skill, day }: View) {
  const q = new URLSearchParams();
  if (tab === "mine") q.set("tab", "mine");
  if (tab === "all" && skill !== "all") q.set("skill", skill);
  if (tab === "all" && day) q.set("day", day);
  const s = q.toString();
  return `/dashboard/classes${s ? `?${s}` : ""}`;
}

const pill = (on: boolean) =>
  cn(
    "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-[14px] font-semibold transition-colors",
    on ? "border-gold-ink bg-gold-soft text-foreground" : "border-border text-muted-foreground hover:text-foreground",
  );

export default async function ClassesPage(props: PageProps<"/dashboard/classes">) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const tz = user.timeZone;
  const serverNow = new Date().getTime();
  const today = dayKeyIn(tz, new Date(serverNow));

  const tab: View["tab"] = sp.tab === "mine" ? "mine" : "all";
  const skill: View["skill"] = SKILLS.some((s) => s.id === sp.skill) ? (sp.skill as SkillId) : "all";

  const header = (
    <header className="grid gap-2">
      <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Classes</h1>
      <p className="text-[15px] text-muted-foreground">Live classes with your teachers. Register, then join from here.</p>
    </header>
  );

  // Two weeks of classes (from the start of today in the student's time zone).
  const start = zonedToUtc(today, "00:00", tz);
  const end = zonedToUtc(addDays(today, DAYS_SHOWN), "00:00", tz);
  const [window, mine] = await Promise.all([
    start && end ? listClassesBetween(start.toISOString(), end.toISOString(), user.id) : Promise.resolve([]),
    listMyClasses(user.id),
  ]);

  if (window === null || mine === null) {
    return (
      <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        {header}
        <Card className="max-w-[960px] gap-0 p-0">
          <ClassesEmpty title="Classes aren't available right now" body="Please try again in a few minutes." />
        </Card>
      </main>
    );
  }

  const myCount = mine.upcoming.length;
  const tabs = (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Classes">
      <Link role="tab" aria-selected={tab === "all"} href={href({ tab: "all", skill: "all" })} className={pill(tab === "all")}>
        All classes
      </Link>
      <Link role="tab" aria-selected={tab === "mine"} href={href({ tab: "mine", skill: "all" })} className={pill(tab === "mine")}>
        My classes
        {myCount > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[11px] font-semibold text-ink-foreground">
            {myCount}
          </span>
        )}
      </Link>
    </div>
  );

  // ---------------------------------------------------------------- My classes
  if (tab === "mine") {
    return (
      <MotionProvider>
        <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
          {header}
          <div className="grid max-w-[960px] gap-5">
            {tabs}
            <BlurFade>
              <Card className="gap-0 overflow-hidden p-0">
                {mine.upcoming.length === 0 ? (
                  <ClassesEmpty
                    title="You haven't registered for a class yet"
                    body="Pick a class and tap Register. It shows up here with a Join button when it starts."
                    action={{ href: "/dashboard/classes", label: "See all classes" }}
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {mine.upcoming.map((c) => (
                      <ClassRow key={c.id} c={c} tz={tz} serverNow={serverNow} showDate />
                    ))}
                  </ul>
                )}
              </Card>
            </BlurFade>
            {mine.past.length > 0 && (
              <section className="grid gap-3">
                <h2 className="text-lg font-bold">Recent classes</h2>
                <Card className="gap-0 overflow-hidden p-0">
                  <ul className="divide-y divide-border">
                    {mine.past.map((c) => (
                      <ClassRow key={c.id} c={c} tz={tz} serverNow={serverNow} showDate />
                    ))}
                  </ul>
                </Card>
              </section>
            )}
          </div>
        </main>
      </MotionProvider>
    );
  }

  // ---------------------------------------------------------------- All classes
  const visible = window.filter((c) => skill === "all" || c.skill === skill);
  const byDay = new Map<string, typeof visible>();
  for (const c of visible) {
    const key = dayKeyIn(tz, c.startsAt);
    byDay.set(key, [...(byDay.get(key) ?? []), c]);
  }
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => {
    const key = addDays(today, i);
    return { key, count: byDay.get(key)?.length ?? 0 };
  });

  // Smart default: the first day that still has a class to attend; otherwise today.
  const requested = typeof sp.day === "string" && days.some((d) => d.key === sp.day) ? sp.day : undefined;
  const firstOpen = days.find((d) => (byDay.get(d.key) ?? []).some((c) => classPhase(c.startsAt, c.durationMin, serverNow) !== "ended"));
  const selected = requested ?? firstOpen?.key ?? today;
  const list = byDay.get(selected) ?? [];
  const nextDay = days.find((d) => d.key > selected && d.count > 0);

  return (
    <MotionProvider>
      <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        {header}
        <div className="grid max-w-[960px] gap-5">
          {tabs}

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by skill">
            {[{ id: "all", label: "All" }, ...SKILLS.filter((s) => s.id !== "general")].map((s) => (
              <Link
                key={s.id}
                href={href({ tab: "all", skill: s.id as View["skill"], day: selected })}
                scroll={false}
                aria-pressed={skill === s.id}
                className={cn(
                  "inline-flex h-11 items-center rounded-full border px-4 text-[13px] font-medium transition-colors sm:h-9",
                  skill === s.id ? "border-gold-ink bg-gold/30 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </Link>
            ))}
          </div>

          <DayStrip days={days} selected={selected} today={today} hrefFor={(day) => href({ tab: "all", skill, day })} />

          <section className="grid gap-3" aria-labelledby="day-title">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="day-title" className="text-xl font-bold">
                {formatDayLong(selected)}
                {selected === today && <span className="ml-2 text-base font-semibold text-gold-ink">Today</span>}
              </h2>
              <p className="text-[13px] text-subtle-foreground">
                Times in {timeZoneLabel(tz)} ·{" "}
                <Link href="/dashboard/account" className="underline underline-offset-4 hover:text-foreground">
                  change
                </Link>
              </p>
            </div>
            <BlurFade key={`${selected}-${skill}`}>
              <Card className="gap-0 overflow-hidden p-0">
                {list.length === 0 ? (
                  <ClassesEmpty
                    title="No classes on this day"
                    body={
                      nextDay
                        ? "Try another day. The dots show when classes are scheduled."
                        : "No classes are scheduled yet. New ones will appear here."
                    }
                    action={nextDay ? { href: href({ tab: "all", skill, day: nextDay.key }), label: `Next: ${formatDayLong(nextDay.key)}` } : undefined}
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {list.map((c) => (
                      <ClassRow key={c.id} c={c} tz={tz} serverNow={serverNow} />
                    ))}
                  </ul>
                )}
              </Card>
            </BlurFade>
          </section>
        </div>
      </main>
    </MotionProvider>
  );
}
