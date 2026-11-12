import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, Clock, Mic, Sparkles, Timer, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { continueLearning, homeworkFeedback, mockExam, readiness, speakingClub, todaysWords } from "@/lib/sample-data";
import { getLanguage, textProps, type LanguageCode } from "@/lib/languages";
import type { SavedWord } from "@/lib/practice/plan";
import { cn } from "@/lib/utils";

export function ReadinessCard({ className }: { className?: string }) {
  const focus = readiness.skills.filter((s) => s.focus).map((s) => s.name);
  return (
    <Card className={className}>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>B1 readiness</CardTitle>
          <CardDescription>AI estimate · last 30 days</CardDescription>
        </div>
        <Badge variant="outline">Estimate</Badge>
      </CardHeader>
      <CardContent className="grid gap-6">
        <p className="flex items-baseline gap-2">
          <span className="font-heading text-[56px] leading-none font-extrabold tracking-tight">
            {readiness.overall}%
          </span>
          <span className="text-sm text-muted-foreground">ready · pass mark 60%</span>
        </p>
        <ul className="grid gap-4">
          {readiness.skills.map((s) => (
            <li key={s.name} className="grid gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {s.name} <span className="font-normal text-subtle-foreground">· {s.english}</span>
                </span>
                <span className="flex items-center gap-2 font-semibold">
                  {s.focus && <Badge variant="gold">Focus</Badge>}
                  {s.value}%
                </span>
              </div>
              <Progress value={s.value} tone={s.focus ? "gold" : "ink"} aria-label={`${s.name} ${s.value}%`} />
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/dashboard/course">Practise {focus[0]}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function HomeworkFeedbackCard({ className }: { className?: string }) {
  const h = homeworkFeedback;
  return (
    <Card className={className}>
      <CardHeader className="flex-col-reverse sm:flex-row">
        <div className="grid gap-1">
          <p className="text-[13px] font-medium text-subtle-foreground">Homework feedback</p>
          <CardTitle className="text-lg">{h.title}</CardTitle>
          <CardDescription>
            {h.task} · {h.submitted}
          </CardDescription>
        </div>
        <Badge variant="success">
          <CheckCircle2 aria-hidden /> Teacher reviewed
        </Badge>
      </CardHeader>

      <CardContent className="grid gap-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border p-4">
            <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Sparkles className="size-3.5" aria-hidden /> AI estimate
            </p>
            <p className="mt-1 font-heading text-2xl font-extrabold">
              {h.aiScore}
              <span className="text-base font-semibold text-subtle-foreground">/{h.maxScore}</span>
            </p>
          </div>
          <div className="rounded-xl border border-ink bg-ink p-4 text-ink-foreground">
            <p className="flex items-center gap-1.5 text-[13px] text-ink-foreground/75">
              <CheckCircle2 className="size-3.5" aria-hidden /> Teacher score
            </p>
            <p className="mt-1 font-heading text-2xl font-extrabold">
              {h.teacherScore}
              <span className="text-base font-semibold text-ink-foreground/70">/{h.maxScore}</span>
            </p>
          </div>
        </div>

        <figure className="grid gap-2 rounded-xl bg-background p-4">
          <blockquote className="text-[15px] leading-relaxed">“{h.comment}”</blockquote>
          <figcaption className="text-[13px] text-muted-foreground">— {h.teacher}, your teacher</figcaption>
        </figure>

        <div className="grid gap-2">
          <p className="text-[13px] font-medium text-muted-foreground">Corrections</p>
          <ul className="grid gap-2">
            {h.corrections.map((c) => (
              <li key={c.wrong} className="flex flex-wrap items-center gap-2 text-sm" lang="de">
                <span className="rounded-md bg-destructive-soft px-2 py-0.5 text-destructive line-through">
                  {c.wrong}
                </span>
                <span className="inline-flex items-center gap-2">
                  <ArrowRight className="size-3.5 text-subtle-foreground" aria-label="corrected to" />
                  <span className="rounded-md bg-success-soft px-2 py-0.5 font-medium text-success">{c.right}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>

      <CardFooter>
        <Button asChild variant="outline">
          <Link href="/dashboard/homework">View full feedback</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function ContinueLearningCard({ className }: { className?: string }) {
  const c = continueLearning;
  return (
    <Card className={cn("border-ink bg-ink text-ink-foreground", className)}>
      <CardHeader>
        <div className="grid gap-1">
          <p className="text-[13px] font-medium text-gold">Continue learning · {c.chapter}</p>
          <CardTitle className="text-lg text-ink-foreground">{c.title}</CardTitle>
          <p className="text-sm text-ink-foreground/70">{c.lesson}</p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="flex justify-between text-[13px] text-ink-foreground/75">
          <span>{c.progress}% done</span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden /> {c.minutesLeft} min left
          </span>
        </div>
        <Progress
          value={c.progress}
          tone="gold"
          className="bg-ink-foreground/15"
          aria-label={`Lesson ${c.progress}% done`}
        />
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link href="/dashboard/course">Continue</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function SpeakingClubCard({ className }: { className?: string }) {
  const s = speakingClub;
  return (
    <Card className={className}>
      <CardHeader>
        <div className="grid gap-1">
          <p className="text-[13px] font-medium text-subtle-foreground">Speaking club</p>
          <CardTitle className="text-lg" lang="de">
            {s.topic}
          </CardTitle>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
          <Mic className="size-5" aria-hidden />
        </span>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <CalendarClock className="size-4" aria-hidden /> {s.when}
        </p>
        <p className="flex items-center gap-2">
          <Users className="size-4" aria-hidden /> With {s.host} · {s.spotsLeft} of {s.spotsTotal} spots left
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link href="/dashboard/speaking-club">Join</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function MockExamCard({ className }: { className?: string }) {
  const m = mockExam;
  return (
    <Card className={className}>
      <CardHeader>
        <div className="grid gap-1">
          <p className="text-[13px] font-medium text-subtle-foreground">Mock exam</p>
          <CardTitle className="text-lg">{m.title}</CardTitle>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
          <Timer className="size-5" aria-hidden />
        </span>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm text-muted-foreground">
        <p>{m.details}</p>
        <p>
          {m.lastAttempt
            ? `Last score: ${m.lastAttempt.score}%`
            : "Not taken yet. Find a quiet place and set aside the full time."}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline">
          <Link href="/dashboard/mock-exams">Start</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

/** One meaning in the words table, in the right script, direction and font. */
function Meaning({ code, text, first }: { code: LanguageCode; text: string | null | undefined; first: boolean }) {
  const props = textProps(code);
  if (!text) {
    return (
      <span
        className={cn(
          "text-sm text-muted-foreground",
          !first && "hidden md:block",
          props.dir === "rtl" && "md:text-right",
        )}
      >
        {first ? "No meaning yet" : "—"}
      </span>
    );
  }
  return (
    <span
      lang={props.lang}
      dir={props.dir}
      className={cn(
        "min-w-0 text-sm text-muted-foreground md:text-[15px]",
        props.dir === "rtl" && "text-right",
        props.className,
        code === "ur" && "text-lg text-foreground md:text-lg",
      )}
    >
      {text}
    </span>
  );
}

export function TodaysWordsCard({
  className,
  saved = [],
  languages = ["en"],
}: {
  className?: string;
  saved?: SavedWord[];
  languages?: LanguageCode[];
}) {
  // German column + one column per language the student chose.
  const cols = {
    gridTemplateColumns: `1.3fr repeat(${languages.length}, minmax(0, 1fr))`,
  };
  const sampleMeaning = (w: (typeof todaysWords)[number], code: string) =>
    code === "en" ? w.english : code === "ur" ? w.urdu : null;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>Today&apos;s words</CardTitle>
          <CardDescription>
            {saved.length > 0 && `${saved.length} saved by you in Daily Practice · `}
            Kapitel 7 · Wohnen — {todaysWords.length} new words
          </CardDescription>
        </div>
        <Button asChild variant="outline" size="sm" className="h-11 sm:h-9">
          <Link href="/dashboard/vocabulary">Practise</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div
          style={cols}
          className="hidden gap-4 border-b border-border pb-2 text-[13px] font-medium text-subtle-foreground md:grid"
        >
          <span>German</span>
          {languages.map((code) => (
            <span key={code} className={cn(textProps(code).dir === "rtl" && "text-right")}>
              {getLanguage(code)?.name ?? code}
            </span>
          ))}
        </div>
        <ul className="divide-y divide-border">
          {saved.map((w) => (
            <li
              key={w.id}
              className="grid gap-1 py-3 md:items-center md:gap-4 md:[grid-template-columns:var(--cols)]"
              style={{ "--cols": cols.gridTemplateColumns } as React.CSSProperties}
            >
              <span lang="de" className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                {w.word}
                <Badge variant="gold">Saved</Badge>
              </span>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 md:contents">
                {languages.map((code, i) => (
                  <Meaning key={code} code={code} text={w.translations[code]} first={i === 0} />
                ))}
              </div>
            </li>
          ))}
          {todaysWords.map((w) => (
            <li
              key={w.noun}
              className="grid gap-1 py-3 md:items-center md:gap-4 md:[grid-template-columns:var(--cols)]"
              style={{ "--cols": cols.gridTemplateColumns } as React.CSSProperties}
            >
              <span lang="de" className="text-[15px]">
                <span className="text-muted-foreground">{w.article}</span>{" "}
                <span className="font-semibold">{w.noun}</span>
              </span>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 md:contents">
                {languages.map((code, i) => (
                  <Meaning key={code} code={code} text={sampleMeaning(w, code)} first={i === 0} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
