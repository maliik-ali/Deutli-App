export type MistakeType = "grammar" | "word_order" | "spelling" | "style";

export type Mistake = {
  /** Character range in the student's email. */
  start: number;
  end: number;
  type: MistakeType;
  /** Short plain-English reason. */
  message: string;
  /** Suggested correction (may be empty). */
  fix: string | null;
  /** "rules" = free grammar checker, "ai" = found by the AI. */
  source: "rules" | "ai";
};

export type Criterion = {
  id: "task" | "communication" | "accuracy";
  score: number;
  max: number;
  note: string;
};

export type WritingFeedback = {
  summary: string;
  criteria: Criterion[];
  /** AI estimate, out of 45. */
  total: number;
  max: number;
  mistakes: Mistake[];
  model: string;
  checksUsed: number;
  teacher: { status: "pending" | "confirmed" | "changed"; total: number | null; comment: string | null };
};

export const MAX_CHECKS = 2;
export const MIN_WORDS = 20;

export const CRITERION_LABELS: Record<Criterion["id"], { en: string; de: string }> = {
  task: { en: "Task completion", de: "Aufgabenerfüllung" },
  communication: { en: "Communicative design", de: "Kommunikative Gestaltung" },
  accuracy: { en: "Formal accuracy", de: "Formale Richtigkeit" },
};

export const MISTAKE_LABELS: Record<MistakeType, string> = {
  grammar: "Grammar",
  word_order: "Word order",
  spelling: "Spelling",
  style: "Style",
};
