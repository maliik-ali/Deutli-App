"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";

import { BlurFade } from "@/components/magicui/blur-fade";
import { ShineBorder } from "@/components/magicui/shine-border";
import { ProRequest } from "@/components/dashboard/pro-request";
import { Button } from "@/components/ui/button";
import { buyProWithCard } from "@/lib/pro/actions";
import { cn } from "@/lib/utils";

/** One Pro plan as the page shows it (amounts in rupees, worked out on the server). */
export type PlanView = {
  id: string;
  months: number;
  /** Prices already formatted in the student's currency (EUR, or a display currency with its rate as a note). */
  total: string;
  perMonth: string;
  /** "1 EUR = 300 PKR" when the price is shown in another currency than EUR. */
  note: string | null;
  /** What they save against paying month by month, or null. */
  save: string | null;
  savePct: number | null;
};

/** Same layout as the pricing section on deutli.com. Only things that exist are listed. Add a line here (and on deutli.com) the day a new feature goes live: A2/B1/B2 vocabulary lists, grammar lessons, speaking practice in small groups. */
const FREE_YES = [
  "1 free telc B1 mock exam",
  "Marked on screen with answer review",
  "“Why?” AI explanation of answers",
  "AI writing check",
  "A1 vocabulary list and word games",
  "Improve Accent: speak along",
];
const FREE_NO = ["More mock exams", "A2, B1 and B2 vocabulary lists"];
const PRO: { t: string }[] = [
  { t: "Every mock exam, new ones as we publish them" },
  { t: "Certificate for every exam" },
  { t: "Real exam conditions: timer per section, audio and answer sheet" },
  { t: "Readiness score from all your mock results" },
  { t: "A2, B1 and B2 vocabulary lists" },
];

const TICK = "mt-0.5 size-4 shrink-0 text-[#39ffac]";

export function PlanCompare({ plans, isPro, requested, cardReady }: { plans: PlanView[]; isPro: boolean; requested: boolean; cardReady: boolean }) {
  // Start on the second plan (usually the 3-month exam pass).
  const [selected, setSelected] = useState(plans[1]?.id ?? plans[0]?.id ?? "");
  const plan = plans.find((p) => p.id === selected) ?? null;
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const hasLonger = plans.some((p) => p.months > 1);

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
    <div className="grid gap-8">
      {plans.length > 1 && (
        <div className="flex flex-wrap justify-center">
          <div role="group" aria-label="Choose how long Pro lasts" className="inline-flex max-w-full rounded-xl border border-border bg-card p-1">
            {plans.map((p) => {
              const active = p.id === selected;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(p.id)}
                  className={cn(
                    "min-h-11 rounded-lg px-3 py-2 text-sm font-semibold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-4",
                    active ? "bg-brand-gradient text-white" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.months === 1 ? "1 month" : `${p.months} months`}
                  {p.savePct ? <span className="hidden sm:inline"> · save {p.savePct}%</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mx-auto grid w-full max-w-[900px] gap-6 md:grid-cols-2">
        <BlurFade inView>
          <div className="flex h-full flex-col rounded-[20px] border border-border bg-card p-6 sm:p-8">
            <h2 className="text-xl font-bold">Free</h2>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold">{`${(plans[0]?.perMonth ?? "").replace(/[\d.,].*$/, "").trim() || "PKR"} 0`.replace("€ ", "€")}</span>
              <span className="text-muted-foreground">forever</span>
            </div>
            <p className="mt-3 text-muted-foreground">Try the platform and see how we teach.</p>
            <ul className="mt-6 flex-1 space-y-3 text-[15px]">
              {FREE_YES.map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <Check className={TICK} aria-label="Included" />
                  {t}
                </li>
              ))}
              {FREE_NO.map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-muted-foreground/60">
                  <X className="mt-0.5 size-4 shrink-0" aria-label="Not included" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-8 inline-flex h-12 items-center justify-center rounded-xl border border-border text-[15px] font-semibold text-muted-foreground" aria-disabled>
              {isPro ? "Included in Pro" : "Your current plan"}
            </div>
          </div>
        </BlurFade>

        <BlurFade inView delay={0.1} className="order-first md:order-none">
          <div className="relative flex h-full flex-col overflow-hidden rounded-[20px] border border-[#7161ff]/60 bg-[#0d1a45] p-6 shadow-[0_0_80px_rgba(113,97,255,0.25)] sm:p-8">
            <ShineBorder shineColor={["#7f25fb", "#cb3cff", "#00c2ff"]} borderWidth={2} />
            <span className="absolute top-5 right-5 rounded-full bg-brand-gradient px-3 py-1 text-[11px] font-bold tracking-wide text-white sm:top-6 sm:right-6">BEST FOR EXAM PREP</span>
            <h2 className="text-xl font-bold">Pro</h2>
            {plan ? (
              <>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold">{plan.perMonth}</span>
                  <span className="text-muted-foreground">/ month</span>
                </div>
                <p className="mt-3 min-h-[3rem] text-muted-foreground">
                  {plan.months === 1
                    ? `One payment for 1 month.${hasLonger ? " Choose a longer plan and save." : ""}`
                    : `One payment of ${plan.total} for ${plan.months} months.${plan.save ? ` You save ${plan.save}.` : ""}`}
                  {plan.note ? <span className="block text-[13px]">{plan.note}</span> : null}
                </p>
              </>
            ) : (
              <>
                <div className="mt-4 text-5xl font-extrabold">Opening soon</div>
                <p className="mt-3 min-h-[3rem] text-muted-foreground">Join the waitlist and we will contact you with the price and how to pay.</p>
              </>
            )}
            <ul className="mt-4 flex-1 space-y-3 text-[15px]">
              <li className="flex items-start gap-2.5 font-semibold">
                <Check className={TICK} aria-hidden />
                Everything in Free, plus:
              </li>
              {PRO.map((f) => (
                <li key={f.t} className="flex items-start gap-2.5">
                  <Check className={TICK} aria-label="Included" />
                  <span>{f.t}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 grid gap-3">
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
                  <Button type="button" className="h-12 rounded-xl text-[15px]" disabled={busy} onClick={buy}>
                    {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
                    {busy ? "Opening secure payment…" : `${isPro ? "Extend Pro" : "Get Pro"} · ${plan.total}`}
                  </Button>
                  <Link href={`/dashboard/upgrade/checkout?plan=${plan.id}`} className="inline-flex min-h-11 items-center justify-center text-[14px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    Pay with a bank or wallet instead
                  </Link>
                </>
              ) : plan ? (
                <Button asChild className="h-12 rounded-xl text-[15px]">
                  <Link href={`/dashboard/upgrade/checkout?plan=${plan.id}`}>{isPro ? "Extend with this plan" : "Get Pro"}</Link>
                </Button>
              ) : (
                <ProRequest already={requested} />
              )}
            </div>
          </div>
        </BlurFade>
      </div>

      <p className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span>✓ One payment, no auto-renewal</span>
        <span>✓ {cardReady ? "Pay by card, bank transfer, JazzCash or EasyPaisa" : "Pay by bank transfer, JazzCash or EasyPaisa"}</span>
      </p>
    </div>
  );
}
