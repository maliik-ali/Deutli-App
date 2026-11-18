import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { ClassRow } from "@/components/classes/class-row";
import { RatingBadge } from "@/components/classes/teacher-card";
import { LanguageFlag } from "@/components/language-flag";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { levelLabel, skillLabel } from "@/lib/classes/constants";
import { getCoursesNow, getTeacherDetails, listTeacherUpcoming } from "@/lib/classes/data";
import { getLanguage } from "@/lib/languages";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatClock, formatShortDate } from "@/lib/time";

export const metadata: Metadata = { title: "Teacher" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TeacherProfilePage(props: PageProps<"/dashboard/teachers/[id]">) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();
  const admin = createAdminClient();
  if (!admin) notFound();

  const teacher = await getTeacherDetails(admin, id);
  if (!teacher || (!teacher.isPublic && user.role === "student")) notFound();
  const [courses, upcoming] = await Promise.all([getCoursesNow(admin, id), listTeacherUpcoming(id, user.id)]);
  const tz = user.timeZone;
  const serverNow = new Date().getTime();

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div className="grid max-w-[960px] gap-6">
        <Link href="/dashboard/classes" className="inline-flex h-11 w-fit items-center gap-1 rounded-full pr-3 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden /> Classes
        </Link>

        <Card className="gap-6 sm:flex-row sm:items-start">
          <Avatar name={teacher.name} url={teacher.avatarUrl} className="size-28 text-4xl" />
          <div className="grid min-w-0 flex-1 gap-3">
            <div className="grid gap-1">
              <h1 className="text-[28px] leading-tight font-extrabold">{teacher.name}</h1>
              {teacher.headline && <p className="text-[16px] font-semibold text-gold-ink">{teacher.headline}</p>}
            </div>
            {teacher.rating && <RatingBadge rating={teacher.rating} />}
            {teacher.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {teacher.specialties.map((s) => (
                  <Badge key={s} variant="gold">
                    {skillLabel(s)}
                  </Badge>
                ))}
              </div>
            )}
            {teacher.speaks.length > 0 && (
              <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-muted-foreground">
                <span className="font-medium">Explains in</span>
                {teacher.speaks.map((code) => (
                  <span key={code} className="inline-flex items-center gap-2 text-foreground">
                    <LanguageFlag code={code} className="size-5" /> {getLanguage(code)?.name ?? code}
                  </span>
                ))}
              </p>
            )}
            {teacher.bio && <p className="max-w-2xl text-[15px] leading-relaxed whitespace-pre-line text-muted-foreground">{teacher.bio}</p>}
          </div>
        </Card>

        <section className="grid gap-3" aria-labelledby="teaching-now">
          <h2 id="teaching-now" className="text-xl font-bold">
            Teaching now
          </h2>
          {courses.length === 0 ? (
            <p className="text-[15px] text-muted-foreground">{teacher.name.split(" ")[0]} has no classes scheduled at the moment.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {courses.map((course) => (
                <li key={course.title}>
                  <Link
                    href={`/dashboard/classes/${course.nextClassId}`}
                    className="grid h-full gap-2 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-gold-ink/60 hover:bg-muted/40"
                  >
                    <span className="text-[16px] font-bold">{course.title}</span>
                    <span className="flex flex-wrap gap-1.5">
                      <Badge>{skillLabel(course.skill)}</Badge>
                      <Badge>{levelLabel(course.level)}</Badge>
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      Next: {formatShortDate(course.nextStartsAt, tz)}, {formatClock(course.nextStartsAt, tz)} ·{" "}
                      {course.classCount} upcoming {course.classCount === 1 ? "class" : "classes"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {upcoming.length > 0 && (
          <section className="grid gap-3" aria-labelledby="upcoming">
            <h2 id="upcoming" className="text-xl font-bold">
              Upcoming classes
            </h2>
            <Card className="gap-0 overflow-hidden p-0">
              <ul className="divide-y divide-border">
                {upcoming.map((c) => (
                  <ClassRow key={c.id} c={c} tz={tz} serverNow={serverNow} showDate />
                ))}
              </ul>
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}
