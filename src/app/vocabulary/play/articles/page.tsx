import type { Metadata } from "next";

import { ArticleGame } from "@/components/vocabulary/article-game";
import { requireUser } from "@/lib/auth/dal";
import { splitArticle, type ArticleWord } from "@/lib/vocabulary/articles";
import { getVocabulary } from "@/lib/vocabulary/data";
import { getLevelList, levelLabel, meaningLanguages, toLevelParam } from "@/lib/vocabulary/levels";

export const metadata: Metadata = { title: "der, die oder das?" };

const ROUND = 10;

/** Random pick of n items (a new mix on every round). */
function sample<T>(list: T[], n: number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export default async function ArticleGamePage(props: PageProps<"/vocabulary/play/articles">) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const level = toLevelParam(sp.list);
  const topic = typeof sp.topic === "string" ? sp.topic : null;

  if (level) {
    const data = await getLevelList(user.id, level, user.languages);
    const nouns = data.words.filter((w) => w.article && (!topic || w.topic === topic));
    // Words the student has met first (weakest first), then the next new ones in list order.
    const met = nouns
      .filter((w) => w.progress)
      .sort((a, b) => (b.progress!.wrongCount ?? 0) - (a.progress!.wrongCount ?? 0))
      .slice(0, 30);
    const fresh = nouns.filter((w) => !w.progress).slice(0, Math.max(ROUND, 20 - met.length));
    const round = sample([...met, ...fresh], ROUND).map(
      (w): ArticleWord => ({
        id: w.id,
        kind: "level",
        noun: w.german,
        article: w.article as ArticleWord["article"],
        plural: w.plural,
        translations: { ...w.translations, ...(w.progress?.translations ?? {}) },
      }),
    );
    const back = `/dashboard/vocabulary?list=${level}${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`;
    return (
      <ArticleGame
        key={crypto.randomUUID()}
        words={round}
        languages={meaningLanguages(data, user.languages)}
        label={`${levelLabel(level)}${topic ? ` · ${topic}` : ""}`}
        backHref={back}
      />
    );
  }

  // The student's own saved nouns ("der Arbeitsbereich").
  const { words } = await getVocabulary(user.id);
  const nouns = words
    .filter((w) => w.source !== "level")
    .map((w) => ({ w, split: splitArticle(w.dictionaryForm) }))
    .filter((x) => x.split !== null);
  const round = sample(nouns, ROUND).map(
    ({ w, split }): ArticleWord => ({
      id: w.id,
      kind: "mine",
      noun: split!.noun,
      article: split!.article,
      plural: null,
      translations: w.translations,
    }),
  );
  return (
    <ArticleGame
      key={crypto.randomUUID()}
      words={round}
      languages={user.languages}
      label="My words"
      backHref="/dashboard/vocabulary"
    />
  );
}
