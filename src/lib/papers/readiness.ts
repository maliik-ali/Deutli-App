import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { AttemptResult } from "./template";

export type SkillScore = { key: string; name: string; english: string; value: number | null };
export type Readiness = {
  /** How many finished mock exams the numbers come from. */
  exams: number;
  /** Overall % of the points we can mark automatically; null when there is no mock exam yet. */
  overall: number | null;
  skills: SkillScore[];
  /** The marked skill with the lowest score (only when it is under 80%). */
  focusKey: string | null;
};

const GROUPS = [
  { key: "lesen", prefix: "lesen", name: "Lesen", english: "Reading" },
  { key: "sprachbausteine", prefix: "sprach", name: "Sprachbausteine", english: "Grammar & words" },
  { key: "hoeren", prefix: "hoeren", name: "Hören", english: "Listening" },
  { key: "schreiben", prefix: "", name: "Schreiben", english: "Writing" },
  { key: "sprechen", prefix: "", name: "Sprechen", english: "Speaking" },
];

/** Readiness from the student's finished mock exams (the 10 most recent). Writing and speaking are not marked yet. */
/** `client` lets a teacher page read a student's numbers with the secret-key client (after checking the teacher may see that student). */
export async function getReadiness(userId: string, client?: SupabaseClient): Promise<Readiness> {
  const supabase = client ?? (await createClient());
  const { data } = await supabase
    .from("mock_attempts")
    .select("result")
    .eq("user_id", userId)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(10);
  const results = (data ?? []).map((r) => r.result as AttemptResult | null).filter((r): r is AttemptResult => !!r && r.total > 0); // empty / 0-point attempts do not count

  let points = 0;
  let max = 0;
  const skills: SkillScore[] = GROUPS.map((g) => {
    let p = 0;
    let m = 0;
    if (g.prefix) {
      for (const r of results) for (const part of r.parts) if (part.id.startsWith(`${g.prefix}-`)) {
        p += part.points;
        m += part.max;
      }
    }
    points += p;
    max += m;
    return { key: g.key, name: g.name, english: g.english, value: m ? Math.round((p / m) * 100) : null };
  });

  const scored = skills.filter((s): s is SkillScore & { value: number } => s.value !== null);
  const lowest = scored.length ? scored.reduce((a, b) => (b.value < a.value ? b : a)) : null;
  return {
    exams: results.length,
    overall: max ? Math.round((points / max) * 100) : null,
    skills,
    focusKey: lowest && lowest.value < 80 ? lowest.key : null,
  };
}
