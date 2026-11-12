import Link from "next/link";
import { ArrowRight, BookOpenText, Check, Ear, Flame, Headphones, Mic, VolumeX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PracticeSet } from "@/lib/practice/data";
import { buildPlan, lastPractisedLabel, practiceStreak } from "@/lib/practice/plan";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: Ear, title: "Listen", body: "Play the audio once. The text stays hidden." },
  { icon: BookOpenText, title: "Listen and read", body: "Play it again and follow the text with your eyes." },
  { icon: Mic, title: "Speak along", body: "Play it a third time and say every sentence aloud." },
];

export function PracticeOverview({
  sets,
  today,
  failed,
  canManage,
}: {
  sets: PracticeSet[];
  today: string;
  failed?: boolean;
  canManage?: boolean;
}) {
  const tracks = sets.flatMap((s) => s.tracks);
  const plan = buildPlan(tracks, today);
  const streak = practiceStreak(tracks, today);
  const doneCount = plan.filter((p) => p.track && p.doneToday).length;
  const planSize = plan.filter((p) => p.track).length;

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-2">
          <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Daily Practice</h1>
          <p className="max-w-xl text-[15px] text-muted-foreground">
            20 minutes a day. Listen to a short German text, read it, then speak along. Your ears, your eyes and your
            mouth learn together.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold">
            <Flame className="size-4 text-gold-ink" aria-hidden />
            {streak}-day practice streak
          </span>
          {canManage && (
            <Button asChild variant="outline" size="sm" className="h-10">
              <Link href="/admin/daily-practice">Manage texts</Link>
            </Button>
          )}
        </div>
      </header>

      {failed ? (
        <Card className="items-center py-12 text-center">
          <h2 className="text-lg font-bold">Daily Practice couldn&apos;t load</h2>
          <p className="max-w-sm text-muted-foreground">
            Something went wrong on our side. Please reload the page. If it keeps happening, tell your academy.
          </p>
        </Card>
      ) : tracks.length === 0 ? (
        <Card className="items-center py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-gold-soft text-gold-ink">
            <Headphones className="size-7" aria-hidden />
          </span>
          <div className="grid gap-2">
            <h2 className="text-lg font-bold">No practice texts yet</h2>
            <p className="max-w-sm text-muted-foreground">
              {canManage
                ? "Add your first set with a text and an audio file. Students see it as soon as you publish it."
                : "Your teachers are preparing the first texts. Check back soon."}
            </p>
          </div>
          {canManage && (
            <Button asChild>
              <Link href="/admin/daily-practice">Add a set</Link>
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <div className="grid gap-1">
                  <CardTitle className="text-lg">Today&apos;s 20 minutes</CardTitle>
                  <CardDescription>
                    One new text, the last one again, and one older text. Repeating on different days is what makes
                    it stick.
                  </CardDescription>
                </div>
                {planSize > 0 && (
                  <Badge variant={doneCount === planSize ? "success" : "outline"}>
                    {doneCount === planSize && <Check aria-hidden />}
                    {doneCount} of {planSize} done
                  </Badge>
                )}
              </CardHeader>
              <ol className="grid gap-3">
                {plan.map((slot, i) => (
                  <li
                    key={slot.kind}
                    className={cn(
                      "flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center",
                      !slot.track && "opacity-70"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-full font-heading text-sm font-bold",
                        slot.doneToday ? "bg-success-soft text-success" : "bg-ink text-ink-foreground"
                      )}
                      aria-hidden
                    >
                      {slot.doneToday ? <Check className="size-4" /> : i + 1}
                    </span>
                    <div className="grid min-w-0 flex-1 gap-0.5">
                      <p className="text-[13px] font-medium text-muted-foreground">
                        {slot.label} · about {slot.minutes} min
                      </p>
                      <p className="truncate text-base font-semibold" lang={slot.track ? "de" : undefined}>
                        {slot.track ? slot.track.title : "Nothing here yet"}
                      </p>
                      <p className="text-[13px] text-muted-foreground">
                        {slot.track ? `${slot.track.setTitle} · ${slot.hint}` : slot.hint}
                      </p>
                    </div>
                    {slot.track && (
                      <Button asChild variant={slot.doneToday ? "outline" : "default"} className="sm:w-auto">
                        <Link href={`/practice/${slot.track.id}`}>
                          {slot.doneToday ? "Practise again" : "Start"}
                          <ArrowRight aria-hidden />
                        </Link>
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            </Card>

            <Card className="border-ink bg-ink text-ink-foreground">
              <div className="grid gap-1">
                <p className="text-[13px] font-medium text-gold-ink">How it works</p>
                <CardTitle className="text-lg text-ink-foreground">Three rounds with every text</CardTitle>
              </div>
              <ol className="grid gap-4">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="flex gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-background/40 text-gold-ink">
                      <s.icon className="size-[18px]" aria-hidden />
                    </span>
                    <div className="grid gap-0.5">
                      <p className="text-[15px] font-semibold">
                        {i + 1}. {s.title}
                      </p>
                      <p className="text-sm text-ink-foreground/75">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          <section className="grid gap-4" aria-labelledby="all-texts">
            <h2 id="all-texts" className="text-xl font-bold">
              All texts
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {sets
                .filter((s) => s.tracks.length > 0)
                .map((set) => {
                  const practised = set.tracks.filter((t) => t.days.length > 0).length;
                  return (
                    <Card key={set.id} className="gap-4">
                      <CardHeader>
                        <div className="grid gap-1">
                          <CardTitle className="text-lg" lang="de">
                            {set.title}
                          </CardTitle>
                          {set.description && <CardDescription>{set.description}</CardDescription>}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {!set.isPublished && <Badge variant="outline">Draft</Badge>}
                          <Badge variant="gold">{set.level}</Badge>
                        </div>
                      </CardHeader>
                      <p className="text-[13px] text-muted-foreground">
                        {practised} of {set.tracks.length} texts practised
                      </p>
                      <ul className="-mx-2 grid">
                        {set.tracks.map((t, i) => {
                          const last = lastPractisedLabel(t, today);
                          return (
                            <li key={t.id}>
                              <Link
                                href={`/practice/${t.id}`}
                                className="flex min-h-12 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted"
                              >
                                <span
                                  className={cn(
                                    "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                                    last ? "bg-success-soft text-success" : "bg-ink text-ink-foreground"
                                  )}
                                  aria-hidden
                                >
                                  {last ? <Check className="size-3.5" /> : i + 1}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-[15px] font-medium" lang="de">
                                  {t.title}
                                </span>
                                {!t.hasAudio && (
                                  <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
                                    <VolumeX className="size-3.5" aria-hidden /> No audio yet
                                  </span>
                                )}
                                <span className="shrink-0 text-[13px] text-muted-foreground">
                                  {last ? `Practised ${last}` : "New"}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </Card>
                  );
                })}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
