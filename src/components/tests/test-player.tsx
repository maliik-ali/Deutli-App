"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveTestAnswers, submitTest } from "@/lib/tests/actions";

type Q = { id: string; kind: "mc" | "tf" | "fill"; prompt: string; options: string[]; points: number };
type Answers = Record<string, number | boolean | string>;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Takes a chapter test: timer, autosave a moment after each change, hand in. The real time left always shows. */
export function TestPlayer({ testId, attemptId, questions, initial, deadlineMs, title }: { testId: string; attemptId: string; questions: Q[]; initial: Answers; deadlineMs: number | null; title: string }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(initial);
  const [left, setLeft] = useState<number | null>(() => (deadlineMs ? Math.max(0, Math.round((deadlineMs - Date.now()) / 1000)) : null));
  const [saved, setSaved] = useState<"saved" | "saving" | "error">("saved");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const latest = useRef(answers);
  useEffect(() => {
    latest.current = answers;
  }, [answers]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef(false);

  const hand = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setError(null);
    start(async () => {
      const r = await submitTest(attemptId, latest.current);
      if ("error" in r) {
        done.current = false;
        setError("We couldn't hand in your test. Check your internet and try again. Your answers are saved.");
      } else router.replace(`/dashboard/tests/${testId}/result`);
    });
  }, [attemptId, router, testId]);

  // Autosave 1.2 s after the last change.
  function change(id: string, v: number | boolean | string) {
    const nextAnswers = { ...answers, [id]: v };
    setAnswers(nextAnswers);
    setSaved("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const r = await saveTestAnswers(attemptId, nextAnswers);
      setSaved("error" in r ? "error" : "saved");
    }, 1200);
  }

  useEffect(() => {
    if (!deadlineMs) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        clearInterval(t);
        hand();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [deadlineMs, hand]);

  const answered = questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== "").length;

  return (
    <div className="grid gap-6">
      <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 backdrop-blur md:top-0">
        <span className="font-bold">{title}</span>
        <span className="flex items-center gap-4 text-[14px]">
          <span className="text-muted-foreground">{answered} of {questions.length} answered</span>
          <span className="text-muted-foreground" role="status">{saved === "saving" ? "Saving…" : saved === "error" ? "Not saved. Check your internet." : "Saved"}</span>
          {left !== null && <span className={`inline-flex items-center gap-1.5 font-mono text-[16px] font-bold ${left < 60 ? "text-destructive" : ""}`}><Clock className="size-4" aria-hidden />{fmt(left)}</span>}
        </span>
      </div>

      <ol className="grid gap-4">
        {questions.map((q, i) => (
          <li key={q.id} className="grid gap-3 rounded-2xl border border-border bg-card p-5">
            <p className="font-semibold"><span className="text-muted-foreground">{i + 1}. </span>{q.kind === "fill" ? q.prompt.split("___").map((part, pi, arr) => <span key={pi}>{part}{pi < arr.length - 1 && <span className="mx-1 inline-block w-24 border-b-2 border-gold-ink align-baseline" aria-hidden />}</span>) : q.prompt}</p>
            {q.kind === "mc" && (
              <div role="radiogroup" aria-label={`Question ${i + 1}`} className="grid gap-2">
                {q.options.map((o, oi) => (
                  <label key={oi} className="relative">
                    <input type="radio" className="peer sr-only" name={q.id} checked={answers[q.id] === oi} onChange={() => change(q.id, oi)} />
                    <span className="flex min-h-11 cursor-pointer items-center rounded-xl border border-input bg-background px-4 text-[15px] peer-checked:border-gold-ink peer-checked:bg-gold-soft peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">{o}</span>
                  </label>
                ))}
              </div>
            )}
            {q.kind === "tf" && (
              <div role="radiogroup" aria-label={`Question ${i + 1}`} className="flex gap-2">
                {([[true, "True"], [false, "False"]] as const).map(([val, label]) => (
                  <label key={label} className="relative">
                    <input type="radio" className="peer sr-only" name={q.id} checked={answers[q.id] === val} onChange={() => change(q.id, val)} />
                    <span className="inline-flex h-11 cursor-pointer items-center rounded-full border border-input bg-background px-6 text-[14px] font-semibold peer-checked:border-gold-ink peer-checked:bg-gold-soft peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">{label}</span>
                  </label>
                ))}
              </div>
            )}
            {q.kind === "fill" && <Input aria-label={`Answer to question ${i + 1}`} value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : ""} onChange={(e) => change(q.id, e.target.value)} maxLength={300} autoComplete="off" spellCheck={false} className="max-w-sm" />}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="lg" disabled={busy} onClick={() => { if (answered === questions.length || window.confirm(`You answered ${answered} of ${questions.length}. Hand in anyway?`)) hand(); }}>{busy ? "Handing in…" : "Hand in"}</Button>
        {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
      </div>
    </div>
  );
}
