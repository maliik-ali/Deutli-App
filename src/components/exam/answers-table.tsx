"use client";

import { useState } from "react";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AnswerRow = { n: number; part: string; given: string | null; right: string; ok: boolean };
export type PartDots = { id: string; title: string; got: number; count: number; rows: AnswerRow[] };

const show = (v: string | null) => (v === "+" ? "+" : v === "-" ? "−" : v ? v.toUpperCase() : "–");

/** Round dots per part for an overview, then a table of the questions (mistakes first). */
export function AnswersTable({ parts }: { parts: PartDots[] }) {
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
          <div className="hidden grid-cols-[4rem_1.4fr_1fr_1fr] gap-4 border-b border-border pb-2 text-[13px] font-medium text-subtle-foreground md:grid">
            <span>No.</span>
            <span>Part</span>
            <span>Your answer</span>
            <span>Right answer</span>
          </div>
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.n} className="grid grid-cols-[3rem_1fr_auto] items-center gap-x-3 gap-y-1 py-3 text-[15px] md:grid-cols-[4rem_1.4fr_1fr_1fr] md:gap-4">
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
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
