"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Volume2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LanguageCode } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { recordVerbAnswer } from "@/lib/vocabulary/actions";
import type { VerbQuestion } from "@/lib/verbs/game";
import { Meaning } from "./meanings";
import { speakGerman } from "./speak";

const ASK_LABEL = { praeteritum: "Präteritum", perfekt: "Perfekt", preposition: "Which preposition?" } as const;
type Result = { q: VerbQuestion; picked: string; right: boolean };

/** The sentence shown after an answer: the forms of the verb, or the verb with its preposition. */
function summary(q: VerbQuestion) {
  if (q.ask === "preposition") return `${q.german} ${q.answer}${q.verbCase ? ` + ${q.verbCase}` : ""}`;
  return [q.praesens, q.praeteritum, q.perfekt].filter(Boolean).join(" · ");
}

/** Full-screen verb game: forms (Präteritum, Perfekt) or the preposition a verb takes. */
export function VerbGame({ questions, languages, label, backHref }: { questions: VerbQuestion[]; languages: LanguageCode[]; label: string; backHref: string }) {
  const router = useRouter();
  const [round, setRound] = useState(questions);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);

  const done = index >= round.length;
  const q = round[index];
  const first = q ? (languages.find((c) => q.translations[c]) ?? "en") : "en";
  const progress = round.length ? Math.round(((index + (picked ? 1 : 0)) / round.length) * 100) : 0;

  const pick = useCallback(
    (option: string) => {
      if (picked || !q) return;
      const right = option === q.answer;
      setPicked(option);
      setResults((r) => [...r, { q, picked: option, right }]);
      speakGerman(q.ask === "preposition" ? `${q.german} ${q.answer}` : (q[q.ask] ?? q.german));
      recordVerbAnswer(q.verbId, right).then((r) => "error" in r && setSaveFailed(true)).catch(() => setSaveFailed(true));
    },
    [picked, q],
  );
  const next = useCallback(() => {
    setIndex((i) => i + 1);
    setPicked(null);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!picked && q) {
        const i = Number(e.key) - 1;
        if (i >= 0 && i < q.options.length) pick(q.options[i]);
      } else if (e.key === "Enter") {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked, q, pick, next]);

  function practiseMistakes() {
    setRound(results.filter((r) => !r.right).map((r) => r.q));
    setResults([]);
    setIndex(0);
    setPicked(null);
  }

  const right = results.filter((r) => r.right);
  const wrong = results.filter((r) => !r.right);

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex h-16 w-full items-center gap-2 px-2 sm:px-4">
          <span className="size-11 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[13px] text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold tabular-nums">{done ? "Finished" : round.length ? `${index + 1} of ${round.length}` : "No verbs"}</p>
          </div>
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link href={backHref} aria-label="Close the game and go back to Verbs"><X className="size-5" aria-hidden /></Link>
          </Button>
        </div>
        <div className="h-1 bg-border" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={done ? 100 : progress}>
          <div className="h-full bg-brand-gradient transition-[width] duration-300" style={{ width: `${done ? 100 : progress}%` }} />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col px-5 py-8">
          {round.length === 0 ? (
            <div className="m-auto grid max-w-sm gap-3 text-center">
              <h1 className="text-xl font-bold">No verbs to play with yet</h1>
              <p className="text-muted-foreground">The verbs list is empty. Please check back soon.</p>
            </div>
          ) : done ? (
            <div className="grid gap-6">
              <div className="grid gap-4 text-center">
                <h1 className="text-[24px] leading-tight font-extrabold sm:text-[28px]">
                  {right.length === results.length ? "Perfekt! Every answer right." : right.length >= results.length * 0.7 ? "Sehr gut! Almost all right." : "Good practice! Verbs take time."}
                </h1>
                <div className="grid gap-1">
                  <p className="text-sm text-muted-foreground">Right answers</p>
                  <p className="font-heading text-[40px] leading-none font-extrabold tabular-nums">{right.length}/{results.length}</p>
                </div>
              </div>
              {saveFailed && <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">Some answers couldn&apos;t be saved. Check your internet; your score here is still right.</p>}
              {wrong.length > 0 && (
                <section className="grid gap-3 rounded-2xl border border-border bg-card p-4">
                  <h2 className="text-[15px] font-bold text-answer-wrong">Learn these</h2>
                  <ul className="grid gap-2">
                    {wrong.map(({ q: w, picked: p }) => (
                      <li key={w.key} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
                        <button type="button" onClick={() => speakGerman(w.ask === "preposition" ? `${w.german} ${w.answer}` : (w[w.ask] ?? w.german))} aria-label={`Listen to ${w.german}`} className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted hover:bg-gold-soft hover:text-gold-ink">
                          <Volume2 className="size-5" aria-hidden />
                        </button>
                        <span lang="de" className="min-w-0 flex-1 text-[14px]"><span className="font-semibold">{w.german}</span><br /><span className="text-muted-foreground">{summary(w)}</span></span>
                        <span className="text-[13px] text-subtle-foreground">you chose <span lang="de">{p}</span></span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-8">
              <div className="grid justify-items-center gap-3 pt-4 text-center">
                <p className="text-[15px] font-semibold text-muted-foreground">{ASK_LABEL[q.ask]}</p>
                <p lang="de" className="font-heading text-[40px] leading-tight font-extrabold break-words sm:text-[52px]">
                  {q.german}
                  {q.ask === "preposition" && (
                    <span className={picked ? (picked === q.answer ? " text-answer-right" : " text-gold-ink") : " text-subtle-foreground"}> {picked ? q.answer : "___"}</span>
                  )}
                </p>
                <Meaning code={first as LanguageCode} text={q.translations[first]} className="text-lg text-muted-foreground" />
                {q.ask !== "preposition" && q.praesens && <p lang="de" className="text-sm text-muted-foreground">{q.praesens}</p>}
              </div>

              <div className={cn("grid gap-3", q.options.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2")} role="group" aria-label="Choose the answer">
                {q.options.map((o, i) => {
                  const isRight = o === q.answer;
                  const isPicked = picked === o;
                  return (
                    <button
                      key={o}
                      type="button"
                      lang="de"
                      onClick={() => pick(o)}
                      disabled={!!picked}
                      aria-pressed={isPicked}
                      aria-keyshortcuts={String(i + 1)}
                      className={cn(
                        "flex min-h-16 items-center justify-center rounded-2xl border border-border bg-card px-3 py-3 text-center font-heading text-xl font-extrabold break-words transition-[transform,colors] duration-150 enabled:hover:border-gold-ink enabled:active:scale-95 sm:min-h-20",
                        picked && isRight && "border-answer-right bg-answer-right-soft text-answer-right",
                        isPicked && !isRight && "border-answer-wrong bg-answer-wrong-soft text-answer-wrong",
                        picked && !isRight && !isPicked && "opacity-50",
                      )}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>

              <div className="min-h-24" aria-live="polite">
                {picked && (
                  <div className="grid gap-3">
                    <p className={cn("flex items-center justify-center gap-2 text-center font-semibold", picked === q.answer ? "text-answer-right" : "text-answer-wrong")}>
                      {picked === q.answer ? <><Check className="size-5" aria-hidden /> Richtig!</> : <span>Not quite. It&apos;s <span lang="de">{q.answer}</span>.</span>}
                    </p>
                    <p lang="de" className="text-center text-sm text-muted-foreground">{summary(q)}</p>
                    {q.exampleDe && (
                      <p className="rounded-xl bg-gold-soft px-4 py-3 text-sm text-foreground">
                        <span lang="de">{q.exampleDe}</span>
                        {q.exampleTranslations[first] && <><br /><Meaning code={first as LanguageCode} text={q.exampleTranslations[first]} className="text-muted-foreground" /></>}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="shrink-0 border-t border-border bg-card">
        <div className="mx-auto flex w-full max-w-[560px] gap-3 p-4 sm:px-5">
          {round.length === 0 ? (
            <Button asChild className="h-12 flex-1"><Link href={backHref}>Back to Verbs</Link></Button>
          ) : done ? (
            <>
              {wrong.length > 0 && <Button variant="outline" className="h-12 flex-1" onClick={practiseMistakes}>Practise mistakes</Button>}
              <Button className="h-12 flex-1" onClick={() => router.refresh()}>Play again</Button>
            </>
          ) : (
            <Button className="h-12 flex-1" onClick={next} disabled={!picked}>{picked ? "Continue" : "Choose an answer"}</Button>
          )}
        </div>
      </footer>
    </div>
  );
}
