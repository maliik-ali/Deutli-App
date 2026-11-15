import Link from "next/link";
import { CheckCircle2, Timer } from "lucide-react";

import { BorderBeam } from "@/components/magicui/border-beam";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Readiness } from "@/lib/papers/readiness";
import { getLanguage, textProps, type LanguageCode } from "@/lib/languages";
import type { SavedWord } from "@/lib/practice/plan";
import { cn } from "@/lib/utils";

const SKILL_PAGE: Record<string, string> = {
  lesen: "reading",
  sprachbausteine: "reading",
  hoeren: "listening",
  schreiben: "writing",
  sprechen: "speaking",
};

/** B1 readiness from the student's own finished mock exams. */
export function ReadinessCard({ className, data }: { className?: string; data: Readiness }) {
  const focus = data.skills.find((s) => s.key === data.focusKey);
  return (
    <Card className={cn("relative", className)}>
      {/* one slow purple light around the featured card (hidden for people who prefer less motion) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] motion-reduce:hidden">
        <BorderBeam size={140} duration={9} colorFrom="#7161ff" colorTo="#cb3cff" borderWidth={1.5} />
      </div>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>B1 readiness</CardTitle>
          <CardDescription>
            {data.exams > 0 ? `From your ${data.exams} mock exam${data.exams === 1 ? "" : "s"}` : "Based on your mock exams"}
          </CardDescription>
        </div>
        <Badge variant="outline">{data.exams > 0 ? "From your results" : "No results yet"}</Badge>
      </CardHeader>
      <CardContent className="grid gap-6">
        {data.overall === null ? (
          <p className="text-[15px] text-muted-foreground">
            Solve a mock exam and your readiness shows up here, skill by skill.
          </p>
        ) : (
          <p className="flex items-baseline gap-2">
            <span className="font-heading text-[56px] leading-none font-extrabold tracking-tight">
              <NumberTicker value={data.overall} />%
            </span>
            <span className="text-sm text-muted-foreground">ready · pass mark 60%</span>
          </p>
        )}
        <ul className="grid gap-4">
          {data.skills.map((s) => (
            <li key={s.key} className="grid gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {s.name} <span className="font-normal text-subtle-foreground">· {s.english}</span>
                </span>
                <span className="flex items-center gap-2 font-semibold">
                  {s.key === data.focusKey && <Badge variant="gold">Focus</Badge>}
                  {s.value === null ? <span className="font-normal text-subtle-foreground">Not marked yet</span> : `${s.value}%`}
                </span>
              </div>
              <Progress value={s.value ?? 0} tone={s.key === data.focusKey ? "gold" : "ink"} aria-label={s.value === null ? `${s.name} not marked yet` : `${s.name} ${s.value}%`} />
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full sm:w-auto">
          {focus ? (
            <Link href={`/dashboard/exam/${SKILL_PAGE[focus.key]}`}>Practise {focus.name}</Link>
          ) : (
            <Link href="/dashboard/exam">{data.exams > 0 ? "Take another mock exam" : "Start a mock exam"}</Link>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}


export type LatestWriting = { slug: string; title: string; attemptId: string; words: number; aiTotal: number | null; teacherTotal: number | null; summary: string | null } | null;

/** The student's latest writing result: the teacher's score if there is one, else the AI estimate. */
export function WritingFeedbackCard({ className, latest }: { className?: string; latest: LatestWriting }) {
  const link = latest ? `/dashboard/exam/mock/${latest.slug}/result?a=${latest.attemptId}` : "/dashboard/exam";
  const score = latest?.teacherTotal ?? latest?.aiTotal ?? null;
  return (
    <Card className={className}>
      <CardHeader>
        <div className="grid gap-1">
          <p className="text-[13px] font-medium text-subtle-foreground">Writing feedback</p>
          <CardTitle className="text-lg">{latest ? `Your email · ${latest.title}` : "Get feedback on your writing"}</CardTitle>
          {latest && <CardDescription>Schriftlicher Ausdruck · {latest.words} words</CardDescription>}
        </div>
        {latest && latest.teacherTotal != null && (
          <Badge variant="success">
            <CheckCircle2 aria-hidden /> Teacher reviewed
          </Badge>
        )}
      </CardHeader>
      <CardContent className="grid gap-4">
        {latest && score != null ? (
          <>
            <p className="flex items-baseline gap-2">
              <span className="font-heading text-[44px] leading-none font-extrabold">{score}</span>
              <span className="text-muted-foreground">of 45 · {latest.teacherTotal != null ? "your teacher's score" : "AI estimate"}</span>
            </p>
            {latest.summary && <p className="line-clamp-3 text-[15px] text-muted-foreground">{latest.summary}</p>}
          </>
        ) : latest ? (
          <p className="text-[15px] text-muted-foreground">Your email is saved. Open your result to check it with the AI or ask a teacher.</p>
        ) : (
          <p className="text-[15px] text-muted-foreground">Solve a mock exam and write the email. You will see an AI estimate with your mistakes marked, and you can ask a teacher to check it too.</p>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline">
          <Link href={link}>{latest ? "View full feedback" : "Go to mock exams"}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export type MockSummary = { slug: string; title: string; last: { id: string; total: number; max: number } | null } | null;

/** Next mock exam: the first free paper, with the student's last score if they already took it. */
export function MockExamCard({ className, mock }: { className?: string; mock: MockSummary }) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="grid gap-1">
          <p className="text-[13px] font-medium text-subtle-foreground">Mock exam</p>
          <CardTitle className="text-lg">{mock ? `telc B1 · ${mock.title}` : "Mock exams"}</CardTitle>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
          <Timer className="size-5" aria-hidden />
        </span>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm text-muted-foreground">
        <p>Reading, grammar and listening · 3 h 10 min with writing</p>
        <p>
          {mock?.last
            ? `Last score: ${mock.last.total} of ${mock.last.max} points.`
            : mock
              ? "Not taken yet. Find a quiet place and set aside the full time."
              : "Mock exams will appear here."}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild variant={mock?.last ? "outline" : "default"}>
          <Link href={mock ? `/dashboard/exam/mock/${mock.slug}` : "/dashboard/exam"}>{mock?.last ? "Take it again" : "Start"}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

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


/** The student's own saved words (from Improve Accent and the mock exam papers). */
export function TodaysWordsCard({ className, saved = [], languages = ["en"] }: { className?: string; saved?: SavedWord[]; languages?: LanguageCode[] }) {
  const cols = { gridTemplateColumns: `1.3fr repeat(${languages.length}, minmax(0, 1fr))` };
  return (
    <Card className={className}>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>Your saved words</CardTitle>
          <CardDescription>{saved.length > 0 ? "The newest words you saved while reading." : "Select a word in a text to save it with its meaning."}</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm" className="h-11 sm:h-9">
          <Link href="/dashboard/vocabulary">{saved.length > 0 ? "Practise" : "Open vocabulary"}</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {saved.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-[15px] text-muted-foreground">
            No saved words yet. Try Improve Accent or a mock exam paper: select a German word and tap Save or Translate.
          </p>
        ) : (
          <>
            <div style={cols} className="hidden gap-4 border-b border-border pb-2 text-[13px] font-medium text-subtle-foreground md:grid">
              <span>German</span>
              {languages.map((code) => (
                <span key={code} className={cn(textProps(code).dir === "rtl" && "text-right")}>
                  {getLanguage(code)?.name ?? code}
                </span>
              ))}
            </div>
            <ul className="divide-y divide-border">
              {saved.map((w) => (
                <li key={w.id} className="grid gap-1 py-3 md:items-center md:gap-4 md:[grid-template-columns:var(--cols)]" style={{ "--cols": cols.gridTemplateColumns } as React.CSSProperties}>
                  <span lang="de" className="text-[15px] font-semibold">
                    {w.word}
                  </span>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 md:contents">
                    {languages.map((code, i) => (
                      <Meaning key={code} code={code} text={w.translations[code]} first={i === 0} />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
