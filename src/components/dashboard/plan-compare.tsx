"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";

import { ProRequest } from "@/components/dashboard/pro-request";
import { BorderBeam } from "@/components/magicui/border-beam";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { buyProWithCard } from "@/lib/pro/actions";
import { cn } from "@/lib/utils";

/** One Pro plan as the page shows it (prices are worked out on the server). */
export type PlanView = {
  id: string;
  months: number;
  /** Whole price, e.g. "Rs. 14,388". */
  total: string;
  /** Price per month, e.g. "Rs. 1,199". */
  perMonth: string;
  /** What they save against paying month by month, e.g. "Rs. 9,600", or null. */
  save: string | null;
  savePct: number | null;
};

type Cell = { on: boolean; note?: string; soon?: boolean };
type Row = { label: string; free: Cell; pro: Cell };

/** Only things that exist are ticked. What is still being built carries a "Soon" tag. */
const ROWS: Row[] = [
  { label: "Full telc B1 mock exams", free: { on: true, note: "1 free exam" }, pro: { on: true, note: "Every exam, new ones as we publish them" } },
  { label: "Marked on screen with answer review", free: { on: true, note: "Reading, grammar and listening" }, pro: { on: true, note: "Reading, grammar and listening" } },
  { label: "AI explanation of answers", free: { on: true, note: "“Why?” on reading and grammar" }, pro: { on: true, note: "“Why?” on reading and grammar" } },
  { label: "AI writing check", free: { on: true, note: "Grammar hints and a score estimate" }, pro: { on: true, note: "Grammar hints and a score estimate" } },
  { label: "Vocabulary lists and word games", free: { on: true, note: "A1 list, 861 words" }, pro: { on: true, note: "A1 now. A2, B1 and B2 lists", soon: true } },
  { label: "Improve Accent: speak along", free: { on: true, note: "Listen, read and speak" }, pro: { on: true, note: "Listen, read and speak" } },
  { label: "Certificate for your result", free: { on: true, note: "For the free exam" }, pro: { on: true, note: "For every exam" } },
  { label: "Grammar lessons and exercises", free: { on: false }, pro: { on: true, note: "Short lessons with practice", soon: true } },
  { label: "Speaking practice in small groups", free: { on: false }, pro: { on: true, note: "With students at your level", soon: true } },
];

