/** Exam + level choices for Advanced settings. The saved id looks like "goethe_b2" (or "dtz" / "other"). */

export const EXAM_PROVIDERS = [
  { id: "goethe", name: "Goethe-Zertifikat", levels: ["A1", "A2", "B1", "B2", "C1", "C2"] },
  { id: "telc", name: "telc Deutsch", levels: ["A1", "A2", "B1", "B2", "C1", "C2"] },
  { id: "oesd", name: "ÖSD Zertifikat", levels: ["A1", "A2", "B1", "B2", "C1", "C2"] },
  { id: "dtz", name: "DTZ (Deutsch-Test für Zuwanderer)", levels: [] },
  { id: "other", name: "Another exam or not sure yet", levels: [] },
] as const;

export type ExamProviderId = (typeof EXAM_PROVIDERS)[number]["id"];

export function getProvider(id: string) {
  return EXAM_PROVIDERS.find((p) => p.id === id);
}

/** Split a saved exam id into provider + level. */
export function parseExamId(exam: string | null | undefined): { provider: ExamProviderId; level: string | null } {
  if (exam === "dtz" || exam === "other") return { provider: exam, level: null };
  const m = exam?.match(/^(goethe|telc|oesd)_(a1|a2|b1|b2|c1|c2)$/);
  if (m) return { provider: m[1] as ExamProviderId, level: m[2].toUpperCase() };
  return { provider: "goethe", level: "B1" };
}

/** Full name shown to the student, e.g. "Goethe-Zertifikat B2". */
export function examLabel(exam: string | null | undefined) {
  const { provider, level } = parseExamId(exam);
  const p = getProvider(provider)!;
  if (provider === "dtz") return "DTZ";
  if (provider === "other") return "B1 exam";
  return `${p.name} ${level}`;
}
