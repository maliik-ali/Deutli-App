import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Layers } from "lucide-react";

import { SKILL_ICONS } from "@/components/exam/skill-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { EXAM_SKILLS, MOCK_EXAMS, getExamSkill } from "@/lib/exam/catalog";

export function generateStaticParams() {
  return EXAM_SKILLS.map((s) => ({ skill: s.slug }));
}

export async function generateMetadata(props: PageProps<"/dashboard/exam/[skill]">): Promise<Metadata> {
  const skill = getExamSkill((await props.params).skill);
  return { title: skill ? `${skill.english} · My B1 Exam` : "My B1 Exam" };
}

export default async function SkillPage(props: PageProps<"/dashboard/exam/[skill]">) {
  const skill = getExamSkill((await props.params).skill);
  if (!skill) notFound();
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const Icon = SKILL_ICONS[skill.slug];
  const freeMock = MOCK_EXAMS.find((e) => e.free);
  const notGoethe = user.exam && user.exam !== "goethe_b1" && user.exam !== "other";

  return (
    <main className="mx-auto grid max-w-[1240px] gap-8 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gold-soft text-gold-ink">
          <Icon className="size-7" aria-hidden />
        </span>
        <div className="grid gap-3">
          <h1 className="text-[28px] font-extrabold sm:text-[32px]">
            {skill.english} <span className="font-semibold text-muted-foreground">· {skill.german}</span>
          </h1>
          <p className="max-w-2xl text-muted-foreground">{skill.summary}</p>
          <div className="flex flex-wrap gap-2">
            <Badge>
              <Clock aria-hidden /> {skill.minutes} minutes
            </Badge>
            <Badge>
              <Layers aria-hidden /> {skill.parts.length} parts
            </Badge>
          </div>
        </div>
      </header>

      {notGoethe && (
        <p className="rounded-2xl border border-border bg-card px-5 py-4 text-[14px] text-muted-foreground">
          These parts follow the Goethe-Zertifikat B1. Your exam is close to it; parts made for your exam come later.
        </p>
      )}

      <section aria-labelledby="parts" className="grid gap-4">
        <h2 id="parts" className="text-xl font-bold">
          The parts of the exam
        </h2>
        <ol className="grid gap-3 md:grid-cols-2">
          {skill.parts.map((p) => (
            <li key={p.title}>
              <Card className="h-full gap-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold tracking-[0.12em] text-gold-ink uppercase">{p.title}</span>
                  <Badge variant="outline">Practice coming soon</Badge>
                </div>
                <div className="grid gap-1">
                  <h3 className="text-lg font-bold">{p.task}</h3>
                  <p className="text-[14px] text-muted-foreground">{p.detail}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {freeMock && (
        <Card className="items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-1">
            <h2 className="text-lg font-bold">Try it under exam conditions</h2>
            <p className="text-[14px] text-muted-foreground">
              The free {freeMock.city} mock exam has all {skill.parts.length} {skill.english.toLowerCase()} parts.
            </p>
          </div>
          <Button asChild>
            <Link href={`/dashboard/exam/mock/${freeMock.id}`}>Open free mock exam</Link>
          </Button>
        </Card>
      )}
    </main>
  );
}