function FeatureList({ side }: { side: "free" | "pro" }) {
  return (
    <ul className="grid gap-1">
      {ROWS.map((row) => {
        const cell = row[side];
        return (
          <li key={row.label} className="flex min-h-12 items-start gap-3 py-1.5">
            {cell.on ? (
              <Check className={cn("mt-0.5 size-5 shrink-0", side === "pro" ? "text-gold-ink" : "text-success")} aria-label="Included" />
            ) : (
              <X className="mt-0.5 size-5 shrink-0 text-subtle-foreground" aria-label="Not included" />
            )}
            <span className="grid min-w-0 gap-0.5">
              <span className={cn("text-[15px] font-medium", !cell.on && "text-subtle-foreground")}>{row.label}</span>
              {cell.note && (
                <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                  {cell.note}
                  {cell.soon && <Badge variant="gold" className="py-0">Soon</Badge>}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function PlanCompare({ plans, isPro, requested, cardReady }: { plans: PlanView[]; isPro: boolean; requested: boolean; cardReady: boolean }) {
  // Start on the second plan (usually the 3-month exam pass), like the old "Popular" card.
  const [selected, setSelected] = useState(plans[1]?.id ?? plans[0]?.id ?? "");
  const plan = plans.find((p) => p.id === selected) ?? null;
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  // One tap: create the order and open Stripe's payment page.
  function buy() {
    if (!plan) return;
    setError(null);
    if (!agreed) return setError("Please tick the box to continue.");
    start(async () => {
      const r = await buyProWithCard({ planId: plan.id, agreed });
      if ("error" in r) return setError(r.error);
      window.location.assign(r.url);
    });
  }

  return (
    <div className="grid gap-6">
      {plans.length > 1 && (
        <div role="group" aria-label="Choose how long Pro lasts" className="mx-auto grid w-full auto-cols-fr grid-flow-col gap-1 rounded-full border border-border bg-card p-1 sm:w-fit">
          {plans.map((p) => {
            const active = p.id === selected;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelected(p.id)}
                className={cn(
                  "inline-flex min-h-11 flex-col items-center justify-center gap-0 rounded-full px-3 text-sm font-semibold sm:flex-row sm:gap-2 sm:px-5 transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active ? "bg-brand-gradient text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.months === 1 ? "1 month" : `${p.months} months`}
                {p.savePct ? <span className={cn("text-[11px] sm:text-xs", active ? "text-primary-foreground/90" : "text-gold-ink")}>save {p.savePct}%</span> : null}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 md:grid-rows-[auto_1fr_auto]">
        <Card className="gap-6 p-7 md:row-span-3 md:grid md:grid-rows-subgrid">
          <div className="grid gap-4">
            <CardTitle className="text-xl">Free</CardTitle>
            <p className="flex items-baseline gap-2">
              <span className="font-heading text-[40px] leading-none font-extrabold">Rs. 0</span>
              <span className="text-sm text-muted-foreground">forever</span>
            </p>
            <CardDescription className="text-[15px]">Try the platform and see how we teach.</CardDescription>
          </div>
          <div className="grid content-start">
            <FeatureList side="free" />
          </div>
          <Button variant="outline" size="lg" disabled>
            {isPro ? "Included in Pro" : "Your current plan"}
          </Button>
        </Card>

        <Card className="relative order-first gap-6 border-gold-ink/50 p-7 md:order-none md:row-span-3 md:grid md:grid-rows-subgrid">
          {/* one slow purple light around the featured card (off for people who prefer less motion) */}
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] motion-reduce:hidden">
            <BorderBeam size={160} duration={9} colorFrom="#7161ff" colorTo="#cb3cff" borderWidth={1.5} />
          </div>
          <div className="grid gap-4">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-xl">Pro</CardTitle>
              <Badge variant="gold" className="bg-brand-gradient text-primary-foreground uppercase tracking-wide">
                Best for exam prep
              </Badge>
            </div>
            {plan ? (
              <>
                <p className="flex items-baseline gap-2">
                  <span className="font-heading text-[40px] leading-none font-extrabold">{plan.perMonth}</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </p>
                <CardDescription className="text-[15px]">
                  {plan.months === 1
                    ? `One payment of ${plan.total} for 1 month.`
                    : `One payment of ${plan.total} for ${plan.months} months.`}
                  {plan.save ? ` You save ${plan.save}.` : ""} No automatic renewal.
                </CardDescription>
              </>
            ) : (
              <>
                <p className="font-heading text-[32px] leading-none font-extrabold">Opening soon</p>
                <CardDescription className="text-[15px]">Join the waitlist and we will contact you with the price and how to pay.</CardDescription>
              </>
            )}
            <p className="text-sm font-semibold">Everything in Free, plus:</p>
          </div>
          <div className="grid content-start gap-1">
            <FeatureList side="pro" />
            <p className="pt-2 text-[13px] text-muted-foreground">Features marked Soon are included in Pro the day they go live.</p>
          </div>
          <div className="grid gap-3">
            {plan && cardReady ? (
              <>
                {/* Required by German/EU consumer law: agree to the terms and ask for Pro to start right away. */}
                <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[13px] text-muted-foreground hover:text-foreground">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="peer sr-only" />
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-gold-ink peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                      agreed ? "border-gold bg-gold text-white" : "border-border",
                    )}
                  >
                    {agreed && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span>
                    I agree to the{" "}
                    <a href="https://www.deutli.com/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">Terms</a>{" "}
                    and ask Deutli to start Pro as soon as my payment is confirmed. If I withdraw within 14 days, I pay for the time already used (
                    <a href="https://www.deutli.com/terms#withdrawal" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">right of withdrawal</a>
                    ). One-time payment, no automatic renewal.
                  </span>
                </label>
                {error && (
                  <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-[14px] text-destructive">
                    {error}
                  </p>
                )}
                <Button type="button" size="lg" className="w-full" disabled={busy} onClick={buy}>
                  {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
                  {busy ? "Opening secure payment…" : `${isPro ? "Extend Pro" : "Get Pro"} · ${plan.total}`}
                </Button>
                <Link href={`/dashboard/upgrade/checkout?plan=${plan.id}`} className="inline-flex min-h-11 items-center justify-center text-[14px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  Pay with a bank or wallet instead
                </Link>
              </>
            ) : plan ? (
              <Button asChild size="lg" className="w-full">
                <Link href={`/dashboard/upgrade/checkout?plan=${plan.id}`}>{isPro ? "Extend with this plan" : "Get Pro"}</Link>
              </Button>
            ) : (
              <ProRequest already={requested} />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
