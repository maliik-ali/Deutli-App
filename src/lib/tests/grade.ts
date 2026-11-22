/** Grading for chapter tests. Pure code, used on the server only (the keys never reach the browser before submitting). */

export type Kind = "mc" | "tf" | "fill";
export type KeyedQuestion = { id: string; kind: Kind; points: number; answer: number | boolean | string[] };
export type Answers = Record<string, number | boolean | string>;

/** Lower case, trim, collapse spaces, drop punctuation at the ends: "  Der Tisch. " matches "der tisch". */
export const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim().replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, "");

export function isCorrect(q: KeyedQuestion, given: number | boolean | string | undefined): boolean {
  if (given === undefined || given === null || given === "") return false;
  if (q.kind === "mc") return typeof given === "number" && given === q.answer;
  if (q.kind === "tf") return typeof given === "boolean" && given === q.answer;
  return typeof given === "string" && (q.answer as string[]).some((a) => normalise(a) === normalise(given));
}

export type TestResult = { score: number; max: number; perQuestion: Record<string, { ok: boolean; given: number | boolean | string | null }> };

export function gradeTest(questions: KeyedQuestion[], answers: Answers): TestResult {
  let score = 0;
  let max = 0;
  const perQuestion: TestResult["perQuestion"] = {};
  for (const q of questions) {
    max += q.points;
    const given = answers[q.id];
    const ok = isCorrect(q, given);
    if (ok) score += q.points;
    perQuestion[q.id] = { ok, given: given ?? null };
  }
  return { score: Math.round(score * 10) / 10, max, perQuestion };
}
