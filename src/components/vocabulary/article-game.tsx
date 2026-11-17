"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Lightbulb, Volume2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LanguageCode } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { recordArticleAnswer } from "@/lib/vocabulary/actions";
import { ARTICLES, articleTip, type Article, type ArticleWord } from "@/lib/vocabulary/articles";
import { Meaning } from "./meanings";
import { speakGerman } from "./speak";

type Result = { word: ArticleWord; picked: Article; right: boolean };

/** Full-screen der/die/das game: see a noun, tap its article. */
export function ArticleGame({
  words,
  languages,
  label,
  backHref,
}: {
  words: ArticleWord[];
  languages: LanguageCode[];
  /** e.g. "A1 · Set 1" */
  label: string;
  backHref: string;
}) {
  const router = useRouter();
  const [round, setRound] = useState(words);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Article | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);

  const done = index >= round.length;
  const word = round[index];
  const first = languages.find((c) => word?.translations[c]) ?? languages[0];
  const progress = round.length ? Math.round(((index + (picked ? 1 : 0)) / round.length) * 100) : 0;

  const pick = useCallback(
    (article: Article) => {
      if (picked || !word) return;
      const right = article === word.article;
      setPicked(article);
      setResults((r) => [...r, { word, picked: article, right }]);
      speakGerman(`${word.article} ${word.noun}`);
      recordArticleAnswer({ id: word.id, kind: word.kind }, right)
        .then((r) => "error" in r && setSaveFailed(true))
        .catch(() => setSaveFailed(true));
    },
    [picked, word],
  );
  const next = useCallback(() => {
    setIndex((i) => i + 1);
    setPicked(null);
  }, []);

  // Keyboard: 1 / 2 / 3 (or d, i, a) to answer, Enter to continue.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!picked) {
        const i = ["1", "2", "3"].indexOf(e.key);
        if (i >= 0) pick(ARTICLES[i]);
      } else if (e.key === "Enter") {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked, pick, next]);

  function practiseMistakes() {
    setRound(results.filter((r) => !r.right).map((r) => r.word));
    setResults([]);
    setIndex(0);
    setPicked(null);
  }

  const right = results.filter((r) => r.right);
  const wrong = results.filter((r) => !r.right);
  const tip = word && picked ? articleTip(word) : null;

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex h-16 w-full items-center gap-2 px-2 sm:px-4">
          <span className="size-11 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[13px] text-muted-foreground">der, die oder das? · {label}</p>
            <p className="text-sm font-semibold tabular-nums">
              {done ? "Finished" : round.length ? `${index + 1} of ${round.length}` : "No words"}
            </p>
          </div>
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link href={backHref} aria-label="Close the game and go back to Vocabulary">
              <X className="size-5" aria-hidden />
            </Link>
          </Button>
        </div>
        <div
          className="h-1 bg-border"
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={done ? 100 : progress}
        >
          <div
            className="h-full bg-brand-gradient transition-[width] duration-300"
            style={{ width: `${done ? 100 : progress}%` }}
          />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col px-5 py-8">
          {round.length === 0 ? (
            <div className="m-auto grid max-w-sm gap-3 text-center">
              <h1 className="text-xl font-bold">No nouns to play with yet</h1>
              <p className="text-muted-foreground">
                This list has no nouns with an article. Try another topic or level.
              </p>
            </div>
          ) : done ? (
            <div className="grid gap-6">
              <div className="grid gap-4 text-center">
                <h1 className="text-[24px] leading-tight font-extrabold sm:text-[28px]">
                  {right.length === results.length
                    ? "Perfekt! Every article right."
                    : right.length >= results.length * 0.7
                      ? "Sehr gut! Almost all right."
                      : "Good practice! Articles take time."}
                </h1>
                <div className="grid gap-1">
                  <p className="text-sm text-muted-foreground">Right articles</p>
                  <p className="font-heading text-[40px] leading-none font-extrabold tabular-nums">
                    {right.length}/{results.length}
                  </p>
                </div>
              </div>
              {saveFailed && (
                <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
                  Some answers couldn&apos;t be saved. Check your internet; your score here is still right.
                </p>
              )}
              {wrong.length > 0 && (
                <section className="grid gap-3 rounded-2xl border border-border bg-card p-4">
                  <h2 className="text-[15px] font-bold text-answer-wrong">Learn these</h2>
                  <ul className="grid gap-2">
                    {wrong.map(({ word: w, picked: p }) => (
                      <li
                        key={w.id}
                        className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2"
                      >
                        <button
                          type="button"
                          onClick={() => speakGerman(`${w.article} ${w.noun}`)}
                          aria-label={`Listen to ${w.article} ${w.noun}`}
                          className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted hover:bg-gold-soft hover:text-gold-ink"
                        >
                          <Volume2 className="size-5" aria-hidden />
                        </button>
                        <span lang="de" className="min-w-0 flex-1 truncate font-semibold">
                          <span className="text-gold-ink">{w.article}</span> {w.noun}
                        </span>
                        <span className="text-[13px] text-subtle-foreground">
                          you chose <span lang="de">{p}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-8">
              <div className="grid justify-items-center gap-3 pt-4 text-center">
                <p className="text-[15px] font-semibold text-muted-foreground">Which article?</p>
                <p lang="de" className="font-heading text-[40px] leading-tight font-extrabold break-words sm:text-[52px]">
                  {picked ? (
                    <>
                      <span className={picked === word.article ? "text-answer-right" : "text-gold-ink"}>
                        {word.article}
                      </span>{" "}
                      {word.noun}
                    </>
                  ) : (
                    <>
                      <span className="text-subtle-foreground">___</span> {word.noun}
                    </>
                  )}
                </p>
                <Meaning code={first} text={word.translations[first]} className="text-lg text-muted-foreground" />
                {picked && word.plural && (
                  <p className="text-sm text-muted-foreground">
                    Plural: <span lang="de" className="text-foreground">die {word.plural}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3" role="group" aria-label="Choose the article">
                {ARTICLES.map((a, i) => {
                  const isRight = a === word.article;
                  const isPicked = picked === a;
                  return (
                    <button
                      key={a}
                      type="button"
                      lang="de"
                      onClick={() => pick(a)}
                      disabled={!!picked}
                      aria-pressed={isPicked}
                      aria-keyshortcuts={String(i + 1)}
                      className={cn(
                        "flex h-20 items-center justify-center rounded-2xl border border-border bg-card font-heading text-2xl font-extrabold transition-[transform,colors] duration-150 enabled:hover:border-gold-ink enabled:active:scale-95 sm:h-24 sm:text-[28px]",
                        picked && isRight && "border-answer-right bg-answer-right-soft text-answer-right",
                        isPicked && !isRight && "border-answer-wrong bg-answer-wrong-soft text-answer-wrong",
                        picked && !isRight && !isPicked && "opacity-50",
                      )}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>

              <div className="min-h-24" aria-live="polite">
                {picked && (
                  <div className="grid gap-3">
                    <p
                      className={cn(
                        "flex items-center justify-center gap-2 text-center font-semibold",
                        picked === word.article ? "text-answer-right" : "text-answer-wrong",
                      )}
                    >
                      {picked === word.article ? (
                        <>
                          <Check className="size-5" aria-hidden /> Richtig!
                        </>
                      ) : (
                        <>
                          Not quite. It&apos;s <span lang="de">{word.article} {word.noun}</span>.
                        </>
                      )}
                    </p>
                    {tip && (
                      <p className="flex items-start gap-2 rounded-xl bg-gold-soft px-4 py-3 text-sm text-foreground">
                        <Lightbulb className="mt-0.5 size-4 shrink-0 text-gold-ink" aria-hidden /> {tip}
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
            <Button asChild className="h-12 flex-1">
              <Link href={backHref}>Back to Vocabulary</Link>
            </Button>
          ) : done ? (
            <>
              {wrong.length > 0 && (
                <Button variant="outline" className="h-12 flex-1" onClick={practiseMistakes}>
                  Practise mistakes
                </Button>
              )}
              {/* A fresh page load picks 10 new nouns. */}
              <Button className="h-12 flex-1" onClick={() => router.refresh()}>
                Play again
              </Button>
            </>
          ) : (
            <Button className="h-12 flex-1" onClick={next} disabled={!picked}>
              {picked ? "Continue" : "Tap der, die or das"}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
