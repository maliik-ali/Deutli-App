import Link from "next/link";
import { MapPin } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { LanguageFlag } from "@/components/language-flag";
import { ProfileLinks } from "@/components/profile/profile-links";
import { Card } from "@/components/ui/card";
import { getLanguage } from "@/lib/languages";
import type { ProfileLink } from "@/lib/profile/links";

export type AcademyView = {
  name: string;
  logoUrl: string | null;
  tagline: string | null;
  about: string | null;
  country: string | null;
  languages: string[];
  links: ProfileLink[];
  teachers: { id: string; name: string; avatarUrl: string | null; headline: string | null }[];
};

/** How an academy looks to students. Used on the student page and as the live preview while the owner edits. */
export function AcademyProfileView({ academy, teacherHref, heading: Heading = "h1" }: { academy: AcademyView; teacherHref?: (id: string) => string; heading?: "h1" | "h2" }) {
  const empty = !academy.tagline && !academy.about && !academy.country && academy.languages.length === 0 && academy.links.length === 0;
  return (
    <div className="grid gap-6">
      <Card className="gap-5 sm:flex-row sm:items-start">
        <span className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-background">
          {academy.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- the academy's own logo from our storage, any size
            <img src={academy.logoUrl} alt="" className="size-full object-contain" />
          ) : (
            <Avatar name={academy.name} className="size-full rounded-none text-3xl" />
          )}
        </span>
        <div className="grid min-w-0 flex-1 gap-3">
          <div className="grid gap-1">
            <Heading className="text-[28px] leading-tight font-extrabold break-words">{academy.name}</Heading>
            {academy.tagline && <p className="text-[16px] font-semibold text-gold-ink">{academy.tagline}</p>}
          </div>
          {(academy.country || academy.languages.length > 0) && (
            <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-muted-foreground">
              {academy.country && (
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <MapPin className="size-4 text-gold-ink" aria-hidden /> {academy.country}
                </span>
              )}
              {academy.languages.length > 0 && (
                <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-medium">Explains in</span>
                  {academy.languages.map((code) => (
                    <span key={code} className="inline-flex items-center gap-2 text-foreground">
                      <LanguageFlag code={code} className="size-5" /> {getLanguage(code)?.name ?? code}
                    </span>
                  ))}
                </span>
              )}
            </p>
          )}
          {academy.about && <p className="max-w-2xl text-[15px] leading-relaxed whitespace-pre-line text-muted-foreground">{academy.about}</p>}
          <ProfileLinks links={academy.links} />
          {empty && <p className="text-[14px] text-muted-foreground">This academy has not added details yet.</p>}
        </div>
      </Card>

      <section className="grid gap-3" aria-labelledby="academy-teachers">
        <h2 id="academy-teachers" className="text-xl font-bold">
          Teachers
        </h2>
        {academy.teachers.length === 0 ? (
          <p className="text-[15px] text-muted-foreground">No teachers to show yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {academy.teachers.map((t) => {
              const body = (
                <>
                  <Avatar name={t.name} url={t.avatarUrl} className="size-12 text-base" />
                  <span className="grid min-w-0 gap-0.5">
                    <span className="truncate font-bold">{t.name}</span>
                    {t.headline && <span className="line-clamp-2 text-[13px] text-muted-foreground">{t.headline}</span>}
                  </span>
                </>
              );
              const href = teacherHref?.(t.id);
              return (
                <li key={t.id}>
                  {href ? (
                    <Link href={href} className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-gold-ink/60 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card p-4">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
