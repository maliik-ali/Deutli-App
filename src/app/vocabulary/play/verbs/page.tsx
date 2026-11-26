import type { Metadata } from "next";

import { VerbGame } from "@/components/vocabulary/verb-game";
import { requireUser } from "@/lib/auth/dal";
import { listVerbs } from "@/lib/verbs/data";
import { buildVerbQuestions, type VerbMode } from "@/lib/verbs/game";

export const metadata: Metadata = { title: "Verbs game" };

export default async function VerbGamePage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const mode: VerbMode = sp.mode === "prepositions" ? "prepositions" : "forms";
  const verbs = await listVerbs(user.id);
  return (
    <VerbGame
      key={crypto.randomUUID()}
      questions={buildVerbQuestions(verbs, mode)}
      languages={user.languages}
      label={mode === "prepositions" ? "Verbs · Which preposition?" : "Verbs · Verb forms"}
      backHref="/dashboard/vocabulary/verbs"
    />
  );
}
