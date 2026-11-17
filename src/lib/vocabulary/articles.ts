/** der / die / das game: shared helpers (used on the server and in the browser). */

export type Article = "der" | "die" | "das";
export const ARTICLES: Article[] = ["der", "die", "das"];

export type ArticleWord = {
  /** Level word id (A1/A2/B1 lists) or the student's own word id (My words). */
  id: string;
  kind: "level" | "mine";
  noun: string;
  article: Article;
  plural: string | null;
  /** Meanings by language code. */
  translations: Record<string, string>;
};

/** "der Name" -> { article: "der", noun: "Name" }. */
export function splitArticle(form: string | null | undefined): { article: Article; noun: string } | null {
  const m = (form ?? "").trim().match(/^(der|die|das)\s+(\S.*)$/i);
  if (!m) return null;
  return { article: m[1].toLowerCase() as Article, noun: m[2] };
}

// Endings that (almost) always decide the article. Only rules a learner can rely on.
const RULES: { test: RegExp; article: Article; tip: string }[] = [
  { test: /ung$/, article: "die", tip: "Nouns ending in -ung are always die." },
  { test: /heit$/, article: "die", tip: "Nouns ending in -heit are always die." },
  { test: /keit$/, article: "die", tip: "Nouns ending in -keit are always die." },
  { test: /schaft$/, article: "die", tip: "Nouns ending in -schaft are always die." },
  { test: /(tion|sion)$/, article: "die", tip: "Nouns ending in -tion or -sion are always die." },
  { test: /tät$/, article: "die", tip: "Nouns ending in -tät are always die." },
  { test: /(chen|lein)$/, article: "das", tip: "Nouns ending in -chen or -lein are always das." },
  { test: /ling$/, article: "der", tip: "Nouns ending in -ling are always der." },
  { test: /ismus$/, article: "der", tip: "Nouns ending in -ismus are always der." },
];
const DAYS =
  /^(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|januar|jänner|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember|frühling|sommer|herbst|winter)$/i;

/**
 * A tip that explains the article, when a reliable rule fits; otherwise null.
 * Tips are only shown for words that follow the rule (a rule's rare exceptions never get a wrong tip).
 */
export function articleTip(word: ArticleWord): string | null {
  const lower = word.noun.trim().toLowerCase();
  if (DAYS.test(lower) && word.article === "der") return "Days, months and seasons are always der.";
  // Female people: die Ärztin, die Ärztinnen.
  if (word.article === "die" && /in$/.test(lower) && word.plural?.toLowerCase().endsWith("innen")) {
    return "Words for women ending in -in are always die (die Ärztin, die Kollegin).";
  }
  return RULES.find((r) => r.test.test(lower) && r.article === word.article)?.tip ?? null;
}
