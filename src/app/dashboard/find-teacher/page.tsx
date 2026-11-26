import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DirectoryCard } from "@/components/directory/teacher-card";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { SKILL_IDS, skillLabel } from "@/lib/classes/constants";
import { listDirectory } from "@/lib/directory/data";
import { isStandalone } from "@/lib/directory/queue";
import { getLanguage } from "@/lib/languages";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Find a teacher" };

const Chip = ({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) => (
  <Link
    href={href}
    aria-current={on ? "true" : undefined}
    className={cn("inline-flex min-h-11 items-center rounded-full border px-4 text-[14px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring sm:min-h-9", on ? "border-gold-ink bg-gold-soft font-semibold" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground")}
  >
    {children}
  </Link>
);

export default async function FindTeacherPage(props: PageProps<"/dashboard/find-teacher">) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const lang = typeof sp.lang === "string" && getLanguage(sp.lang) ? sp.lang : undefined;
  const skill = typeof sp.skill === "string" && (SKILL_IDS as readonly string[]).includes(sp.skill) ? sp.skill : undefined;
  const slots = sp.slots === "1";
  const trial = sp.trial === "1";
  const admin = createAdminClient();
  // Find a teacher is for students who study on their own. A school student has their school.
  if (user.role === "student" && admin && !(await isStandalone(admin, user.id))) redirect("/dashboard");
  const [all, shown] = admin ? await Promise.all([listDirectory(admin), listDirectory(admin, { lang, skill, slots, trial })]) : [[], []];

  const href = (next: { lang?: string; skill?: string; slots?: boolean; trial?: boolean }) => {
    const q = new URLSearchParams();
    const l = "lang" in next ? next.lang : lang;
    const k = "skill" in next ? next.skill : skill;
    const s = "slots" in next ? next.slots : slots;
    const tr = "trial" in next ? next.trial : trial;
    if (l) q.set("lang", l);
    if (k) q.set("skill", k);
    if (s) q.set("slots", "1");
    if (tr) q.set("trial", "1");
    const str = q.toString();
    return `/dashboard/find-teacher${str ? `?${str}` : ""}`;
  };
  const languages = [...new Set(all.flatMap((t) => t.languages))];
  const skills = SKILL_IDS.filter((s) => s !== "general" && all.some((t) => t.specialties.includes(s)));
  const filtered = !!(lang || skill || slots || trial);

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Find a teacher</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">Learning with a teacher helps most with speaking and writing. Pick one who explains in your language, read what students say, then ask to join.</p>
      </header>

      {all.length > 0 && (
        <div className="grid gap-3" aria-label="Filters">
          {languages.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-24 text-[13px] font-medium text-muted-foreground">Explains in</span>
              {languages.map((c) => (
                <Chip key={c} href={href({ lang: lang === c ? undefined : c })} on={lang === c}>
                  {getLanguage(c)?.name ?? c}
                </Chip>
              ))}
            </div>
          )}
          {skills.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-24 text-[13px] font-medium text-muted-foreground">Teaches</span>
              {skills.map((s) => (
                <Chip key={s} href={href({ skill: skill === s ? undefined : s })} on={skill === s}>
                  {skillLabel(s)}
                </Chip>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-24 text-[13px] font-medium text-muted-foreground">Available</span>
            <Chip href={href({ trial: !trial })} on={trial}>
              Trial lesson
            </Chip>
            <Chip href={href({ slots: !slots })} on={slots}>
              Free 1:1 slot
            </Chip>
            {filtered && (
              <Link href="/dashboard/find-teacher" className="inline-flex min-h-11 items-center px-2 text-[14px] font-medium underline underline-offset-4 hover:text-gold-ink sm:min-h-9">
                Clear filters
              </Link>
            )}
          </div>
        </div>
      )}

      {all.length === 0 ? (
        <Card className="max-w-[760px] gap-2 p-6">
          <p className="font-semibold">No teachers are listed yet</p>
          <p className="text-[14px] text-muted-foreground">Teachers and academies appear here when they choose to. Until then, you can learn on your own with vocabulary, Daily Practice and mock exams.</p>
        </Card>
      ) : shown.length === 0 ? (
        <Card className="max-w-[760px] gap-2 p-6">
          <p className="font-semibold">No teacher matches these filters</p>
          <Link href="/dashboard/find-teacher" className="w-fit text-[14px] font-medium underline underline-offset-4">Clear filters</Link>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((t) => (
            <DirectoryCard key={t.id} t={t} />
          ))}
        </ul>
      )}
    </main>
  );
}
