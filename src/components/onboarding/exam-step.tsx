"use client";

import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EXAMS, TIMELINES } from "@/lib/onboarding/options";
import { cn } from "@/lib/utils";
import { TIMELINE_ICONS, Choice, Heading, toIso, fromIso, startOfToday, longDate } from "./onboarding-ui";
import type { OnboardingState } from "./use-onboarding-state";

export function ExamStep({ st }: { st: OnboardingState }) {
  const {
    exam,
    setExam,
    timeline,
    setTimeline,
    examDate,
    setExamDate,
    calendarOpen,
    setCalendarOpen,
  } = st;
  return (
          <>
            <Heading
              title="Which exam are you preparing for?"
              text="We'll plan your practice around it."
            />
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="grid gap-3" role="radiogroup" aria-label="Exam">
                {EXAMS.map((e) => (
                  <Choice
                    key={e.id}
                    kind="radio"
                    selected={exam === e.id}
                    onClick={() => setExam(e.id)}
                  >
                    <span className="flex items-center gap-4">
                      <span className="grid h-8 min-w-14 shrink-0 place-items-center rounded-lg bg-ink px-2 text-[13px] font-bold text-gold-ink">
                        {e.level}
                      </span>
                      <span className="grid min-w-0 gap-0.5">
                        <span className="font-semibold">{e.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {e.note}
                        </span>
                      </span>
                    </span>
                  </Choice>
                ))}
              </div>

              <section
                className="grid gap-4 rounded-2xl border border-border bg-card p-5"
                aria-labelledby="exam-date"
              >
                <div className="grid gap-1">
                  <h2
                    id="exam-date"
                    className="text-[13px] font-bold tracking-[0.12em] text-subtle-foreground uppercase"
                  >
                    Exam date
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Helps us suggest your study pace.
                  </p>
                </div>
                <div
                  className="grid gap-3"
                  role="radiogroup"
                  aria-labelledby="exam-date"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={timeline === "date"}
                    onClick={() => {
                      setTimeline("date");
                      if (!examDate) setCalendarOpen(true);
                    }}
                    className={cn(
                      "flex h-14 items-center gap-3 rounded-xl border px-4 text-left font-semibold transition-colors",
                      timeline === "date"
                        ? "border-gold-ink bg-gold-soft"
                        : "border-border hover:border-gold-ink/60",
                    )}
                  >
                    <CalendarDays
                      className="size-5 text-gold-ink"
                      aria-hidden
                    />{" "}
                    I have a specific date
                  </button>
                  {timeline === "date" && (
                    <div className="grid gap-1.5 text-sm">
                      <span
                        id="exam-day-label"
                        className="text-muted-foreground"
                      >
                        Exam day
                      </span>
                      <Popover
                        open={calendarOpen}
                        onOpenChange={setCalendarOpen}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-labelledby="exam-day-label"
                            className={cn(
                              "flex h-12 items-center justify-between gap-2 rounded-xl border bg-background px-4 text-left text-[15px] outline-none transition-colors focus-visible:border-gold-ink",
                              examDate
                                ? "border-gold-ink/60 text-foreground"
                                : "border-border text-muted-foreground",
                            )}
                          >
                            {examDate ? longDate(examDate) : "Pick a date"}
                            <CalendarDays
                              className="size-5 text-gold-ink"
                              aria-hidden
                            />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="end">
                          <Calendar
                            mode="single"
                            weekStartsOn={1}
                            selected={examDate ? fromIso(examDate) : undefined}
                            defaultMonth={
                              examDate ? fromIso(examDate) : undefined
                            }
                            disabled={{ before: startOfToday() }}
                            startMonth={startOfToday()}
                            onSelect={(d) => {
                              if (!d) return;
                              setExamDate(toIso(d));
                              setCalendarOpen(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {TIMELINES.map((t) => {
                      const Icon = TIMELINE_ICONS[t.icon];
                      return (
                        <button
                          key={t.id}
                          type="button"
                          role="radio"
                          aria-checked={timeline === t.id}
                          onClick={() => setTimeline(t.id)}
                          className={cn(
                            "grid min-h-24 content-center justify-items-center gap-2 rounded-xl border px-2 text-center text-sm font-semibold transition-colors",
                            timeline === t.id
                              ? "border-gold-ink bg-gold-soft"
                              : "border-border hover:border-gold-ink/60",
                          )}
                        >
                          <Icon className="size-5 text-gold-ink" aria-hidden />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>
          </>
  );
}
