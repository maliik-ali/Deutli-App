import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { LanguageFlag } from "@/components/language-flag";
import { TeacherBadges } from "@/components/reputation/teacher-badges";
import { Stars } from "@/components/reviews/stars";
import { Badge } from "@/components/ui/badge";
import { skillLabel } from "@/lib/classes/constants";
import type { DirectoryTeacher } from "@/lib/directory/data";
import { getLanguage } from "@/lib/languages";

/** One teacher in "Find a teacher": who they are, how others rate them, and what they offer right now. */
export function DirectoryCard({ t }: { t: DirectoryTeacher }) {
  const offers = [t.trialAvailable ? "Trial lesson available" : null, t.openSlots > 0 ? `${t.openSlots} free 1:1 slot${t.openSlots === 1 ? "" : "s"}` : null, t.upcomingClasses > 0 ? `${t.upcomingClasses} upcoming class${t.upcomingClasses === 1 ? "" : "es"}` : null].filter(Boolean);
  return (
    <li>
      <Link
        href={`/dashboard/teachers/${t.id}`}
        className="grid h-full content-start gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-gold-ink/60 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="flex items-start gap-3">
          <Avatar name={t.name} url={t.avatarUrl} className="size-14 text-lg" />
          <span className="grid min-w-0 gap-0.5">
            <span className="truncate text-[17px] font-bold">{t.name}</span>
            <span className="truncate text-[13px] text-muted-foreground">{t.academy.name}</span>
          </span>
        </span>
        {t.headline && <span className="line-clamp-2 text-[14px] font-medium text-gold-ink">{t.headline}</span>}
        <TeacherBadges badges={t.badges} max={2} />
        {t.rating ? (
          <span className="flex items-center gap-2 text-[14px]">
            <Stars value={t.rating.average} /> <span className="font-semibold tabular-nums">{t.rating.average.toFixed(1)}</span>
            <span className="text-muted-foreground">({t.rating.count})</span>
          </span>
        ) : (
          <span className="text-[13px] text-muted-foreground">{t.reviewCount > 0 ? `${t.reviewCount} review${t.reviewCount === 1 ? "" : "s"}` : "No reviews yet"}</span>
        )}
        {t.specialties.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {t.specialties.slice(0, 3).map((s) => (
              <Badge key={s}>{skillLabel(s)}</Badge>
            ))}
          </span>
        )}
        {t.languages.length > 0 && (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
            Explains in
            {t.languages.slice(0, 3).map((code) => (
              <span key={code} className="inline-flex items-center gap-1.5 text-foreground">
                <LanguageFlag code={code} className="size-4" /> {getLanguage(code)?.name ?? code}
              </span>
            ))}
          </span>
        )}
        {t.qualification && <span className="text-[13px] text-muted-foreground">{t.qualification}</span>}
        {offers.length > 0 && <span className="text-[13px] font-medium">{offers.join(" · ")}</span>}
      </Link>
    </li>
  );
}
