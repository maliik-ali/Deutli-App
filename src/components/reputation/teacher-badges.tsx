import { BadgeCheck, GraduationCap, MessageCircle, Trophy, type LucideIcon } from "lucide-react";

import type { Badge, BadgeId } from "@/lib/reputation/badges";
import { cn } from "@/lib/utils";

const ICONS: Record<BadgeId, LucideIcon> = { verified: BadgeCheck, top_rated: Trophy, experienced: GraduationCap, replies: MessageCircle };

/** Earned badges as small pills. The reason is in the tooltip and, with `explain`, written out below. */
export function TeacherBadges({ badges, max, explain, className }: { badges: Badge[]; max?: number; explain?: boolean; className?: string }) {
  const shown = max ? badges.slice(0, max) : badges;
  if (shown.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Badges">
      {shown.map((b) => {
        const Icon = ICONS[b.id];
        return (
          <li key={b.id} title={b.why}>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold", b.id === "verified" ? "bg-success-soft text-success" : "bg-gold-soft text-gold-ink")}>
              <Icon className="size-3.5" aria-hidden /> {b.label}
            </span>
            {explain && <span className="sr-only"> {b.why}</span>}
          </li>
        );
      })}
    </ul>
  );
}
