import "server-only";

import { dictionaryKeys } from "@/lib/dictionary/keys";
import { LEVELS, type Level } from "@/lib/dictionary/csv";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";
import { getVocabulary, type VocabWord } from "./data";
import { LEARNED_BOX } from "./srs";

export { LEVELS, type Level };

/** Words per set when the sheet has no topic column, and per lesson in "Learn new words". */
export const SET_SIZE = 50;
export const LESSON_SIZE = 10;

export type LevelWord = {
  id: string;
  position: number;
  german: string;
  article: string | null;
  plural: string | null;
  /** "der Name" for nouns, the word itself otherwise. */
  head: string;
  /** The topic from the sheet, or "Set 1", "Set 2"… (50 words each, in list order). */
  topic: string;
  translations: Record<string, string>;
  /** Example sentences: "de" = German, other keys = its translation. */
  examples: Record<string, string>;
  /** The student's progress, or null if they haven't started this word yet. */
  progress: VocabWord | null;
};

export type LevelTopic = { name: string; total: number; started: number; learned: number };

export type LevelList = {
  level: Level;
  words: LevelWord[];
  topics: LevelTopic[];
  /** Meaning languages the sheet has, e.g. ["en", "ur"]. */
  languages: LanguageCode[];
  /** Example sentence languages, e.g. ["de", "en"]. */
  exampleLanguages: string[];
  today: string;
  failed: boolean;
};

export function levelLabel(level: Level) {
  return level.toUpperCase();
}

export function toLevelParam(value: unknown): Level | null {
  const v = typeof value === "string" ? value.toLowerCase() : "";
  return (LEVELS as readonly string[]).includes(v) ? (v as Level) : null;
}

export type LevelStatus = "unseen" | "learning" | "learned";
export function levelStatus(w: LevelWord): LevelStatus {
  if (!w.progress) return "unseen";
  return w.progress.box >= LEARNED_BOX ? "learned" : "learning";
}

/** One level's word list with the student's progress on each word. */
export async function getLevelList(userId: string, level: Level): Promise<LevelList> {
  const supabase = await createClient();
  const [{ data, error }, vocab] = await Promise.all([
    supabase
      .from("level_words")
      .select("id, position, topic, german, article, plural, translations, examples")
      .eq("level", level)
      .order("position", { ascending: true })
      .limit(5000),
    getVocabulary(userId),
  ]);
  const empty = { level, words: [], topics: [], languages: [], exampleLanguages: [], today: vocab.today };
  if (error || vocab.failed) return { ...empty, failed: true };

  // The student's own words, found by the word or its dictionary form ("der Name" -> "name").
  const mine = new Map<string, VocabWord>();
  for (const w of vocab.words) {
    for (const k of [...dictionaryKeys(w.word), ...dictionaryKeys(w.dictionaryForm ?? "")]) {
      if (!mine.has(k)) mine.set(k, w);
    }
  }

  let untitled = 0;
  const words: LevelWord[] = (data ?? []).map((r) => {
    const topic = r.topic?.trim() || `Set ${Math.floor(untitled++ / SET_SIZE) + 1}`;
    return {
      id: r.id,
      position: r.position,
      german: r.german,
      article: r.article,
      plural: r.plural,
      head: r.article ? `${r.article} ${r.german}` : r.german,
      topic,
      translations: (r.translations ?? {}) as Record<string, string>,
      examples: (r.examples ?? {}) as Record<string, string>,
      progress: mine.get(r.german.toLowerCase()) ?? null,
    };
  });

  const topics = new Map<string, LevelTopic>();
  for (const w of words) {
    const t = topics.get(w.topic) ?? { name: w.topic, total: 0, started: 0, learned: 0 };
    t.total++;
    if (w.progress) t.started++;
    if (w.progress && w.progress.box >= LEARNED_BOX) t.learned++;
    topics.set(w.topic, t);
  }

  const langs = new Set(words.flatMap((w) => Object.keys(w.translations)));
  const exLangs = new Set(words.flatMap((w) => Object.keys(w.examples)));
  return {
    level,
    words,
    topics: [...topics.values()],
    languages: [...langs].filter((c): c is LanguageCode => !!getLanguage(c)),
    // German sentence first, then its translations.
    exampleLanguages: [...exLangs]
      .filter((c) => c === "de" || getLanguage(c))
      .sort((a, b) => (a === "de" ? -1 : b === "de" ? 1 : 0)),
    today: vocab.today,
    failed: false,
  };
}

/**
 * The next lesson: up to 10 words the student hasn't started, in list order.
 * With a topic, only from that topic; otherwise from the first topic that still has new words.
 */
export function nextLesson(list: LevelList, topic?: string | null): LevelWord[] {
  const unseen = list.words.filter((w) => !w.progress);
  const inTopic = topic ? unseen.filter((w) => w.topic === topic) : [];
  const pool = inTopic.length ? inTopic : unseen.filter((w) => w.topic === unseen[0]?.topic);
  return pool.slice(0, LESSON_SIZE);
}

/** Languages to show meanings in: the student's languages that the list has, else the list's first. */
export function meaningLanguages(list: LevelList, mine: LanguageCode[]): LanguageCode[] {
  const both = mine.filter((c) => list.languages.includes(c));
  if (both.length) return both;
  return list.languages.includes("en") ? ["en"] : list.languages.slice(0, 1);
}
