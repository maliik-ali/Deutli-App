import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { VerbList } from "@/components/vocabulary/verb-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { listVerbs } from "@/lib/verbs/data";

export const metadata: Metadata = { title: "Verbs" };

export default async function VerbsPage() {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const verbs = await listVerbs(user.id);
  const withPrep = verbs.filter((v) => v.preposition).length;

  return (
    <main className="mx-auto grid max-w-[960px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <Link href="/dashboard/vocabulary" className="inline-flex h-11 w-fit items-center gap-1 rounded-full pr-3 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden /> Vocabulary
      </Link>
      <header className="grid gap-1">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Verbs</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">
          The forms you need for the exam: Präsens, Präteritum and Perfekt, plus the preposition and case a verb takes. Tap a verb for an example.
        </p>
      </header>

      {verbs.length === 0 ? (
        <Card className="gap-2 p-6">
          <p className="font-semibold">The verbs list is coming soon</p>
          <p className="text-[14px] text-muted-foreground">We are adding it now. Your word lists on the Vocabulary page work as usual.</p>
        </Card>
      ) : (
        <>
          <section aria-label="Games" className="grid gap-3 sm:grid-cols-2">
            <Card className="flex-row items-center gap-4 p-4">
              <div className="grid min-w-0 flex-1 gap-0.5">
                <h2 className="font-bold">Verb forms</h2>
                <p className="text-sm text-muted-foreground">Pick the Präteritum or Perfekt.</p>
              </div>
              <Button asChild variant="outline" className="shrink-0"><Link href="/vocabulary/play/verbs?mode=forms">Play</Link></Button>
            </Card>
            <Card className="flex-row items-center gap-4 p-4">
              <div className="grid min-w-0 flex-1 gap-0.5">
                <h2 className="font-bold">Which preposition?</h2>
                <p className="text-sm text-muted-foreground">warten auf, denken an… ({withPrep} verbs)</p>
              </div>
              <Button asChild variant="outline" className="shrink-0"><Link href="/vocabulary/play/verbs?mode=prepositions">Play</Link></Button>
            </Card>
          </section>
          <VerbList verbs={verbs} languages={user.languages} />
        </>
      )}
    </main>
  );
}
