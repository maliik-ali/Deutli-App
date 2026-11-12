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
import { LANGUAGES, type LanguageCode } from "@/lib/languages";
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

const STEP_COUNT = 6;
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
  const [focus, setFocus] = useState<SkillId | null>(null);
  const [emailTips, setEmailTips] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();

  const today = new Date().toISOString().slice(0, 10);
  const skills = SKILLS.filter((s) => !s.onlyFor || !exam || s.onlyFor.includes(exam));
  const plan = skillById(focus) ?? skillById("unsure")!;
  const PlanIcon = SKILL_ICONS[plan.id];

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

  function finish(href: string) {
    setError(null);
    startBusy(async () => {
      const result = await completeOnboarding({
        languages: finalLanguages(),
        goals,
        exam,
        examTimeline: timeline,
        examDate: timeline === "date" && examDate ? examDate : null,
        focusSkill: focus,
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

  const canContinue = [!!first, true, goals.length > 0, !!exam && (timeline !== "date" || !!examDate), !!focus, true][
    step
  ];
  const skippable = step < STEP_COUNT - 1;

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
              <Button variant="ghost" className="text-muted-foreground" onClick={() => go(step === 0 ? 2 : step + 1)}>
                Skip
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1040px] content-start gap-8 px-4 py-8 sm:px-6 sm:py-10">
        {step === 0 && (
          <>
            <Heading
              title={
                firstName
                  ? `Welcome to Deutli, ${firstName}! What's your first language?`
                  : "What's your first language?"
              }
              text="We'll show the meaning of new German words in your language."
            />
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="First language">
              {LANGUAGES.map((l) => (
                <Choice key={l.code} kind="radio" selected={first === l.code} onClick={() => setFirst(l.code)}>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">{l.name}</span>
                    {l.native !== l.name && (
                      <span
                        lang={l.code}
                        dir={l.rtl ? "rtl" : "ltr"}
                        className={cn("text-muted-foreground", l.code === "ur" && "urdu text-lg leading-none")}
                      >
                        {l.native}
                      </span>
                    )}
                  </span>
                </Choice>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Heading
              title="Do you know another language?"
              text="Optional. Saved words can show up to three meanings, for example Urdu and English."
            />
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Second language">
              {LANGUAGES.filter((l) => l.code !== first).map((l) => (
                <Choice
                  key={l.code}
                  kind="radio"
                  selected={second === l.code}
                  onClick={() => setSecond(second === l.code ? null : l.code)}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">{l.name}</span>
                    {l.native !== l.name && (
                      <span
                        lang={l.code}
                        dir={l.rtl ? "rtl" : "ltr"}
                        className={cn("text-muted-foreground", l.code === "ur" && "urdu text-lg leading-none")}
                      >
                        {l.native}
                      </span>
                    )}
                  </span>
                </Choice>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
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

        {step === 3 && (
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
                    onClick={() => setTimeline("date")}
                    className={cn(
                      "flex h-14 items-center gap-3 rounded-xl border px-4 text-left font-semibold transition-colors",
                      timeline === "date" ? "border-gold-ink bg-gold-soft" : "border-border hover:border-gold-ink/60",
                    )}
                  >
                    <CalendarDays className="size-5 text-gold-ink" aria-hidden /> I have a specific date
                  </button>
                  {timeline === "date" && (
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-muted-foreground">Exam day</span>
                      <input
                        type="date"
                        min={today}
                        value={examDate}
                        onChange={(e) => setExamDate(e.target.value)}
                        className="h-12 rounded-xl border border-input bg-background px-3 text-[15px] [color-scheme:dark] outline-none focus-visible:border-gold-ink"
                      />
                    </label>
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
                            "grid min-h-24 justify-items-center content-center gap-2 rounded-xl border px-2 text-center text-sm font-semibold transition-colors",
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

        {step === 4 && (
          <>
            <Heading title="What worries you most about the exam?" text="We'll show you how to tackle it." />
            <div className="grid gap-3" role="radiogroup" aria-label="Biggest worry">
              {skills.map((s) => {
                const Icon = SKILL_ICONS[s.id];
                return (
                  <Choice key={s.id} kind="radio" selected={focus === s.id} onClick={() => setFocus(s.id)}>
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

        {step === 5 && (
          <>
            <div className="flex items-center gap-4">
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gold-soft text-gold-ink">
                <PlanIcon className="size-8" aria-hidden />
              </span>
              <div className="grid gap-0.5">
                <h1
                  lang={plan.id === "unsure" ? undefined : "de"}
                  className="text-[26px] leading-tight font-extrabold sm:text-[32px]"
                >
                  {plan.id === "unsure" ? "Your B1 exam at a glance" : plan.name}
                </h1>
                <p className="text-muted-foreground">
                  {plan.id === "unsure" ? "Four skills, one certificate" : plan.english}
                </p>
              </div>
            </div>
            <p className="max-w-3xl text-[17px] leading-relaxed">{plan.about}</p>
            <ol className="divide-y divide-border rounded-2xl border border-border bg-card">
              {plan.parts.map((p, i) => (
                <li key={p.title} className="flex gap-4 p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink font-heading font-bold text-gold-ink">
                    {i + 1}
                  </span>
                  <span className="grid gap-1">
                    <span className="font-semibold">{p.title}</span>
                    <span className="text-[15px] text-muted-foreground">{p.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="max-w-3xl text-[17px] leading-relaxed">
              <span className="font-semibold">How Deutli helps: </span>
              {plan.help}
            </p>

            <Choice kind="check" selected={emailTips} onClick={() => setEmailTips((v) => !v)} className="bg-card">
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

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => finish(plan.start.href)}
                disabled={busy}
                className="flex min-h-20 w-full items-center justify-between gap-4 rounded-2xl bg-brand-gradient px-6 py-4 text-left text-white transition-opacity hover:opacity-95 disabled:opacity-60"
              >
                <span className="grid gap-0.5">
                  <span className="text-lg font-bold">{busy ? "Saving…" : "Start practising now"}</span>
                  <span className="text-[15px] text-white/85">
                    {plan.start.label} · {plan.start.detail}
                  </span>
                </span>
                <ArrowRight className="size-6 shrink-0" aria-hidden />
              </button>
              <Button variant="ghost" className="justify-self-center" onClick={() => finish(home)} disabled={busy}>
                Go to my dashboard
              </Button>
            </div>
          </>
        )}

        {step < 5 && (
          <Button className="h-14 w-full text-base" disabled={!canContinue} onClick={() => go(step + 1)}>
            Continue <ArrowRight aria-hidden />
          </Button>
        )}
      </main>
    </div>
  );
}
