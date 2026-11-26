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
  /** Review box 0 to 5. */
  box: number;
  /** The student has answered this verb before and it is due for review today. */
  due: boolean;
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

/** Prepositions that learners mix up. The first ones listed are offered as wrong options. */
const CONFUSED: Record<string, string[]> = {
  an: ["auf", "in"],
  auf: ["an", "für"],
  aus: ["von", "bei"],
  bei: ["mit", "an"],
  für: ["um", "auf"],
  in: ["an", "auf"],
  mit: ["bei", "zu"],
  nach: ["zu", "auf"],
  über: ["um", "von"],
  um: ["für", "über"],
  von: ["vor", "aus"],
  vor: ["von", "für"],
  zu: ["nach", "bei"],
};

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Number of letters that differ between two forms (small = they look alike). */
export function distance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = keep;
    }
  }
  return prev[b.length];
}

/** The mistake learners make with a strong verb: treating it as regular ("schlagte" instead of "schlug"). */
function regularPraeteritum(v: VerbItem): string | null {
  const form = v.praeteritum;
  if (!form || v.german.startsWith("sich ")) return null;
  const [word, particle] = form.split(" ");
  let base = v.german;
  if (particle) {
    if (!base.startsWith(particle)) return null;
    base = base.slice(particle.length);
  }
  const stem = base.replace(/e?n$/, "");
  const wrong = `${stem}${/[dt]$/.test(stem) ? "ete" : "te"}${particle ? ` ${particle}` : ""}`;
  return wrong !== form && word !== `${stem}te` ? wrong : null;
}

/** The other auxiliary with the same participle: "hat gegessen" becomes "ist gegessen". */
function otherAuxiliary(perfekt: string): string | null {
  if (perfekt.startsWith("hat/")) return null;
  if (perfekt.startsWith("hat ")) return `ist ${perfekt.slice(4)}`;
  if (perfekt.startsWith("ist ")) return `hat ${perfekt.slice(4)}`;
  return null;
}

/** Wrong options that look believable: typical mistakes first, then the forms that look most like the right one. */
function formOptions(v: VerbItem, ask: "praeteritum" | "perfekt", pool: VerbItem[], answer: string): string[] {
  const out: string[] = [];
  const add = (x: string | null) => {
    if (x && x !== answer && !out.includes(x)) out.push(x);
  };
  add(ask === "perfekt" ? otherAuxiliary(answer) : regularPraeteritum(v));
  const others = [...new Set(pool.filter((o) => o.id !== v.id).map((o) => o[ask] as string))]
    .filter((x) => x && x !== answer && !x.includes("/"))
    .sort((x, y) => distance(x, answer) - distance(y, answer));
  // Take from the 8 closest so a round does not repeat the same two wrong forms every time.
  for (const x of shuffle(others.slice(0, 8))) {
    if (out.length >= 2) break;
    add(x);
  }
  return out.slice(0, 2);
}

function prepositionOptions(answer: string, valid: Set<string>): string[] {
  const out = (CONFUSED[answer] ?? []).filter((p) => !valid.has(p)).slice(0, 2);
  for (const p of shuffle(PREPOSITIONS)) {
    if (out.length >= 3) break;
    if (!valid.has(p) && !out.includes(p)) out.push(p);
  }
  return out;
}

/** Due verbs first, then the weak ones (more wrong than right), then a random mix of the rest. */
function pickVerbs(verbs: VerbItem[], n: number): VerbItem[] {
  const due = shuffle(verbs.filter((v) => v.due)).slice(0, n);
  const weak = shuffle(verbs.filter((v) => !due.includes(v) && v.wrong > v.right)).slice(0, Math.max(0, Math.ceil(n / 2) - due.length));
  const rest = shuffle(verbs.filter((v) => !due.includes(v) && !weak.includes(v)));
  return shuffle([...due, ...weak, ...rest].slice(0, n));
}

export function buildVerbQuestions(verbs: VerbItem[], mode: VerbMode, n = 10, onlyDue = false): VerbQuestion[] {
  let base = mode === "prepositions" ? verbs.filter((v) => v.preposition) : verbs.filter((v) => v.praeteritum && v.perfekt);
  if (onlyDue) base = base.filter((v) => v.due);
  // Wrong options come from all verbs, not only the due ones.
  const pool = verbs.filter((v) => (mode === "prepositions" ? v.preposition : v.praeteritum && v.perfekt));
  const out: VerbQuestion[] = [];
  for (const v of pickVerbs(base, n)) {
    const ask: VerbQuestion["ask"] = mode === "prepositions" ? "preposition" : Math.random() < 0.5 ? "praeteritum" : "perfekt";
    const answer = (ask === "preposition" ? v.preposition : v[ask]) as string;
    let options: string[];
    if (ask === "preposition") {
      // Never offer another preposition that is also right for the same verb (arbeiten an, bei, in).
      const valid = new Set(verbs.filter((o) => o.german === v.german && o.preposition).map((o) => o.preposition as string));
      options = prepositionOptions(answer, valid);
    } else {
      options = formOptions(v, ask, pool, answer);
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
