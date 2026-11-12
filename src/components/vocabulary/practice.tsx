"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Lightbulb, Volume2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { recordReview } from "@/lib/vocabulary/actions";
import { Meaning } from "./meanings";
import { speakGerman } from "./speak";

export type PracticeWord = {
  id: string;
  word: string;
  head: string;
  translations: Record<string, string>;
  context: string | null;
  box: number;
};

type Step = { word: PracticeWord; kind: "card" | "choose"; options: PracticeWord[] };

const BACK = "/dashboard/vocabulary";

/** Same "random" order on the server and in the browser (no flicker), different per word. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
function shuffle<T>(list: T[], seed: string): T[] {
  const rand = seeded(seed);
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** New words are shown as cards first; words seen before become "choose the right meaning". */
function buildSteps(words: PracticeWord[], distractors: PracticeWord[], first: LanguageCode, round: number): Step[] {
  return words.map((word) => {
    const meaning = word.translations[first];
    const others = shuffle(
      distractors.filter((d) => d.id !== word.id && d.translations[first] && d.translations[first] !== meaning),
      `${word.id}-${round}`,
    );
    const unique = others.filter(
      (d, i) => others.findIndex((o) => o.translations[first] === d.translations[first]) === i,
    );
    if (round === 0 && word.box >= 1 && meaning && unique.length >= 2) {
      return { word, kind: "choose", options: shuffle([word, ...unique.slice(0, 3)], `${word.id}-opts-${round}`) };
    }
    return { word, kind: "card", options: [] };
  });
}

/** Shows the sentence the word came from, with the word highlighted. */
function Sentence({ text, word }: { text: string; word: string }) {
  const i = text.toLowerCase().indexOf(word.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[5px] bg-gold/40 px-0.5 text-inherit">{text.slice(i, i + word.length)}</mark>
      {text.slice(i + word.length)}
    </>
  );
}

function SpeakButton({ text, label, className }: { text: string; label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => speakGerman(text)}
      aria-label={label}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-foreground transition-colors hover:bg-gold-soft hover:text-gold-ink",
        className,
      )}
    >
      <Volume2 className="size-5" aria-hidden />
    </button>
  );
}

function Meanings({ word, languages }: { word: PracticeWord; languages: LanguageCode[] }) {
  const present = languages.filter((c) => word.translations[c]);
  if (present.length === 0)
    return <p className="text-center text-muted-foreground">No meaning saved for this word yet.</p>;
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-lg">
      {present.map((c) => (
        <Meaning key={c} code={c} text={word.translations[c]} className="text-foreground" />
      ))}
    </div>
  );
}

