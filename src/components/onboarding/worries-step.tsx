"use client";

import { Check } from "lucide-react";
import { SKILL_ICONS } from "./skill-icons";
import { cn } from "@/lib/utils";
import { Choice, Heading } from "./onboarding-ui";
import type { OnboardingState } from "./use-onboarding-state";

export function WorriesStep({ st }: { st: OnboardingState }) {
  const {
    focus,
    emailTips,
    setEmailTips,
    error,
    skills,
    toggleFocus,
  } = st;
  return (
          <>
            <Heading
              title="What worries you most about the exam?"
              text="Pick everything that applies. Your dashboard will show you where to start for each."
            />
            {/* Two columns from tablet up, so all worries and the button fit on one screen. */}
            <div className="grid gap-3 md:grid-cols-2">
              {skills.map((s) => {
                const Icon = SKILL_ICONS[s.id];
                return (
                  <Choice
                    key={s.id}
                    kind="check"
                    selected={focus.includes(s.id)}
                    onClick={() => toggleFocus(s.id)}
                  >
                    <span className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <span className="grid min-w-0 gap-0.5">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span
                            lang={s.id === "unsure" ? undefined : "de"}
                            className="text-base font-bold"
                          >
                            {s.name}
                          </span>
                          {s.id !== "unsure" && (
                            <span className="text-sm text-muted-foreground">
                              {s.english}
                            </span>
                          )}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {s.worry}
                        </span>
                      </span>
                    </span>
                  </Choice>
                );
              })}
            </div>

            {/* Clear consent: unticked unless the student ticks it. */}
            <label className="flex min-h-11 cursor-pointer items-start gap-3 px-1 text-[15px] text-muted-foreground hover:text-foreground">
              {/* Real checkbox for keyboards and screen readers, drawn like the answer cards' check. */}
              <input
                type="checkbox"
                checked={emailTips}
                onChange={(e) => setEmailTips(e.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-gold-ink peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                  emailTips
                    ? "border-gold bg-gold text-white"
                    : "border-border",
                )}
              >
                {emailTips && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span>
                Email me occasional exam tips and new features. Unsubscribe
                anytime.
              </span>
            </label>

            {error && (
              <p
                className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}
          </>
  );
}
