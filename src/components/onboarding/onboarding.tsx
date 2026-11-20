"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";
import type { LanguageCode } from "@/lib/languages";
import { ExamStep } from "./exam-step";
import { GoalsStep } from "./goals-step";
import { LanguageStep } from "./language-step";
import { STEP_COUNT } from "./onboarding-ui";
import { useOnboardingState } from "./use-onboarding-state";
import { WorriesStep } from "./worries-step";

export function Onboarding({
  firstName,
  email,
  suggestedLanguage = null,
  languages: initialLanguages,
  home,
}: {
  /** The device's language (from the browser), pre-selected as the first language if we support it. */
  suggestedLanguage?: LanguageCode | null;
  firstName: string | null;
  /** Shown at the bottom with "Log out", in case the student opened the wrong account. */
  email: string | null;
  languages: LanguageCode[];
  home: string;
}) {
  const st = useOnboardingState({ suggestedLanguage, initialLanguages });
  const {
    step,
    busy,
    go,
    finish,
    canContinue,
    skippable,
    actionWidth,
    missing,
  } = st;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto grid h-16 w-full max-w-[1040px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 sm:px-6">
          <div className="flex items-center gap-1">
            {step > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => go(step - 1)}
                aria-label="Back"
              >
                <ArrowLeft className="size-5" aria-hidden />
              </Button>
            )}
            <Logo
              href={home}
              className={cn("px-1", step > 0 && "max-sm:[&>span]:hidden")}
            />
          </div>
          <div
            className="flex items-center gap-1.5"
            role="progressbar"
            aria-label="Questions"
            aria-valuemin={1}
            aria-valuemax={STEP_COUNT}
            aria-valuenow={step + 1}
            aria-valuetext={`Step ${step + 1} of ${STEP_COUNT}`}
          >
            {Array.from({ length: STEP_COUNT }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === step ? "w-8 bg-brand-gradient" : "w-2",
                  i < step ? "bg-gold" : i > step && "bg-border",
                )}
              />
            ))}
          </div>
          <div className="flex justify-end">
            {skippable && (
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => go(step + 1)}
              >
                Skip
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1040px] content-start gap-8 px-4 py-8 sm:px-6 sm:py-10">
        {step === 0 && <LanguageStep st={st} firstName={firstName} />}
        {step === 1 && <GoalsStep st={st} />}
        {step === 2 && <ExamStep st={st} />}
        {step === 3 && <WorriesStep st={st} />}

        {/* Same button on every step; on phones it stays at the bottom of the screen. */}
        <div
          className={cn(
            // Pinned at the bottom with a soft fade (no hard line), so the button is always in reach.
            "sticky bottom-0 -mx-4 grid justify-items-center gap-2 bg-gradient-to-t from-background from-70% to-transparent px-4 pt-6 pb-3",
            // Larger screens: inline under the content. Only the long worries step stays pinned.
            step === STEP_COUNT - 1
              ? "sm:-mx-6 sm:px-6 sm:pt-8"
              : "sm:static sm:mx-0 sm:bg-none sm:p-0",
          )}
        >
          {step < STEP_COUNT - 1 ? (
            <>
              <Button
                className={cn("h-12 text-base", actionWidth)}
                disabled={!canContinue}
                aria-describedby={canContinue ? undefined : "continue-hint"}
                onClick={() => go(step + 1)}
              >
                Continue <ArrowRight aria-hidden />
              </Button>
              {!canContinue && (
                <p
                  id="continue-hint"
                  className="text-[13px] text-subtle-foreground"
                >
                  {missing}
                </p>
              )}
              {/* Rare escape hatch (wrong account): small, under the button, first step only. */}
              {step === 0 && (
                <form action={signOut}>
                  <button
                    type="submit"
                    title={email ? `Signed in as ${email}` : undefined}
                    className="inline-flex min-h-11 items-center px-2 text-[13px] text-subtle-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Not you? Log out
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <Button
                className={cn("h-12 text-base", actionWidth)}
                disabled={busy || !canContinue}
                aria-describedby={canContinue ? undefined : "continue-hint"}
                onClick={() => finish(home)}
              >
                {busy ? "Saving…" : "See my plan"} <ArrowRight aria-hidden />
              </Button>
              {!canContinue && (
                <p
                  id="continue-hint"
                  className="text-[13px] text-subtle-foreground"
                >
                  {missing}
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
