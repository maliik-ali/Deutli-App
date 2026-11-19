import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Skill = { label: string; got: number; max: number };

/**
 * Shown under a free mock result for students without Pro:
 * names their weakest part and says what Pro adds. Nothing invented: only the real score.
 */
export function ProNudgeCard({ skills }: { skills: Skill[] }) {
  const rated = skills.filter((s) => s.max > 0);
  if (rated.length === 0) return null;
  const weakest = rated.reduce((a, b) => (b.got / b.max < a.got / a.max ? b : a));

  return (
    <Card className="flex-row flex-wrap items-center justify-between gap-4 border-gold-ink/50">
      <div className="flex min-w-0 max-w-2xl items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div className="grid gap-1">
          <h2 className="text-lg font-bold">
            Your weakest part: <span lang="de">{weakest.label}</span> ({weakest.got} of {weakest.max})
          </h2>
          <p className="text-[15px] text-muted-foreground">
            One mock shows you where you stand. With Pro you get new full telc B1 mock exams as we publish them, and a teacher to check your writing, so you can watch this score go up.
          </p>
        </div>
      </div>
      <Button asChild>
        <Link href="/dashboard/upgrade">See what Pro includes</Link>
      </Button>
    </Card>
  );
}
