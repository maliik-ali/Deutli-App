import type { Metadata } from "next";

import { VocabPractice, type PracticeWord } from "@/components/vocabulary/practice";
import { requireUser } from "@/lib/auth/dal";
import { getVocabulary, inSet, type VocabSet } from "@/lib/vocabulary/data";
import {
  getLevelList,
  levelLabel,
  levelStatus,
  meaningLanguages,
  nextLesson,
  toLevelParam,
  type LevelWord,
} from "@/lib/vocabulary/levels";

export const metadata: Metadata = { title: "Practise words" };

const SESSION_SIZE = 10;
const SETS: VocabSet[] = ["all", "due", "marked", "learned"];
const LABELS: Record<string, string> = {
  all: "All words",
  due: "Due today",
  marked: "Marked words",
  learned: "Learned words",
  learning: "Learning",
  learn: "New words",
};

export default async function VocabPracticePage(props: PageProps<"/vocabulary/practice">) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const level = toLevelParam(sp.list);

  if (level) {
    // A1 / A2 / B1 word lists.
    const set = typeof sp.set === "string" && sp.set in LABELS ? sp.set : "due";
    const topic = typeof sp.topic === "string" ? sp.topic : null;
    const data = await getLevelList(user.id, level, user.languages);
    const languages = meaningLanguages(data, user.languages);
    const first = languages[0];
    const back = `/dashboard/vocabulary?list=${level}${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`;

    const fromLevel = (w: LevelWord, id: string): PracticeWord => ({
      id,
      word: w.german,
      head: w.head,
      translations: { ...w.translations, ...(w.progress?.translations ?? {}) },
      context: w.examples.de ?? null,
      contextTranslation: (first && w.examples[first]) || w.examples.en || null,
      box: w.progress?.box ?? 0,
    });

    let pool: PracticeWord[];
    if (set === "learn") {
      pool = nextLesson(data, topic).map((w) => fromLevel(w, w.id));
    } else {
      pool = data.words
        .filter((w) => w.progress)
        .filter((w) => !topic || w.topic === topic)
        .filter((w) =>
          set === "due"
            ? w.progress!.dueOn <= data.today
            : set === "marked"
              ? w.progress!.starred
              : set === "learning" || set === "learned"
                ? levelStatus(w) === set
                : true,
        )
        .sort((a, b) => (a.progress!.dueOn < b.progress!.dueOn ? -1 : a.progress!.dueOn > b.progress!.dueOn ? 1 : 0))
        .slice(0, SESSION_SIZE)
        .map((w) => fromLevel(w, w.progress!.id));
    }
    // Wrong answers for the quiz: other words of the same level.
    const distractors = data.words
      .filter((w) => w.translations[first])
      .slice(0, 400)
      .map((w) => fromLevel(w, `d-${w.id}`));

    return (
      <VocabPractice
        words={pool}
        distractors={distractors}
        languages={languages}
        setLabel={`${levelLabel(level)} · ${topic && set === "learn" ? topic : LABELS[set]}`}
        mode={set === "learn" ? "learn" : "review"}
        backHref={back}
        emptyHref={back}
      />
    );
  }

  // The student's own saved words.
  const set = (SETS.find((s) => s === sp.set) ?? "due") as VocabSet;
  const { words: all, today } = await getVocabulary(user.id);
  // The student's own saved words, plus the words marked with a star in a level list (same list as My words).
  const words = all.filter((w) => w.source !== "level" || w.starred);
  const first = user.languages[0];

  // Words that are due first (oldest due date first), then the newest.
  const pool = words
    .filter((w) => inSet(w, set, today))
    .sort((a, b) => (a.dueOn === b.dueOn ? 0 : a.dueOn < b.dueOn ? -1 : 1))
    .slice(0, SESSION_SIZE);

  const toPractice = (w: (typeof words)[number]): PracticeWord => ({
    id: w.id,
    word: w.word,
    head: w.dictionaryForm ?? w.word,
    translations: w.translations,
    context: w.context,
    box: w.box,
  });

  // Wrong answers for "Choose the correct translation": the student's other words with a meaning.
  const distractors = all
    .filter((w) => w.translations[first])
    .slice(0, 200)
    .map(toPractice);

  return (
    <VocabPractice
      words={pool.map(toPractice)}
      distractors={distractors}
      languages={user.languages}
      setLabel={LABELS[set]}
    />
  );
}
