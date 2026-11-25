import Link from "next/link";
import { Building2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type WorkspaceCardData = {
  name: string;
  kind: "teacher" | "school";
  planName: string;
  priceLabel: string;
  students: number;
  maxStudents: number | null;
  teachers: number;
  maxTeachers: number | null;
  discountPercent: number;
  discountUntil: string | null;
  isOwner: boolean;
};

/**
 * Teacher page: which workspace you work in, its plan, and students against the limit.
 * One big number for students; teachers only as a quiet line for schools. `planHref` adds a "Change plan" button.
 */
export function WorkspaceCard({ data, planHref }: { data: WorkspaceCardData; planHref?: string }) {
  const { students, maxStudents: max } = data;
  const pct = max ? Math.min(100, Math.round((students / max) * 100)) : 0;
  const full = max != null && students >= max;
  const near = max != null && pct >= 80 && !full;
  const left = max != null ? max - students : null;
  return (
    <Card className="flex h-full flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
            <Building2 className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <CardTitle className="truncate">{data.name}</CardTitle>
            <p className="text-[13px] text-muted-foreground">{data.kind === "school" ? "School workspace" : "Your personal workspace"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="gold">{data.planName}</Badge>
          {data.discountPercent > 0 && <Badge variant="success">{data.discountPercent}% off{data.discountUntil ? ` until ${data.discountUntil}` : ""}</Badge>}
        </div>
      </div>

      <div className="grid gap-2.5">
        <p className="text-[13px] text-muted-foreground">Students</p>
        <p className="flex items-baseline gap-1.5">
          <span className="text-[34px] leading-none font-extrabold tabular-nums">{students}</span>
          <span className="text-[15px] text-muted-foreground">{max != null ? `of ${max}` : "no fixed limit"}</span>
        </p>
        {max != null && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Students" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(students, max)}>
            <div className={cn("h-full rounded-full", near || full ? "bg-gold" : "bg-brand-cyan")} style={{ width: `${pct}%` }} />
          </div>
        )}
        {left != null && (
          <p className={cn("text-[13px]", near || full ? "text-gold-ink" : "text-muted-foreground")}>
            {full
              ? "Limit reached. New students can't be added until the plan is upgraded. Students already in stay in."
              : near
                ? `Only ${left} ${left === 1 ? "place" : "places"} left. Time to think about upgrading.`
                : `${left} ${left === 1 ? "place" : "places"} left`}
          </p>
        )}
      </div>

      {data.kind === "school" && (
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-4 text-[14px]">
          <span className="text-muted-foreground">Teachers</span>
          <span className="font-semibold tabular-nums">{data.teachers}{data.maxTeachers != null ? ` of ${data.maxTeachers}` : ""}</span>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-[14px] text-muted-foreground">{data.priceLabel}</p>
        {planHref && data.isOwner ? (
          <Button asChild size="sm" variant="outline"><Link href={planHref}>Change plan</Link></Button>
        ) : !data.isOwner ? (
          <p className="text-[13px] text-muted-foreground">Only the workspace owner can change the plan.</p>
        ) : null}
      </div>
    </Card>
  );
}
