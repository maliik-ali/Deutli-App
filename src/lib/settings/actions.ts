"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const schema = z
  .string()
  .regex(/^((goethe|telc|oesd)_(a1|a2|b1|b2|c1|c2)|dtz|other)$/);

/** Save the exam (and level) the student is preparing for. */
export async function setMyExam(exam: string): Promise<{ error: string } | { ok: true }> {
  const user = await requireUser();
  const parsed = schema.safeParse(exam);
  if (!parsed.success) return { error: "Please choose an exam and a level." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ exam: parsed.data }).eq("id", user.id);
  if (error) return { error: "We couldn't save this. Check your internet and try again." };
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
