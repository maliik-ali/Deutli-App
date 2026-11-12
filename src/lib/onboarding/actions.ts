"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { LANGUAGE_CODES, MAX_LANGUAGES } from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  languages: z
    .array(z.enum(LANGUAGE_CODES))
    .min(1)
    .max(MAX_LANGUAGES)
    .refine((l) => new Set(l).size === l.length),
  goals: z
    .array(z.enum(["citizenship", "residence", "family", "ausbildung", "university", "job", "integration", "improve"]))
    .max(8),
  exam: z.enum(["goethe_b1", "telc_b1", "oesd_b1", "dtz", "other"]).nullable(),
  examTimeline: z.enum(["date", "1m", "3m", "6m", "unsure"]).nullable(),
  examDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  focusSkills: z.array(z.enum(["lesen", "hoeren", "schreiben", "sprechen", "sprachbausteine", "unsure"])).max(6),
  emailTips: z.boolean(),
});

/** Save the onboarding answers and mark onboarding as done. */
export async function completeOnboarding(input: unknown): Promise<{ error: string } | { ok: true }> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Some answers look wrong. Please go back and check them." };
  const a = parsed.data;
  if (a.examTimeline === "date" && !a.examDate) return { error: "Pick your exam date, or choose another option." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      languages: a.languages,
      goals: a.goals,
      exam: a.exam,
      exam_timeline: a.examTimeline,
      exam_date: a.examTimeline === "date" ? a.examDate : null,
      focus_skills: [...new Set(a.focusSkills)],
      email_tips: a.emailTips,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) return { error: "We couldn't save your answers. Check your internet and try again." };
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
