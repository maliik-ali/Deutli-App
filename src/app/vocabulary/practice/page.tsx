import type { Metadata } from "next";

import { VocabPractice, type PracticeWord } from "@/components/vocabulary/practice";
import { requireUser } from "@/lib/auth/dal";
import { getVocabulary, inSet, type VocabSet } from "@/lib/vocabulary/data";

export const metadata: Metadata = { title: "Practise words" };

const SESSION_SIZE = 10;
const SETS: VocabSet[] = ["all", "due", "marked", "learned"];

export default async function VocabPracticePage(props: PageProps<"/vocabulary/practice">) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const set = (SETS.find((s) => s === sp.set) ?? "due") as VocabSet;
  const { words, today } = await getVocabulary(user.id);
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
  const distractors = words
    .filter((w) => w.translations[first])
    .slice(0, 200)
    .map(toPractice);

  return (
    <VocabPractice
      words={pool.map(toPractice)}
      distractors={distractors}
      languages={user.languages}
      setLabel={{ all: "All words", due: "Due today", marked: "Marked words", learned: "Learned words" }[set]}
    />
  );
}
