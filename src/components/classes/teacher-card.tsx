import Link from "next/link";
import { Star } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { skillLabel } from "@/lib/classes/constants";
import type { TeacherDetails } from "@/lib/classes/data";

/** "4.8 (23)" with a star. Only used when enough students rated. */
export function RatingBadge({ rating }: { rating: NonNullable<TeacherDetails["rating"]> }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold">
      <Star className="size-4 fill-brand-cyan text-brand-cyan" aria-hidden />
      {rating.average.toFixed(1)}
      <span className="font-normal text-muted-foreground">
        ({rating.count} rating{rating.count === 1 ? "" : "s"})
      </span>
    </span>
  );
}

/** Teacher box next to a class: photo, name, headline, short bio and a link to the full profile. */
export function TeacherCard({ teacher }: { teacher: TeacherDetails }) {
  return (
    <aside className="grid content-start justify-items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center" aria-label="Your teacher">
      <Avatar name={teacher.name} url={teacher.avatarUrl} className="size-24 text-3xl" />
      <div className="grid gap-1">
        <h2 className="text-xl font-bold">{teacher.name}</h2>
        {teacher.headline && <p className="text-[14px] font-semibold text-gold-ink">{teacher.headline}</p>}
      </div>
      {teacher.rating && <RatingBadge rating={teacher.rating} />}
      {teacher.specialties.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {teacher.specialties.map((s) => (
            <Badge key={s}>{skillLabel(s)}</Badge>
          ))}
        </div>
      )}
      {teacher.bio && <p className="line-clamp-5 text-left text-[14px] leading-relaxed text-muted-foreground">{teacher.bio}</p>}
      <Button asChild variant="outline" className="mt-1 w-full">
        <Link href={`/dashboard/teachers/${teacher.id}`}>View profile</Link>
      </Button>
    </aside>
  );
}
