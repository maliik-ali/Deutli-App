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
  /** The topic name, or "Set 1", "Set 2"… (50 words each, in list order) for words without a topic yet. */
  topic: string;
  translations: Record<string, string>;
  /** Example sentences: "de" = German, other keys = its translation. */
  examples: Record<string, string>;
  /** The student's progress, or null if they haven't started this word yet. */
  progress: VocabWord | null;
};

export type LevelTopic = {
  name: string;
  /** The topic name in other languages, e.g. {"en": "Food and drink"}. */
  translations: Record<string, string>;
  total: number;
  started: number;
  learned: number;
};

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

type TopicRow = { name: string; position: number; translations: Record<string, string> | null };
type WordRow = {
  id: string;
  position: number;
  german: string;
  article: string | null;
  plural: string | null;
  translations: Record<string, string> | null;
  examples: Record<string, string> | null;
  level_topics: TopicRow | TopicRow[] | null;
};

/** All words of a level, 1000 at a time (the database returns at most 1000 rows per request). */
async function readLevelWords(level: Level): Promise<WordRow[] | null> {
  const supabase = await createClient();
  const rows: WordRow[] = [];
  for (let from = 0; from < 10000; from += 1000) {
    const { data, error } = await supabase
      .from("level_words")
      .select("id, position, german, article, plural, translations, examples, level_topics (name, position, translations)")
      .eq("level", level)
      .order("position", { ascending: true })
      .range(from, from + 999);
    if (error) return null;
    rows.push(...((data ?? []) as unknown as WordRow[]));
    if ((data ?? []).length < 1000) break;
  }
  return rows;
}

/** Meanings the list doesn't have in the student's languages, from the shared dictionary (free, no AI). */
async function fillMeanings(rows: WordRow[], languages: string[]) {
  const missing = rows.filter((r) => languages.some((c) => !r.translations?.[c]));
  if (missing.length === 0) return;
  const supabase = await createClient();
  const keys = [...new Set(missing.map((r) => r.german.toLowerCase()))];
  const found = new Map<string, Record<string, string>>();
  for (let i = 0; i < keys.length; i += 200) {
    const { data } = await supabase
      .from("word_dictionary")
      .select("word_key, translations")
      .in("word_key", keys.slice(i, i + 200));
    for (const e of data ?? []) found.set(e.word_key, (e.translations ?? {}) as Record<string, string>);
  }
  for (const r of missing) {
    const extra = found.get(r.german.toLowerCase());
    if (extra) r.translations = { ...extra, ...(r.translations ?? {}) };
  }
}

/** One level's word list with the student's progress on each word, in topic order. */
export async function getLevelList(userId: string, level: Level, languages: string[] = []): Promise<LevelList> {
  const [data, vocab] = await Promise.all([readLevelWords(level), getVocabulary(userId)]);
  const error = data === null;
  if (data) await fillMeanings(data, languages);
  const empty = { level, words: [], topics: [], languages: [], exampleLanguages: [], today: vocab.today };
  if (error || vocab.failed) return { ...empty, failed: true };

  // The student's own words, found by the word or its dictionary form ("der Name" -> "name").
  const mine = new Map<string, VocabWord>();
  for (const w of vocab.words) {
    for (const k of [...dictionaryKeys(w.word), ...dictionaryKeys(w.dictionaryForm ?? "")]) {
      if (!mine.has(k)) mine.set(k, w);
    }
  }

  // Words with a topic first (in the topics' order), then the rest in sets of 50.
  const topicOf = (r: WordRow) => (Array.isArray(r.level_topics) ? r.level_topics[0] : r.level_topics) ?? null;
  const sorted = [...(data ?? [])].sort((a, b) => {
    const ta = topicOf(a)?.position ?? Number.MAX_SAFE_INTEGER;
    const tb = topicOf(b)?.position ?? Number.MAX_SAFE_INTEGER;
    return ta - tb || a.position - b.position;
  });
  const topicNames = new Map<string, Record<string, string>>();
  let untitled = 0;
  const words: LevelWord[] = sorted.map((r) => {
    const t = topicOf(r);
    const topic = t?.name ?? `Set ${Math.floor(untitled++ / SET_SIZE) + 1}`;
    if (t && !topicNames.has(t.name)) topicNames.set(t.name, (t.translations ?? {}) as Record<string, string>);
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
    const t = topics.get(w.topic) ?? {
      name: w.topic,
      translations: topicNames.get(w.topic) ?? {},
      total: 0,
      started: 0,
      learned: 0,
    };
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
