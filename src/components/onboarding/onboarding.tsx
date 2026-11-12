"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CircleHelp,
  Headphones,
  Layers,
  Mic,
  PenLine,
  Puzzle,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGUAGES, getLanguage, type LanguageCode } from "@/lib/languages";
import { completeOnboarding } from "@/lib/onboarding/actions";
import {
  EXAMS,
  GOALS,
  IMPROVE_GOAL,
  SKILLS,
  TIMELINES,
  skillById,
  type ExamId,
  type GoalId,
  type SkillId,
  type TimelineId,
} from "@/lib/onboarding/options";
import { cn } from "@/lib/utils";

const STEP_COUNT = 5;
const SKILL_ICONS: Record<SkillId, LucideIcon> = {
  lesen: BookOpen,
  sprachbausteine: Puzzle,
  hoeren: Headphones,
  schreiben: PenLine,
  sprechen: Mic,
  unsure: CircleHelp,
};
const TIMELINE_ICONS = { zap: Zap, trend: TrendingUp, layers: Layers, help: CircleHelp } as const;

/** A selectable card. "radio" = pick one, "check" = pick several. */
function Choice({
  selected,
  onClick,
  kind,
  className,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  kind: "radio" | "check";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role={kind === "radio" ? "radio" : "checkbox"}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-16 w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left transition-colors sm:p-5",
        selected ? "border-gold-ink bg-gold-soft" : "border-border hover:border-gold-ink/60 hover:bg-muted/40",
        className,
      )}
    >
      <span className="min-w-0 flex-1">{children}</span>
      <span
        aria-hidden
        className={cn(
          "grid size-6 shrink-0 place-items-center border-2 transition-colors",
          kind === "radio" ? "rounded-full" : "rounded-md",
          selected ? "border-gold bg-gold text-white" : "border-border",
        )}
      >
        {selected && <Check className="size-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}

function Heading({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid gap-2">
      <h1 className="text-[26px] leading-tight font-extrabold sm:text-[32px]">{title}</h1>
      <p className="text-[15px] text-muted-foreground sm:text-base">{text}</p>
    </div>
  );
}

const NONE = "none";

/** Dates as YYYY-MM-DD in the student's local time (no time-zone shift). */
function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fromIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function longDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" }).format(
    fromIso(iso),
  );
}

