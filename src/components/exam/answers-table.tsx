"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { explainAnswer, type Explanation } from "@/lib/papers/explain";
import { EXPLAIN_ENABLED } from "@/lib/papers/features";
import { cn } from "@/lib/utils";

export type AnswerRow = { n: number; part: string; given: string | null; right: string; ok: boolean; listening?: boolean };
export type PartDots = { id: string; title: string; got: number; count: number; rows: AnswerRow[] };

const show = (v: string | null) => (v === "+" ? "+" : v === "-" ? "−" : v ? v.toUpperCase() : "–");

/** Round dots per part for an overview, then a table of the questions (mistakes first). */
function Why({ attemptId, row }: { attemptId: string; row: AnswerRow }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Explanation | null>(null);
  const [lang, setLang] = useState<"en" | "ur">("en");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  if (row.listening) return <span className="text-[12px] text-muted-foreground">Listening: soon</span>;
  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !data && !busy) {
      setError(null);
      start(async () => {
        const r = await explainAnswer(attemptId, row.n);
        if ("error" in r) setError(r.error);
        else setData(r.explanation);
      });
    }
  }
  return (
    <>
      <button type="button" onClick={toggle} aria-expanded={open} className="inline-flex h-9 w-fit items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-semibold text-gold-ink hover:bg-muted">
        <Sparkles className="size-3.5" aria-hidden /> Why?
      </button>
      {open && (
        <div className="col-span-full grid gap-2 rounded-xl bg-muted/60 p-4 text-[14px]" aria-live="polite">
          {busy && (
            <div className="grid gap-2" aria-busy="true">
              <span className="flex items-center gap-2 text-gold-ink">
                <Sparkles className="size-4" aria-hidden /> AI is explaining…
              </span>
              <span className="h-3 w-full animate-pulse rounded bg-muted" />
              <span className="h-3 w-4/5 animate-pulse rounded bg-muted" />
            </div>
          )}
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          {data && (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-semibold text-gold-ink">
                  <Sparkles className="size-3" aria-hidden /> AI explanation
                </span>
                <span role="tablist" aria-label="Language" className="flex gap-1 rounded-full bg-card p-0.5">
                  {(["en", "ur"] as const).map((l) => (
                    <button key={l} type="button" role="tab" aria-selected={lang === l} onClick={() => setLang(l)} className={cn("h-8 rounded-full px-3 text-[12px] font-semibold", lang === l ? "bg-gold text-gold-foreground" : "text-muted-foreground")}>
                      {l === "en" ? "English" : "اردو"}
                    </button>
                  ))}
                </span>
              </div>
              {lang === "ur" && !data.ur ? (
                <p className="text-muted-foreground">No Urdu version yet.</p>
              ) : (
                <p className={cn("leading-relaxed whitespace-pre-wrap", lang === "ur" && "urdu text-[16px]")} dir={lang === "ur" ? "rtl" : undefined}>
                  {data[lang]}
                </p>
              )}
              <p className="text-[12px] text-muted-foreground">The AI can make mistakes. Check with your teacher if you are not sure.</p>
            </>
          )}
        </div>
      )}
    </>
  );
}

export function AnswersTable({ attemptId, parts }: { attemptId: string; parts: PartDots[] }) {
  const all = parts.flatMap((p) => p.rows);
  const wrong = all.filter((r) => !r.ok && r.given);
  const skipped = all.filter((r) => !r.given);
  const tabs = [
    { id: "mistakes", label: `Mistakes (${wrong.length + skipped.length})`, rows: [...wrong, ...skipped].sort((a, b) => a.n - b.n) },
    { id: "all", label: `All (${all.length})`, rows: all },
  ] as const;
  const [tab, setTab] = useState<"mistakes" | "all">(wrong.length + skipped.length > 0 ? "mistakes" : "all");
  const rows = tabs.find((t) => t.id === tab)!.rows;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <CardTitle>Your answers</CardTitle>
          <CardDescription>
            {all.length - wrong.length - skipped.length} right · {wrong.length} wrong · {skipped.length} skipped
          </CardDescription>
        </div>
        <div role="tablist" aria-label="Show" className="flex gap-1 rounded-full bg-muted p-1">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cn("h-9 rounded-full px-4 text-[13px] font-semibold transition-colors", tab === t.id ? "bg-gold text-gold-foreground" : "text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Answers by part">
        {parts.map((p) => (
          <li key={p.id} className="grid gap-1.5">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="text-muted-foreground">{p.title}</span>
              <span className="font-semibold tabular-nums">
                {p.got}/{p.count}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {p.rows.map((r) => (
                <span key={r.n} title={`Question ${r.n}`} className={cn("size-3.5 rounded-full", r.ok ? "bg-success" : r.given ? "bg-destructive" : "bg-muted-foreground/40")} />
              ))}
            </div>
          </li>
        ))}
      </ul>

      {rows.length === 0 ? (
        <p className="rounded-xl bg-success/10 px-4 py-6 text-center text-[15px] text-success">No mistakes. Every answer was right!</p>
      ) : (
        <div>
          <div className={cn("hidden gap-4 border-b border-border pb-2 text-[13px] font-medium text-subtle-foreground md:grid", EXPLAIN_ENABLED ? "grid-cols-[4rem_1.4fr_1fr_1fr_7rem]" : "grid-cols-[4rem_1.4fr_1fr_1fr]")}>
            <span>No.</span>
            <span>Part</span>
            <span>Your answer</span>
            <span>Right answer</span>
            {EXPLAIN_ENABLED && <span>Explanation</span>}
          </div>
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.n} className={cn("grid grid-cols-[3rem_1fr_auto] items-center gap-x-3 gap-y-2 py-3 text-[15px] md:gap-4", EXPLAIN_ENABLED ? "md:grid-cols-[4rem_1.4fr_1fr_1fr_7rem]" : "md:grid-cols-[4rem_1.4fr_1fr_1fr]")}>
                <span className="font-bold">{String(r.n).padStart(2, "0")}</span>
                <span className="text-muted-foreground">{r.part}</span>
                <span className={cn("font-semibold md:order-none", r.ok ? "text-success" : r.given ? "text-destructive" : "text-muted-foreground")}>
                  <span className="md:hidden text-[12px] font-normal text-subtle-foreground">You: </span>
                  {show(r.given)}
                </span>
                <span className="col-start-2 font-semibold text-success md:col-start-auto">
                  <span className="md:hidden text-[12px] font-normal text-subtle-foreground">Right: </span>
                  {show(r.right)}
                </span>
                {EXPLAIN_ENABLED && <Why attemptId={attemptId} row={r} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
