import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { SKILL_ICONS } from "@/components/exam/skill-icons";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { getExamFormat } from "@/lib/exam/catalog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Skills" };

// One Deutli brand colour per skill, used only for the card border (soft, stronger on hover).
const BORDERS: Record<string, string> = {
  reading: "border-gold/50 group-hover:border-gold",
  listening: "border-brand-cyan/50 group-hover:border-brand-cyan",
  writing: "border-brand-magenta/50 group-hover:border-brand-magenta",
  speaking: "border-success/50 group-hover:border-success",
};

export default async function SkillsPage() {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const format = getExamFormat(user.exam);
  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Skills</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">The four parts of the exam. Open one to see its tasks, time and points.</p>
      </header>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {format.skills.map((s) => {
          const Icon = SKILL_ICONS[s.slug];
          return (
            <Link key={s.slug} href={`/dashboard/exam/${s.slug}`} className="group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className={cn("h-full transition-colors", BORDERS[s.slug])}>
                <span className="grid size-11 place-items-center rounded-xl bg-gold-soft text-gold-ink">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="grid gap-1">
                  <h2 className="flex items-center gap-1 text-lg font-bold">
                    {s.english}
                    <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gold-ink" aria-hidden />
                  </h2>
                  <p className="text-[13px] text-muted-foreground">{s.german}</p>
                </div>
                <p className="text-[14px] text-muted-foreground">{s.summary}</p>
                <p className="mt-auto text-[13px] font-medium text-subtle-foreground">
                  {s.minutes} min · {s.maxPoints} points
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