/** Dropdown of all languages, each shown in English and in its own script. */
function LanguageSelect({
  id,
  label,
  hint,
  value,
  onChange,
  exclude,
  optional,
}: {
  id: string;
  label: string;
  hint: string;
  value: LanguageCode | null;
  onChange: (code: LanguageCode | null) => void;
  exclude?: LanguageCode | null;
  optional?: boolean;
}) {
  const chosen = value ? getLanguage(value) : null;
  return (
    <div className="grid gap-2">
      <label id={`${id}-label`} htmlFor={id} className="text-[15px] font-semibold">
        {label}
        {optional && <span className="ml-1.5 font-normal text-subtle-foreground">(optional)</span>}
      </label>
      {/* No choice yet: "" shows the placeholder; the optional list starts on "None". */}
      <Select
        value={value ?? (optional ? NONE : "")}
        onValueChange={(v) => onChange(v === NONE || v === "" ? null : (v as LanguageCode))}
      >
        <SelectTrigger
          id={id}
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-hint`}
          className={cn(value && "border-gold-ink/60")}
        >
          <SelectValue placeholder="Choose a language" />
        </SelectTrigger>
        <SelectContent>
          {optional && <SelectItem value={NONE}>None</SelectItem>}
          {LANGUAGES.filter((l) => l.code !== exclude).map((l) => (
            <SelectItem key={l.code} value={l.code} textValue={l.name}>
              <span className="flex items-baseline gap-2">
                {l.name}
                {l.native !== l.name && (
                  <span
                    lang={l.code}
                    dir={l.rtl ? "rtl" : "ltr"}
                    className={cn("font-normal text-muted-foreground", l.code === "ur" && "urdu leading-none")}
                  >
                    {l.native}
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p id={`${id}-hint`} className="text-sm text-muted-foreground">
        {chosen && chosen.native !== chosen.name ? (
          <>
            Meanings will appear in{" "}
            <span
              lang={chosen.code}
              dir={chosen.rtl ? "rtl" : "ltr"}
              className={cn("text-foreground", chosen.code === "ur" && "urdu")}
            >
              {chosen.native}
            </span>
            .
          </>
        ) : (
          hint
        )}
      </p>
    </div>
  );
}

export function Onboarding({
  firstName,
  languages: initialLanguages,
  home,
}: {
  firstName: string | null;
  languages: LanguageCode[];
  home: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [first, setFirst] = useState<LanguageCode | null>(
    initialLanguages[0] && initialLanguages[0] !== "en" ? initialLanguages[0] : null,
  );
  const [second, setSecond] = useState<LanguageCode | null>(null);
  const [goals, setGoals] = useState<GoalId[]>([]);
  const [exam, setExam] = useState<ExamId | null>(null);
  const [timeline, setTimeline] = useState<TimelineId | null>(null);
  const [examDate, setExamDate] = useState("");
  const [focus, setFocus] = useState<SkillId[]>([]);
  const [emailTips, setEmailTips] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();

  const skills = SKILLS.filter((s) => !s.onlyFor || !exam || s.onlyFor.includes(exam));
  // Plans for the chosen worries, in the order they appear on the list ("not sure" only on its own).
  const chosen = skills.filter((s) => focus.includes(s.id));
  const plans = chosen.length ? chosen : [skillById("unsure")!];
  const start = plans[0].start;

  // Native language first, then the second one, then English (if there is room).
  function finalLanguages(): LanguageCode[] {
    if (!first) return initialLanguages;
    return [...new Set([first, second, "en"].filter(Boolean) as LanguageCode[])].slice(0, 3);
  }

  function go(next: number) {
    setError(null);
    setStep(Math.max(0, Math.min(STEP_COUNT - 1, next)));
    window.scrollTo({ top: 0 });
  }

  function toggleGoal(id: GoalId) {
    setGoals((g) => {
      if (id === "improve") return g.includes("improve") ? [] : ["improve"];
      const rest = g.filter((x) => x !== "improve");
      return rest.includes(id) ? rest.filter((x) => x !== id) : [...rest, id];
    });
  }

  function toggleFocus(id: SkillId) {
    setFocus((f) => {
      if (id === "unsure") return f.includes("unsure") ? [] : ["unsure"];
      const rest = f.filter((x) => x !== "unsure");
      return rest.includes(id) ? rest.filter((x) => x !== id) : [...rest, id];
    });
  }

  function finish(href: string) {
    setError(null);
    startBusy(async () => {
      const result = await completeOnboarding({
        languages: finalLanguages(),
        goals,
        exam,
        examTimeline: timeline,
        examDate: timeline === "date" && examDate ? examDate : null,
        focusSkills: chosen.map((s) => s.id),
        emailTips,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(href);
      router.refresh();
    });
  }

  const canContinue = [!!first, goals.length > 0, !!exam && (timeline !== "date" || !!examDate), focus.length > 0][
    step
  ];
  const skippable = step < STEP_COUNT - 1;
  const actionWidth = "w-full sm:w-80";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto grid h-16 w-full max-w-[1040px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 sm:px-6">
          <div className="flex items-center gap-1">
            {step > 0 && (
              <Button variant="ghost" size="icon" onClick={() => go(step - 1)} aria-label="Back">
                <ArrowLeft className="size-5" aria-hidden />
              </Button>
            )}
            <Logo href={home} className={cn("px-1", step > 0 && "max-sm:[&>span]:hidden")} />
          </div>
          <div
            className="flex items-center gap-1.5"
            role="progressbar"
            aria-label="Questions"
            aria-valuemin={1}
            aria-valuemax={STEP_COUNT}
            aria-valuenow={step + 1}
            aria-valuetext={`Step ${step + 1} of ${STEP_COUNT}`}
          >
            {Array.from({ length: STEP_COUNT }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === step ? "w-8 bg-brand-gradient" : "w-2",
                  i < step ? "bg-gold" : i > step && "bg-border",
                )}
              />
            ))}
          </div>
          <div className="flex justify-end">
            {skippable && (
              <Button variant="ghost" className="text-muted-foreground" onClick={() => go(step + 1)}>
                Skip
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1040px] content-start gap-8 px-4 py-8 sm:px-6 sm:py-10">
        {step === 0 && (
          // First screen: one centred column (heading, text and both dropdowns).
          <div className="mx-auto grid w-full max-w-xl gap-8 text-center sm:pt-6">
            <Heading
              title={firstName ? `Welcome to Deutli, ${firstName}!` : "Welcome to Deutli!"}
              text="Which languages do you speak? We'll show the meaning of new German words in them."
            />
            <div className="grid gap-6 text-left">
              <LanguageSelect
                id="first-language"
                label="My first language"
                hint="The language you know best."
                value={first}
                onChange={(code) => {
                  setFirst(code);
                  if (code && code === second) setSecond(null);
                }}
              />
              <LanguageSelect
                id="second-language"
                label="I also speak"
                hint="Saved words can show up to three meanings, for example Urdu and English."
                value={second}
                onChange={setSecond}
                exclude={first}
                optional
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <>
            <Heading
              title="What do you need your certificate for?"
              text="Pick everything that applies. This helps us guide your preparation."
            />
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {GOALS.map((g) => (
                  <Choice key={g.id} kind="check" selected={goals.includes(g.id)} onClick={() => toggleGoal(g.id)}>
                    <span className="font-semibold">{g.label}</span>{" "}
                    <span lang="de" className="text-muted-foreground">
                      ({g.de})
                    </span>
                  </Choice>
                ))}
              </div>
              <div
                className="flex items-center gap-4 py-1 text-[13px] font-semibold text-subtle-foreground"
                aria-hidden
              >
                <span className="h-px flex-1 bg-border" /> OR <span className="h-px flex-1 bg-border" />
              </div>
              <Choice kind="check" selected={goals.includes("improve")} onClick={() => toggleGoal(IMPROVE_GOAL.id)}>
                <span className="font-semibold">{IMPROVE_GOAL.label}</span>
              </Choice>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Heading title="Which exam are you preparing for?" text="We'll plan your practice around it." />
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="grid gap-3" role="radiogroup" aria-label="Exam">
                {EXAMS.map((e) => (
                  <Choice key={e.id} kind="radio" selected={exam === e.id} onClick={() => setExam(e.id)}>
                    <span className="flex items-center gap-4">
                      <span className="grid h-8 min-w-14 shrink-0 place-items-center rounded-lg bg-ink px-2 text-[13px] font-bold text-gold-ink">
                        {e.level}
                      </span>
                      <span className="grid min-w-0 gap-0.5">
                        <span className="font-semibold">{e.name}</span>
                        <span className="text-sm text-muted-foreground">{e.note}</span>
                      </span>
                    </span>
                  </Choice>
                ))}
              </div>

              <section className="grid gap-4 rounded-2xl border border-border bg-card p-5" aria-labelledby="exam-date">
                <div className="grid gap-1">
                  <h2
                    id="exam-date"
                    className="text-[13px] font-bold tracking-[0.12em] text-subtle-foreground uppercase"
                  >
                    Exam date
                  </h2>
                  <p className="text-sm text-muted-foreground">Helps us suggest your study pace.</p>
                </div>
                <div className="grid gap-3" role="radiogroup" aria-labelledby="exam-date">
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
                      timeline === "date" ? "border-gold-ink bg-gold-soft" : "border-border hover:border-gold-ink/60",
                    )}
                  >
                    <CalendarDays className="size-5 text-gold-ink" aria-hidden /> I have a specific date
                  </button>
                  {timeline === "date" && (
                    <div className="grid gap-1.5 text-sm">
                      <span id="exam-day-label" className="text-muted-foreground">
                        Exam day
                      </span>
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-labelledby="exam-day-label"
                            className={cn(
                              "flex h-12 items-center justify-between gap-2 rounded-xl border bg-background px-4 text-left text-[15px] outline-none transition-colors focus-visible:border-gold-ink",
                              examDate ? "border-gold-ink/60 text-foreground" : "border-border text-muted-foreground",
                            )}
                          >
                            {examDate ? longDate(examDate) : "Pick a date"}
                            <CalendarDays className="size-5 text-gold-ink" aria-hidden />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="end">
                          <Calendar
                            mode="single"
                            weekStartsOn={1}
                            selected={examDate ? fromIso(examDate) : undefined}
                            defaultMonth={examDate ? fromIso(examDate) : undefined}
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
        )}

        {step === 3 && (
          <>
            <Heading
              title="What worries you most about the exam?"
              text="Pick everything that applies. We'll show you how to tackle it."
            />
            <div className="grid gap-3">
              {skills.map((s) => {
                const Icon = SKILL_ICONS[s.id];
                return (
                  <Choice key={s.id} kind="check" selected={focus.includes(s.id)} onClick={() => toggleFocus(s.id)}>
                    <span className="flex items-center gap-4">
                      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
                        <Icon className="size-6" aria-hidden />
                      </span>
                      <span className="grid min-w-0 gap-0.5">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span lang={s.id === "unsure" ? undefined : "de"} className="text-[17px] font-bold">
                            {s.name}
                          </span>
                          {s.id !== "unsure" && <span className="text-sm text-muted-foreground">{s.english}</span>}
                        </span>
                        <span className="text-[15px] text-muted-foreground">{s.worry}</span>
                      </span>
                    </span>
                  </Choice>
                );
              })}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <Heading
              title={
                plans[0].id === "unsure"
                  ? "Your B1 exam at a glance"
                  : plans.length === 1
                    ? "Here's how to tackle it"
                    : `Here's how to tackle these ${plans.length}`
              }
              text={
                plans[0].id === "unsure"
                  ? "Four skills, one certificate."
                  : "A few tips for each, and how Deutli helps you practise."
              }
            />
            <div className="grid gap-4">
              {plans.map((plan) => {
                const Icon = SKILL_ICONS[plan.id];
                return (
                  <section key={plan.id} className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
                    <div className="flex items-center gap-4">
                      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
                        <Icon className="size-6" aria-hidden />
                      </span>
                      <h2 className="flex flex-wrap items-baseline gap-x-2">
                        <span lang={plan.id === "unsure" ? undefined : "de"} className="text-xl font-extrabold">
                          {plan.id === "unsure" ? "The four skills" : plan.name}
                        </span>
                        {plan.id !== "unsure" && <span className="text-muted-foreground">{plan.english}</span>}
                      </h2>
                    </div>
                    <p className="text-[15px] leading-relaxed text-muted-foreground">{plan.about}</p>
                    <ol className="grid gap-3 sm:grid-cols-2">
                      {plan.parts.map((p, i) => (
                        <li key={p.title} className="flex gap-3 rounded-xl bg-background/60 p-4">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink text-sm font-bold text-gold-ink">
                            {i + 1}
                          </span>
                          <span className="grid gap-0.5">
                            <span className="font-semibold">{p.title}</span>
                            <span className="text-sm text-muted-foreground">{p.text}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                    <p className="text-[15px] leading-relaxed">
                      <span className="font-semibold">How Deutli helps: </span>
                      {plan.help}
                    </p>
                  </section>
                );
              })}
            </div>

            <Choice kind="check" selected={emailTips} onClick={() => setEmailTips((v) => !v)}>
              <span className="grid gap-0.5">
                <span className="font-semibold">Study tips and reminders</span>
                <span className="text-[15px] text-muted-foreground">
                  An occasional email with exam tips and new features. Unsubscribe anytime.
                </span>
              </span>
            </Choice>

            {error && (
              <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </>
        )}

        {/* Same button on every step; on phones it stays at the bottom of the screen. */}
        <div className="sticky bottom-0 -mx-4 grid justify-items-center gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          {step < STEP_COUNT - 1 ? (
            <Button className={cn("h-12 text-base", actionWidth)} disabled={!canContinue} onClick={() => go(step + 1)}>
              Continue <ArrowRight aria-hidden />
            </Button>
          ) : (
            <>
              <Button className={cn("h-12 text-base", actionWidth)} disabled={busy} onClick={() => finish(start.href)}>
                {busy ? "Saving…" : "Start practising now"} <ArrowRight aria-hidden />
              </Button>
              <p className="text-sm text-muted-foreground">
                {start.label} · {start.detail}
              </p>
              <Button variant="ghost" size="sm" onClick={() => finish(home)} disabled={busy}>
                Go to my dashboard
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
