"use client";


import { Heading, LanguageSelect } from "./onboarding-ui";
import type { OnboardingState } from "./use-onboarding-state";

export function LanguageStep({ st, firstName }: { st: OnboardingState; firstName: string | null }) {
  const {
    first,
    setFirst,
    second,
    setSecond,
  } = st;
  return (
          // First screen: one centred column (heading, text and both dropdowns).
          <div className="mx-auto grid w-full max-w-xl gap-8 text-center sm:pt-6">
            <Heading
              title={
                firstName
                  ? `Welcome to Deutli, ${firstName}!`
                  : "Welcome to Deutli!"
              }
              text="Which languages do you speak? We'll show the meaning of new German words in them."
            />
            <div className="grid gap-6 text-left">
              <LanguageSelect
                id="first-language"
                label="My first language"
                hint="The language you know best."
                value={first}
                onChange={(code) => {
                  setFirst(code);
                  if (code && code === second) setSecond(null);
                }}
              />
              <LanguageSelect
                id="second-language"
                label="I also speak"
                value={second}
                onChange={setSecond}
                exclude={first}
                optional
              />
            </div>
          </div>
  );
}
