"use client";

import { GOALS, IMPROVE_GOAL } from "@/lib/onboarding/options";
import { Choice, Heading } from "./onboarding-ui";
import type { OnboardingState } from "./use-onboarding-state";

export function GoalsStep({ st }: { st: OnboardingState }) {
  const {
    goals,
    toggleGoal,
  } = st;
  return (
          <>
            <Heading
              title="What do you need your certificate for?"
              text="Pick everything that applies. This helps us guide your preparation."
            />
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {GOALS.map((g) => (
                  <Choice
                    key={g.id}
                    kind="check"
                    selected={goals.includes(g.id)}
                    onClick={() => toggleGoal(g.id)}
                  >
                    <span className="font-semibold">{g.label}</span>{" "}
                    <span lang="de" className="text-muted-foreground">
                      ({g.de})
                    </span>
                  </Choice>
                ))}
              </div>
              <div
                className="flex items-center gap-4 py-1 text-[13px] font-semibold text-subtle-foreground"
                aria-hidden
              >
                <span className="h-px flex-1 bg-border" /> OR{" "}
                <span className="h-px flex-1 bg-border" />
              </div>
              <Choice
                kind="check"
                selected={goals.includes("improve")}
                onClick={() => toggleGoal(IMPROVE_GOAL.id)}
              >
                <span className="font-semibold">{IMPROVE_GOAL.label}</span>
              </Choice>
            </div>
          </>
  );
}
