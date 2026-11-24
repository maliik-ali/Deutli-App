import { cn } from "@/lib/utils";

/**
 * "Students 12 of 30" with a thin bar. For students it turns purple at 80% and shows a notice (students already in are never locked).
 * `alert={false}` (teachers) keeps it calm: a full bar is normal for a solo teacher, so it only says what the plan includes.
 */
export function UsageMeter({ label, used, limit, alert = true }: { label: string; used: number; limit: number | null; alert?: boolean }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const near = alert && limit != null && pct >= 80 && used < limit;
  const full = limit != null && used >= limit;
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">
          {used}
          {limit != null ? ` of ${limit}` : " (no fixed limit)"}
        </span>
      </div>
      {limit != null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(used, limit)}>
          <div className={cn("h-full rounded-full", alert && (near || full) ? "bg-gold" : "bg-brand-cyan")} style={{ width: `${pct}%` }} />
        </div>
      )}
      {alert && full && <p className="text-[13px] text-gold-ink">Limit reached. New students can&apos;t be added until the plan is upgraded. Students already in stay in.</p>}
      {near && <p className="text-[13px] text-gold-ink">At {pct}% of the limit. Time to think about upgrading.</p>}
      {!alert && full && <p className="text-[13px] text-muted-foreground">Included in your plan. Upgrade to add more teachers.</p>}
    </div>
  );
}
