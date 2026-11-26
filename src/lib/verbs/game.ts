/** Verb games: building the questions (pure code, runs on the server). */

export type VerbItem = {
  id: string;
  german: string;
  praesens: string | null;
  praeteritum: string | null;
  perfekt: string | null;
  preposition: string | null;
  verbCase: string | null;
  translations: Record<string, string>;
  exampleDe: string | null;
  exampleTranslations: Record<string, string>;
  right: number;
  wrong: number;
};

export type VerbMode = "forms" | "prepositions";
export type VerbQuestion = {
  key: string;
  verbId: string;
  /** What is asked: "praeteritum", "perfekt" or "preposition". */
  ask: "praeteritum" | "perfekt" | "preposition";
  german: string;
  translations: Record<string, string>;
  options: string[];
  answer: string;
  praesens: string | null;
  praeteritum: string | null;
  perfekt: string | null;
  preposition: string | null;
  verbCase: string | null;
  exampleDe: string | null;
  exampleTranslations: Record<string, string>;
};

export const PREPOSITIONS = ["an", "auf", "aus", "bei", "für", "in", "mit", "nach", "über", "um", "von", "vor", "zu"];

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Weakest verbs first (more wrong than right), then a random mix of the rest. */
function pickVerbs(verbs: VerbItem[], n: number): VerbItem[] {
  const weak = shuffle(verbs.filter((v) => v.wrong > v.right)).slice(0, Math.ceil(n / 2));
  const rest = shuffle(verbs.filter((v) => !weak.includes(v)));
  return shuffle([...weak, ...rest.slice(0, n - weak.length)]);
}

export function buildVerbQuestions(verbs: VerbItem[], mode: VerbMode, n = 10): VerbQuestion[] {
  const base = mode === "prepositions" ? verbs.filter((v) => v.preposition) : verbs.filter((v) => v.praeteritum && v.perfekt);
  const out: VerbQuestion[] = [];
  for (const v of pickVerbs(base, n)) {
    const ask: VerbQuestion["ask"] = mode === "prepositions" ? "preposition" : Math.random() < 0.5 ? "praeteritum" : "perfekt";
    const answer = (ask === "preposition" ? v.preposition : v[ask]) as string;
    let options: string[];
    if (ask === "preposition") {
      // Never offer another preposition that is also right for the same verb (arbeiten an, bei, in).
      const valid = new Set(verbs.filter((o) => o.german === v.german && o.preposition).map((o) => o.preposition as string));
      options = shuffle(PREPOSITIONS.filter((p) => !valid.has(p))).slice(0, 3);
    } else {
      const others = [...new Set(base.filter((o) => o.id !== v.id).map((o) => o[ask] as string))].filter((x) => x && x !== answer);
      options = shuffle(others).slice(0, 2);
    }
    out.push({
      key: v.id + ask,
      verbId: v.id,
      ask,
      german: v.german,
      translations: v.translations,
      options: shuffle([answer, ...options]),
      answer,
      praesens: v.praesens,
      praeteritum: v.praeteritum,
      perfekt: v.perfekt,
      preposition: v.preposition,
      verbCase: v.verbCase,
      exampleDe: v.exampleDe,
      exampleTranslations: v.exampleTranslations,
    });
  }
  return out;
}
