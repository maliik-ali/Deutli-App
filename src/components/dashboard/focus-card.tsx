import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SKILL_ICONS } from "@/components/onboarding/skill-icons";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SKILLS } from "@/lib/onboarding/options";

/**
 * "Your focus": the plan for what worries the student about the exam (from onboarding).
 * One line per worry with a link to the exact place to practise it.
 */
export function FocusCard({ focusSkills, exam }: { focusSkills: string[]; exam: string | null }) {
  const plans = SKILLS.filter(
    (s) => focusSkills.includes(s.id) && (!s.onlyFor || !exam || s.onlyFor.some((e) => e === exam)),
  );
  if (plans.length === 0) return null;

  return (
    <Card className="gap-4">
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>Your focus</CardTitle>
          <CardDescription>What you told us worries you, and where to practise it.</CardDescription>
        </div>
        <Link
          href="/onboarding?again=1"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-gold-ink underline-offset-4 hover:underline"
        >
          Change
        </Link>
      </CardHeader>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const Icon = SKILL_ICONS[plan.id];
          return (
            <li key={plan.id}>
              <Link
                href={plan.start.href}
                className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-background/60 p-4 transition-colors hover:border-gold-ink/60 hover:bg-muted/40"
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="grid min-w-0">
                    <span lang={plan.id === "unsure" ? undefined : "de"} className="font-bold">
                      {plan.id === "unsure" ? "Getting started" : plan.name}
                    </span>
                    {plan.id !== "unsure" && <span className="text-[13px] text-muted-foreground">{plan.english}</span>}
                  </span>
                </span>
                <span className="text-[15px] text-muted-foreground">{plan.next}</span>
                <span className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-gold-ink">
                  {plan.start.label}
                  <span className="font-normal text-subtle-foreground">· {plan.start.detail}</span>
                  <ArrowRight
                    className="ml-auto size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
