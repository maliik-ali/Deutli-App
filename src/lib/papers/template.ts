/**
 * Shared (browser + server) description of a mock paper: parts, question types, points, grading.
 * The paper itself is only page images; this describes how to answer it.
 * Built for the telc Deutsch B1 (Zertifikat Deutsch) written exam.
 */

export type PartKind = "match" | "abc" | "tf" | "write";

export type PaperPart = {
  id: string;
  section: "lesen" | "sprachbausteine" | "hoeren" | "schreiben";
  title: string; // "Teil 1"
  task: string; // short plain description
  kind: PartKind;
  /** First question number, and how many questions (write = 0). */
  first: number;
  count: number;
  /** Answer letters for "match" parts. */
  options?: string[];
  /** Max points of this part (telc weighting). */
  points: number;
  /** PDF page numbers where this part sits. Filled in by the admin. */
  fromPage: number;
  toPage: number;
};

export type PaperSection = { id: PaperPart["section"]; title: string; english: string; minutes: number };

export const SECTIONS: PaperSection[] = [
  { id: "lesen", title: "Leseverstehen", english: "Reading", minutes: 60 },
  { id: "sprachbausteine", title: "Sprachbausteine", english: "Grammar & words", minutes: 30 },
  { id: "hoeren", title: "Hörverstehen", english: "Listening", minutes: 30 },
  { id: "schreiben", title: "Schriftlicher Ausdruck", english: "Writing", minutes: 30 },
];

const AJ = "abcdefghij".split("");
const AL = [..."abcdefghijkl".split(""), "x"];
const AO = "abcdefghijklmno".split("");

/** telc Deutsch B1 / Zertifikat Deutsch: parts with the official points (see "Punkte und Gewichtung" in the Übungstest). */
export const TELC_B1_PARTS: PaperPart[] = [
  { id: "lesen-1", section: "lesen", title: "Teil 1", task: "Match a headline to each text", kind: "match", first: 1, count: 5, options: AJ, points: 25, fromPage: 0, toPage: 0 },
  { id: "lesen-2", section: "lesen", title: "Teil 2", task: "Read an article, choose a, b or c", kind: "abc", first: 6, count: 5, points: 25, fromPage: 0, toPage: 0 },
  { id: "lesen-3", section: "lesen", title: "Teil 3", task: "Match an advert to each situation", kind: "match", first: 11, count: 10, options: AL, points: 25, fromPage: 0, toPage: 0 },
  { id: "sprach-1", section: "sprachbausteine", title: "Teil 1", task: "Fill the gaps, choose a, b or c", kind: "abc", first: 21, count: 10, points: 15, fromPage: 0, toPage: 0 },
  { id: "sprach-2", section: "sprachbausteine", title: "Teil 2", task: "Fill the gaps with words a–o", kind: "match", first: 31, count: 10, options: AO, points: 15, fromPage: 0, toPage: 0 },
  { id: "hoeren-1", section: "hoeren", title: "Teil 1", task: "Five short texts: richtig or falsch", kind: "tf", first: 41, count: 5, points: 25, fromPage: 0, toPage: 0 },
  { id: "hoeren-2", section: "hoeren", title: "Teil 2", task: "A conversation: richtig or falsch", kind: "tf", first: 46, count: 10, points: 25, fromPage: 0, toPage: 0 },
  { id: "hoeren-3", section: "hoeren", title: "Teil 3", task: "Five short texts: richtig or falsch", kind: "tf", first: 56, count: 5, points: 25, fromPage: 0, toPage: 0 },
  { id: "schreiben-1", section: "schreiben", title: "Aufgabe", task: "Write an email (about 100 words)", kind: "write", first: 0, count: 0, points: 45, fromPage: 0, toPage: 0 },
];

export type PaperStructure = { parts: PaperPart[] };

export function partQuestions(p: PaperPart): number[] {
  return Array.from({ length: p.count }, (_, i) => p.first + i);
}

export const TOTAL_QUESTIONS = 60;
export const WRITTEN_MAX = 225;
export const WRITTEN_PASS = 135;

