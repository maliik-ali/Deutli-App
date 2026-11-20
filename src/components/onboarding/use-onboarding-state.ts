"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { type LanguageCode } from "@/lib/languages";
import { completeOnboarding } from "@/lib/onboarding/actions";
import {
  SKILLS,
  type ExamId,
  type GoalId,
  type SkillId,
  type TimelineId,
} from "@/lib/onboarding/options";
import { STEP_COUNT } from "./onboarding-ui";

export function useOnboardingState({
  suggestedLanguage,
  initialLanguages,
}: {
  suggestedLanguage: LanguageCode | null;
  initialLanguages: LanguageCode[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [first, setFirst] = useState<LanguageCode | null>(
    initialLanguages[0] && initialLanguages[0] !== "en"
      ? initialLanguages[0]
      : suggestedLanguage,
  );
  const [second, setSecond] = useState<LanguageCode | null>(null);
  const [goals, setGoals] = useState<GoalId[]>([]);
  const [exam, setExam] = useState<ExamId | null>(null);
  const [timeline, setTimeline] = useState<TimelineId | null>(null);
  const [examDate, setExamDate] = useState("");
  const [focus, setFocus] = useState<SkillId[]>([]);
  const [emailTips, setEmailTips] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();

  const skills = SKILLS.filter(
    (s) => !s.onlyFor || !exam || s.onlyFor.includes(exam),
  );
  // The chosen worries, in list order. The plan for them is the "Your focus" card on the dashboard.
  const chosen = skills.filter((s) => focus.includes(s.id));

  // Native language first, then the second one, then English (if there is room).
  function finalLanguages(): LanguageCode[] {
    if (!first) return initialLanguages;
    return [
      ...new Set([first, second, "en"].filter(Boolean) as LanguageCode[]),
    ].slice(0, 3);
  }

  function go(next: number) {
    setError(null);
    setStep(Math.max(0, Math.min(STEP_COUNT - 1, next)));
    window.scrollTo({ top: 0 });
  }

  function toggleGoal(id: GoalId) {
    setGoals((g) => {
      if (id === "improve") return g.includes("improve") ? [] : ["improve"];
      const rest = g.filter((x) => x !== "improve");
      return rest.includes(id) ? rest.filter((x) => x !== id) : [...rest, id];
    });
  }

  function toggleFocus(id: SkillId) {
    setFocus((f) => {
      if (id === "unsure") return f.includes("unsure") ? [] : ["unsure"];
      const rest = f.filter((x) => x !== "unsure");
      return rest.includes(id) ? rest.filter((x) => x !== id) : [...rest, id];
    });
  }

  function finish(href: string) {
    setError(null);
    startBusy(async () => {
      const result = await completeOnboarding({
        languages: finalLanguages(),
        goals,
        exam,
        examTimeline: timeline,
        examDate: timeline === "date" && examDate ? examDate : null,
        focusSkills: chosen.map((s) => s.id),
        emailTips,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(href);
      router.refresh();
    });
  }

  const canContinue = [
    !!first,
    goals.length > 0,
    !!exam && (timeline !== "date" || !!examDate),
    focus.length > 0,
  ][step];
  // Step 1 takes one tap (the language is pre-selected), so no Skip there.
  const skippable = step > 0 && step < STEP_COUNT - 1;
  const actionWidth = "w-full sm:w-80";
  // Says why the button is disabled, so a tap on it never feels broken.
  const missing = [
    "Choose your first language to continue.",
    "Pick at least one answer to continue.",
    timeline === "date" && exam
      ? "Pick your exam date to continue."
      : "Choose your exam to continue.",
    "Pick at least one to continue.",
  ][step];

  return {
    step,
    first,
    setFirst,
    second,
    setSecond,
    goals,
    setGoals,
    exam,
    setExam,
    timeline,
    setTimeline,
    examDate,
    setExamDate,
    focus,
    setFocus,
    emailTips,
    setEmailTips,
    calendarOpen,
    setCalendarOpen,
    error,
    setError,
    busy,
    skills,
    chosen,
    go,
    toggleGoal,
    toggleFocus,
    finish,
    canContinue,
    skippable,
    actionWidth,
    missing,
  };
}

export type OnboardingState = ReturnType<typeof useOnboardingState>;
