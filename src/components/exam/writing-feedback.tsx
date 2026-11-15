"use client";

import { useEffect, useState, useTransition } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requestWritingFeedback } from "@/lib/writing/actions";
import { CRITERION_LABELS, MAX_CHECKS, MISTAKE_LABELS, type Mistake, type MistakeType, type WritingFeedback } from "@/lib/writing/types";
import { cn } from "@/lib/utils";

const MARK: Record<MistakeType, string> = {
  grammar: "decoration-gold-ink",
  word_order: "decoration-brand-magenta",
  spelling: "decoration-destructive",
  style: "decoration-brand-cyan",
};
const STEPS = ["Reading your email…", "Checking grammar…", "Writing feedback…"];

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-semibold text-gold-ink">
      <Sparkles className="size-3" aria-hidden /> AI
    </span>
  );
}

/**
 * The writing part of the result page: a summary card (one of the three cards in the row),
 * then the teacher card and the certificate card passed in, then the full feedback below.
 */
export function WritingResult({ attemptId, text, words, initial, canCheck = true, teacher, certificate }: { attemptId: string; text: string; words: number; initial: WritingFeedback | null; canCheck?: boolean; teacher: React.ReactNode; certificate: React.ReactNode }) {
  const [feedback, setFeedback] = useState<WritingFeedback | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(0);

  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 3500);
    return () => clearInterval(t);
  }, [pending]);

  function run() {
    setError(null);
    setStep(0);
    start(async () => {
      const r = await requestWritingFeedback(attemptId);
      if ("error" in r) setError(r.error);
      else {
        setFeedback(r.feedback);
        setOpen(0);
      }
    });
  }

  const left = feedback ? MAX_CHECKS - feedback.checksUsed : MAX_CHECKS;
  const excerpt = text.trim().replace(/\s+/g, " ");

  const summary = (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <CardTitle>Your writing</CardTitle>
          <CardDescription>
            {words} words · Schriftlicher Ausdruck
          </CardDescription>
        </div>
        <AiBadge />
      </div>

      {words < 20 ? (
        <p className="text-[14px] text-muted-foreground">Write at least 20 words next time to get feedback.</p>
      ) : pending ? (
        <div className="grid gap-3" aria-live="polite" aria-busy="true">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-gold-ink" aria-hidden />
            <AnimatedShinyText className="text-[14px]">{STEPS[step]}</AnimatedShinyText>
          </div>
          <div className="grid gap-2" aria-hidden>
            <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          </div>
          <p className="text-[13px] text-muted-foreground">About 10 seconds. Your email is saved.</p>
        </div>
      ) : feedback ? (
        <>
          <p className="flex items-baseline gap-2">
            <strong className="text-4xl leading-none">{feedback.total}</strong>
            <span className="text-muted-foreground">of {feedback.max} · AI estimate</span>
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
            <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.round((feedback.total / feedback.max) * 100)}%` }} />
          </div>
          <p className="line-clamp-3 text-[14px] text-muted-foreground">{feedback.summary}</p>
        </>
      ) : (
        <p className="line-clamp-3 text-[14px] text-muted-foreground" lang="de">
          “{excerpt}”
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-[14px] text-destructive">
          {error}
        </p>
      )}

      {words >= 20 && !pending && (
        <div className="mt-auto flex flex-wrap items-center gap-2">
          {feedback ? (
            <>
              <Button asChild size="sm" variant="outline" className="h-11 sm:h-9">
                <a href="#writing-feedback">View full feedback</a>
              </Button>
              {canCheck && left > 0 && (
                <Button type="button" size="sm" variant="ghost" className="h-11 sm:h-9" onClick={run}>
                  <RefreshCw aria-hidden /> Check again ({left})
                </Button>
              )}
            </>
          ) : canCheck ? (
            <Button type="button" onClick={run}>
              <Sparkles aria-hidden /> {error ? "Try again" : "Check my writing"}
            </Button>
          ) : (
            <p className="text-[13px] text-muted-foreground">Your teacher checks this email, so the AI check is off.</p>
          )}
        </div>
      )}
      {words >= 20 && !feedback && !pending && canCheck && <p className="text-[12px] text-muted-foreground">You can check each exam up to {MAX_CHECKS} times.</p>}
    </Card>
  );

  // Text with the mistakes marked (full feedback).
  const marks = feedback ? feedback.mistakes.filter((m) => m.start >= 0 && m.end <= text.length && m.end > m.start) : [];
  const parts: React.ReactNode[] = [];
  let at = 0;
  marks.forEach((m, i) => {
    if (m.start < at) return;
    if (m.start > at) parts.push(text.slice(at, m.start));
    parts.push(
      <button
        key={i}
        type="button"
        onClick={() => setOpen(i)}
        aria-label={`${MISTAKE_LABELS[m.type]}: ${text.slice(m.start, m.end)}`}
        className={cn("rounded-sm underline decoration-2 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring", MARK[m.type], open === i && "bg-muted")}
      >
        {text.slice(m.start, m.end)}
      </button>,
    );
    at = m.end;
  });
  if (at < text.length) parts.push(text.slice(at));
  const current: Mistake | undefined = marks[open];
  const counts = (["word_order", "grammar", "spelling", "style"] as MistakeType[]).map((t) => [t, marks.filter((m) => m.type === t).length] as const).filter(([, n]) => n > 0);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {summary}
        {teacher}
        <div className="md:col-span-2 xl:col-span-1 [&>*]:h-full">{certificate}</div>
      </div>

      {feedback && (
        <div id="writing-feedback" className="grid scroll-mt-6 gap-6 lg:grid-cols-2">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Feedback by criterion</CardTitle>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-2.5 py-1 text-[12px] font-semibold text-gold-ink">
                <Sparkles className="size-3.5" aria-hidden /> AI estimate
              </span>
            </div>
            <ul className="divide-y divide-border">
              {feedback.criteria.map((c) => (
                <li key={c.id} className="grid gap-0.5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span>
                      {CRITERION_LABELS[c.id].en} <span className="text-muted-foreground">· {CRITERION_LABELS[c.id].de}</span>
                    </span>
                    <span className="font-semibold">
                      {c.score} / {c.max}
                    </span>
                  </div>
                  {c.note && <p className="text-[13px] text-muted-foreground">{c.note}</p>}
                </li>
              ))}
            </ul>
            <div className="grid gap-1.5">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.12em] text-subtle-foreground uppercase">
                <Sparkles className="size-3.5" aria-hidden /> AI summary
              </p>
              <p>{feedback.summary}</p>
            </div>
            <p className="text-[12px] text-muted-foreground">
              The AI can make mistakes. Grammar hints by{" "}
              <a href="https://languagetool.org" target="_blank" rel="noopener" className="underline underline-offset-2">
                LanguageTool
              </a>
              .
            </p>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] font-semibold tracking-[0.12em] text-subtle-foreground uppercase">Your email · tap a mark</p>
              {counts.length > 0 && (
                <p className="flex flex-wrap gap-3 text-[12px] text-muted-foreground">
                  {counts.map(([k, n]) => (
                    <span key={k} className="flex items-center gap-1.5">
                      <span className={cn("inline-block h-0.5 w-4 bg-current", k === "grammar" && "text-gold-ink", k === "word_order" && "text-brand-magenta", k === "spelling" && "text-destructive", k === "style" && "text-brand-cyan")} aria-hidden />
                      {MISTAKE_LABELS[k]} {n}
                    </span>
                  ))}
                </p>
              )}
            </div>
            <p className="text-[16px] leading-[1.9] whitespace-pre-wrap" lang="de">
              {parts}
            </p>
            {marks.length === 0 ? (
              <p className="text-[14px] text-success">No mistakes marked. Nice work.</p>
            ) : (
              current && (
                <div className="grid gap-1.5 border-t border-border pt-3" aria-live="polite">
                  <p className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em] text-subtle-foreground uppercase">
                    {MISTAKE_LABELS[current.type]}
                    {current.source === "ai" && <AiBadge />}
                  </p>
                  <p className="text-[15px]" lang="de">
                    <s className="text-destructive">{text.slice(current.start, current.end)}</s>
                    {current.fix && (
                      <>
                        <span className="mx-2 text-muted-foreground" aria-hidden>
                          →
                        </span>
                        <span className="sr-only"> corrected: </span>
                        <span className="text-success">{current.fix}</span>
                      </>
                    )}
                  </p>
                  <p className="text-[14px] text-muted-foreground">{current.message}</p>
                </div>
              )
            )}
          </Card>
        </div>
      )}
    </>
  );
}