/** Reads a pasted answer key like "1 i 2 d 3 b ... 41 + 42 – 43 –" into {"1":"i","41":"+","42":"-"}. */
export function parseAnswerKey(text: string): Record<string, string> {
  const tokens = text.replace(/[–−—]/g, "-").split(/\s+/).filter(Boolean);
  const out: Record<string, string> = {};
  for (let i = 0; i < tokens.length - 1; i++) {
    if (/^\d{1,2}$/.test(tokens[i]) && /^([a-o]|x|\+|-)$/i.test(tokens[i + 1])) {
      const n = Number(tokens[i]);
      if (n >= 1 && n <= 60 && !(String(n) in out)) {
        out[String(n)] = tokens[i + 1].toLowerCase();
        i++;
      }
    }
  }
  return out;
}

export type PartResult = { id: string; correct: number; count: number; points: number; max: number };
export type AttemptResult = {
  parts: PartResult[];
  total: number;
  max: number;
  /** Per question: what the student chose and the right answer. */
  review: Record<string, { given: string | null; right: string; ok: boolean }>;
  writingWords: number;
};

export function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Grade answers against the key. Writing is not marked here (checked later by AI/teacher). */
export function grade(
  structure: PaperStructure,
  key: Record<string, string>,
  answers: Record<string, string>,
  writing: string,
): AttemptResult {
  const parts: PartResult[] = [];
  const review: AttemptResult["review"] = {};
  for (const p of structure.parts) {
    if (p.kind === "write") continue;
    let correct = 0;
    for (const n of partQuestions(p)) {
      const right = key[String(n)] ?? "";
      const given = answers[String(n)] ?? null;
      const ok = !!given && given === right;
      if (ok) correct++;
      review[String(n)] = { given, right, ok };
    }
    const points = p.count ? Math.round(((correct / p.count) * p.points) * 10) / 10 : 0;
    parts.push({ id: p.id, correct, count: p.count, points, max: p.points });
  }
  const total = Math.round(parts.reduce((s, p) => s + p.points, 0) * 10) / 10;
  const max = parts.reduce((s, p) => s + p.max, 0);
  return { parts, total, max, review, writingWords: countWords(writing) };
}

/** The sections a paper really contains, in exam order. A teacher may upload only some (e.g. Reading without Listening). */
export function sectionsInStructure(structure: PaperStructure): PaperSection[] {
  return SECTIONS.filter((s) => structure.parts.some((p) => p.section === s.id));
}

/** How many questions the student answers (writing excluded). */
export function questionCount(structure: PaperStructure): number {
  return structure.parts.reduce((n, p) => n + p.count, 0);
}

/** Short plain label of what is inside, e.g. "Reading only" or "Reading + Listening"; null for the full paper. */
export function contentsLabel(structure: PaperStructure): string | null {
  const have = sectionsInStructure(structure);
  if (have.length === SECTIONS.length) return null;
  const names = have.map((s) => s.english);
  return names.length === 1 ? `${names[0]} only` : names.join(" + ");
}

/** Which exam and level a paper is for (columns `exam` and `level` of mock_papers). The answer-sheet format is the same for all of them. */
export const PAPER_EXAMS = [
  { id: "telc", label: "telc" },
  { id: "goethe", label: "Goethe" },
  { id: "oesd", label: "ÖSD" },
  { id: "dtz", label: "DTZ" },
  { id: "other", label: "Other" },
] as const;
export const PAPER_LEVELS = ["a1", "a2", "b1", "b2", "c1"] as const;
export type PaperExam = (typeof PAPER_EXAMS)[number]["id"];
export type PaperLevel = (typeof PAPER_LEVELS)[number];

/** "telc · B1", "Goethe · A2". "Other" shows only the level. */
export function paperExamLabel(exam: string | undefined, level: string | undefined): string {
  const lv = (level ?? "b1").toUpperCase();
  // Older papers store the exam as "telc_b1": only the part before the underscore is the exam.
  const id = (exam ?? "").split("_")[0];
  const name = PAPER_EXAMS.find((e) => e.id === id)?.label;
  return !name || id === "other" ? lv : `${name} · ${lv}`;
}
