import Link from "next/link";
import { Flame, Target } from "lucide-react";

import { Meaning } from "@/components/vocabulary/meanings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { LanguageCode } from "@/lib/languages";
import type { VocabProgress } from "@/lib/vocabulary/progress";

/** A short summary at the top of My words: how the words are doing, how many answers were right, and what needs work. */
export function ProgressStrip({ progress, languages }: { progress: VocabProgress; languages: LanguageCode[] }) {
  const { stages, week, streak, weak, today } = progress;
  const total = stages.new + stages.learning + stages.learned;
  const pct = week ? Math.round((week.right / (week.right + week.wrong)) * 100) : null;
  const seg = (n: number) => (total ? `${(n / total) * 100}%` : "0%");

  return (
    <section aria-label="Your progress" className="grid gap-3">
      <h2 className="text-[15px] font-semibold text-muted-foreground">Your progress</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="gap-3 p-4 sm:p-5">
          <p className="text-[13px] font-medium text-muted-foreground">All your words, every list</p>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-border" role="img" aria-label={`${stages.learned} learned, ${stages.learning} learning, ${stages.new} new`}>
            <span className="bg-brand-cyan" style={{ width: seg(stages.learned) }} />
            <span className="bg-gold" style={{ width: seg(stages.learning) }} />
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            <li className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full bg-brand-cyan" /> {stages.learned} learned</li>
            <li className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full bg-gold" /> {stages.learning} learning</li>
            <li className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full bg-border" /> {stages.new} new</li>
          </ul>
        </Card>

        <Card className="gap-1 p-4 sm:p-5">
          <p className="text-[13px] font-medium text-muted-foreground">Right answers, last 7 days</p>
          {week && pct !== null ? (
            <>
              <p className="font-heading text-[34px] leading-none font-extrabold tabular-nums">{pct}%</p>
              <p className="text-[13px] text-muted-foreground">{week.right} of {week.right + week.wrong} answers right</p>
            </>
          ) : (
            <p className="pt-1 text-[14px] text-muted-foreground">Practise a few words to see how you are doing.</p>
          )}
        </Card>

        <Card className="gap-1 p-4 sm:p-5">
          <p className="text-[13px] font-medium text-muted-foreground">Practice streak</p>
          <p className="flex items-center gap-2 font-heading text-[34px] leading-none font-extrabold tabular-nums">
            <Flame className={streak > 0 ? "size-7 text-gold-ink" : "size-7 text-muted-foreground"} aria-hidden /> {streak}
            <span className="text-[15px] font-semibold text-muted-foreground">{streak === 1 ? "day" : "days"}</span>
          </p>
          <p className="text-[13px] text-muted-foreground">{today ? "You practised today. Come back tomorrow to keep it going." : streak > 0 ? "Answer a word today to keep it going." : "Answer a word today to start one."}</p>
        </Card>
      </div>

      {weak.length > 0 && (
        <Card className="gap-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[15px] font-bold"><Target className="size-[18px] text-gold-ink" aria-hidden /> Needs work</p>
            <Button asChild size="sm" variant="outline"><Link href="/vocabulary/practice?set=weak">Practise these</Link></Button>
          </div>
          <ul className="divide-y divide-border">
            {weak.map((w) => {
              const code = languages.find((c) => w.translations[c]) ?? ("en" as LanguageCode);
              return (
                <li key={w.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                  <span className="min-w-0">
                    <span lang="de" className="font-semibold">{w.head}</span>{" "}
                    <Meaning code={code} text={w.translations[code]} className="text-[14px] text-muted-foreground" />
                  </span>
                  <span className="text-[12px] text-muted-foreground">{w.wrong} wrong · {w.right} right</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </section>
  );
}