export function VocabPractice({
  words,
  distractors,
  languages,
  setLabel,
}: {
  words: PracticeWord[];
  distractors: PracticeWord[];
  languages: LanguageCode[];
  setLabel: string;
}) {
  const first = languages[0];
  const [round, setRound] = useState(0);
  const [steps, setSteps] = useState(() => buildSteps(words, distractors, first, 0));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<{ word: PracticeWord; right: boolean }[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);

  const done = index >= steps.length;
  const step = steps[index];
  const progress = steps.length ? Math.round((Math.min(index, steps.length) / steps.length) * 100) : 0;

  function answer(right: boolean) {
    const w = step.word;
    setResults((r) => [...r, { word: w, right }]);
    recordReview(w.id, right)
      .then((r) => "error" in r && setSaveFailed(true))
      .catch(() => setSaveFailed(true));
  }
  function next() {
    setIndex((i) => i + 1);
    setRevealed(false);
    setPicked(null);
  }
  function pick(option: PracticeWord) {
    if (picked) return;
    setPicked(option.id);
    answer(option.id === step.word.id);
  }
  function practiseMistakes() {
    const wrong = results.filter((r) => !r.right).map((r) => r.word);
    const nextRound = round + 1;
    setRound(nextRound);
    setSteps(buildSteps(wrong, distractors, first, nextRound));
    setResults([]);
    setIndex(0);
    setRevealed(false);
    setPicked(null);
  }

  const right = results.filter((r) => r.right);
  const wrong = results.filter((r) => !r.right);

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-[640px] items-center gap-2 px-2 sm:px-4">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link href={BACK} aria-label="Close and go back to Vocabulary">
              <X className="size-5" aria-hidden />
            </Link>
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[13px] text-muted-foreground">Practise words · {setLabel}</p>
            <p className="text-sm font-semibold tabular-nums">
              {done ? "Finished" : steps.length ? `${index + 1} of ${steps.length}` : "No words"}
            </p>
          </div>
          <span className="size-11 shrink-0" aria-hidden />
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
          {steps.length === 0 ? (
            <div className="m-auto grid max-w-sm gap-3 text-center">
              <h1 className="text-xl font-bold">Nothing to practise here</h1>
              <p className="text-muted-foreground">
                There are no words in this list right now. Come back tomorrow, or practise all your words.
              </p>
            </div>
          ) : done ? (
            <div className="grid gap-6">
              <div className="grid gap-4 text-center">
                <h1 className="text-[24px] leading-tight font-extrabold sm:text-[28px]">
                  {right.length >= results.length * 0.7
                    ? "Awesome! Keep learning and challenge yourself!"
                    : "Good effort! These words will come back soon."}
                </h1>
                <div className="grid gap-1">
                  <p className="text-sm text-muted-foreground">Answered correctly</p>
                  <p className="font-heading text-[40px] leading-none font-extrabold tabular-nums">
                    {right.length}/{results.length}
                  </p>
                </div>
              </div>
              {saveFailed && (
                <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
                  Some answers couldn&apos;t be saved. Check your internet; those words will come back next time.
                </p>
              )}
              {[
                { title: "Incorrect", list: wrong, tone: "text-destructive" },
                { title: "Correct", list: right, tone: "text-success" },
              ]
                .filter((g) => g.list.length > 0)
                .map((g) => (
                  <section key={g.title} className="grid gap-3 rounded-2xl border border-border bg-card p-4">
                    <h2 className={cn("text-[15px] font-bold", g.tone)}>{g.title}</h2>
                    <ul className="grid gap-2">
                      {g.list.map(({ word }) => (
                        <li
                          key={word.id}
                          className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2"
                        >
                          <SpeakButton text={word.head} label={`Listen to ${word.head}`} className="size-10" />
                          <span lang="de" className="min-w-0 flex-1 truncate font-semibold">
                            {word.head}
                          </span>
                          <Meaning
                            code={first}
                            text={word.translations[first]}
                            className="truncate text-muted-foreground"
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
            </div>
          ) : step.kind === "card" ? (
            <div className="flex flex-1 flex-col gap-8">
              <p className="text-center text-[15px] font-semibold text-muted-foreground">
                {step.word.box === 0 ? "A word you saved" : "Do you remember this word?"}
              </p>
              <div className="grid justify-items-center gap-3">
                <SpeakButton text={step.word.head} label={`Listen to ${step.word.head}`} />
                <p
                  lang="de"
                  className="text-center font-heading text-[40px] leading-tight font-extrabold break-words sm:text-[52px]"
                >
                  {step.word.head}
                </p>
              </div>
              <div className="min-h-16">
                {revealed ? (
                  <Meanings word={step.word} languages={languages} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-4 text-muted-foreground transition-colors hover:border-gold-ink hover:text-foreground"
                  >
                    <Lightbulb className="size-[18px]" aria-hidden /> Think of the meaning, then tap to check
                  </button>
                )}
              </div>
              {step.word.context && (
                <div className="mt-auto grid gap-3 rounded-2xl border border-border bg-card p-4">
                  <p lang="de" className="text-[17px] leading-relaxed font-semibold">
                    <Sentence text={step.word.context} word={step.word.word} />
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRevealed(true)}
                      aria-label="Show the meaning"
                      className="grid size-11 place-items-center rounded-xl bg-muted text-foreground transition-colors hover:bg-gold-soft hover:text-gold-ink"
                    >
                      <Lightbulb className="size-5" aria-hidden />
                    </button>
                    <SpeakButton text={step.word.context} label="Listen to the sentence" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-8">
              <p className="text-center text-[15px] font-semibold text-muted-foreground">
                Choose the correct translation
              </p>
              <div className="flex items-center justify-center gap-3">
                <SpeakButton text={step.word.head} label={`Listen to ${step.word.head}`} />
                <p
                  lang="de"
                  className="font-heading text-[36px] leading-tight font-extrabold break-words sm:text-[44px]"
                >
                  {step.word.head}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3" role="group" aria-label="Possible meanings">
                {step.options.map((o) => {
                  const isRight = o.id === step.word.id;
                  const isPicked = picked === o.id;
                  const second = languages[1];
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => pick(o)}
                      disabled={!!picked}
                      aria-pressed={isPicked}
                      className={cn(
                        "flex min-h-28 flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left text-[15px] transition-colors enabled:hover:border-gold-ink",
                        picked && isRight && "border-success bg-success-soft",
                        isPicked && !isRight && "border-destructive bg-destructive-soft",
                      )}
                    >
                      <Meaning code={first} text={o.translations[first]} className="text-foreground" />
                      {second && o.translations[second] && (
                        <Meaning
                          code={second}
                          text={o.translations[second]}
                          className="self-end text-muted-foreground"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              {picked && (
                <p
                  role="status"
                  className={cn(
                    "flex items-center justify-center gap-2 text-center font-semibold",
                    picked === step.word.id ? "text-success" : "text-destructive",
                  )}
                >
                  {picked === step.word.id ? (
                    <>
                      <Check className="size-5" aria-hidden /> Richtig! That&apos;s right.
                    </>
                  ) : (
                    <>Not quite. It means “{step.word.translations[first]}”.</>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="shrink-0 border-t border-border bg-card">
        <div className="mx-auto flex w-full max-w-[560px] gap-3 p-4 sm:px-5">
          {steps.length === 0 ? (
            <Button asChild className="h-12 flex-1">
              <Link href="/vocabulary/practice?set=all">Practise all words</Link>
            </Button>
          ) : done ? (
            <>
              {wrong.length > 0 && (
                <Button variant="outline" className="h-12 flex-1" onClick={practiseMistakes}>
                  Practise mistakes
                </Button>
              )}
              <Button asChild className="h-12 flex-1">
                <Link href={BACK}>Close</Link>
              </Button>
            </>
          ) : step.kind === "card" ? (
            revealed ? (
              <>
                <Button
                  variant="outline"
                  className="h-12 flex-1"
                  onClick={() => {
                    answer(false);
                    next();
                  }}
                >
                  Try again later
                </Button>
                <Button
                  className="h-12 flex-1"
                  onClick={() => {
                    answer(true);
                    next();
                  }}
                >
                  I knew it
                </Button>
              </>
            ) : (
              <Button className="h-12 flex-1" onClick={() => setRevealed(true)}>
                Show meaning
              </Button>
            )
          ) : (
            <Button className="h-12 flex-1" onClick={next} disabled={!picked}>
              {picked ? "Continue" : `Tap the meaning in ${getLanguage(first)?.name ?? "your language"}`}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
