import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Layers, ListChecks, Target, type LucideIcon } from "lucide-react";

import { SKILL_ICONS } from "@/components/exam/skill-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { MOCK_EXAMS, SKILL_SLUGS, getExamFormat, type ExamPart } from "@/lib/exam/catalog";

const TITLES: Record<string, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
};

export async function generateMetadata(props: PageProps<"/dashboard/exam/[skill]">): Promise<Metadata> {
  const title = TITLES[(await props.params).skill];
  return { title: title ? `${title} · My B1 Exam` : "My B1 Exam" };
}

/** Sum of "N questions" over the parts; 0 when the parts are not counted in questions. */
function questionCount(parts: ExamPart[]) {
  return parts.reduce((sum, p) => sum + Number(/^(\d+) questions?$/.exec(p.amount)?.[1] ?? 0), 0);
}

export default async function SkillPage(props: PageProps<"/dashboard/exam/[skill]">) {
  const { skill: slug } = await props.params;
  if (!SKILL_SLUGS.some((s) => s === slug)) notFound();
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const format = getExamFormat(user.exam);
  const skill = format.skills.find((s) => s.slug === slug);
  if (!skill) notFound();

  const Icon = SKILL_ICONS[skill.slug];
  const freeMock = MOCK_EXAMS.find((e) => e.free);
  const questions = questionCount(skill.parts);
  const partsLabel = skill.parts.length === 1 ? "1 task" : `${skill.parts.length} parts`;

  return (
    <main className="mx-auto grid max-w-[1240px] gap-8 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gold-soft text-gold-ink">
          <Icon className="size-7" aria-hidden />
        </span>
        <div className="grid gap-3">
          <Badge variant="gold">{format.name}</Badge>
          <h1 className="text-[28px] font-extrabold sm:text-[32px]">
            {skill.english} <span className="font-semibold text-muted-foreground">· {skill.german}</span>
          </h1>
          <p className="max-w-2xl text-muted-foreground">{skill.summary}</p>
        </div>
      </header>

      {!format.exact && (
        <p className="rounded-2xl border border-border bg-card px-5 py-4 text-[14px] text-muted-foreground">
          This is the Goethe-Zertifikat B1 format. We don&apos;t have the details of your exam yet.{" "}
          <Link href="/onboarding?again=1" className="font-semibold text-gold-ink hover:underline">
            Change your exam
          </Link>
        </p>
      )}

      <section aria-label="This section at a glance" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
        <Stat icon={Clock} label="Time" value={skill.timeLabel} />
        <Stat icon={Layers} label="Parts" value={partsLabel} />
        <Stat icon={ListChecks} label={questions ? "Questions" : "Format"} value={questions ? String(questions) : skill.slug === "speaking" ? "With a partner" : "Your own text"} />
        <Stat icon={Target} label="Points you can get" value={String(skill.maxPoints)} />
      </section>

      {skill.timeNote && <p className="-mt-3 text-[14px] text-muted-foreground">{skill.timeNote}</p>}

      <section aria-labelledby="parts" className="grid gap-4">
        <h2 id="parts" className="text-xl font-bold">
          How it comes in the real exam
        </h2>
        <PartList parts={skill.parts} />
      </section>

      {skill.extra && (
        <section aria-labelledby="extra" className="grid gap-4">
          <div className="grid gap-1">
            <h2 id="extra" className="text-xl font-bold">
              {skill.extra.title} <span className="font-semibold text-muted-foreground">· {skill.extra.english}</span>
            </h2>
            <p className="max-w-2xl text-[14px] text-muted-foreground">{skill.extra.intro}</p>
          </div>
          <PartList parts={skill.extra.parts} />
        </section>
      )}

      <Card className="gap-4">
        <h2 className="text-lg font-bold">Points and passing</h2>
        <dl className="grid gap-4 text-[15px] md:grid-cols-2 md:gap-8">
          <div className="grid content-start gap-1">
            <dt className="font-semibold">{skill.english}</dt>
            <dd className="text-muted-foreground">{skill.scoring}</dd>
          </div>
          <div className="grid content-start gap-1">
            <dt className="font-semibold">The whole exam</dt>
            <dd className="text-muted-foreground">{format.passRule}</dd>
          </div>
        </dl>
      </Card>

      {freeMock && (
        <Card className="items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-1">
            <h2 className="text-lg font-bold">Try it under exam conditions</h2>
            <p className="text-[14px] text-muted-foreground">
              The free {freeMock.city} mock exam has the full {skill.english.toLowerCase()} section.
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

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card className="gap-2 p-4 sm:p-5">
      <span className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
        <Icon className="size-4 text-gold-ink" aria-hidden /> {label}
      </span>
      <span className="font-heading text-xl leading-tight font-extrabold sm:text-2xl">{value}</span>
    </Card>
  );
}

function PartList({ parts }: { parts: ExamPart[] }) {
  return (
    <ol className="grid gap-3 md:grid-cols-2">
      {parts.map((p) => (
        <li key={p.title}>
          <Card className="h-full gap-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-semibold tracking-[0.12em] text-gold-ink uppercase">{p.title}</span>
              {p.points !== undefined && <Badge variant="gold">{p.points} points</Badge>}
            </div>
            <div className="grid gap-1">
              <h3 className="text-lg font-bold">{p.task}</h3>
              <p className="text-[14px] text-muted-foreground">{p.detail}</p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <Badge>{p.amount}</Badge>
              {p.note && <Badge>{p.note}</Badge>}
            </div>
          </Card>
        </li>
      ))}
    </ol>
  );
}
