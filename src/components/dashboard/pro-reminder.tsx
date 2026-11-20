import Link from "next/link";
import { Hourglass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { longDay, type ProReminder } from "@/lib/pro/reminder";

/** A calm line at the top of the dashboard when Pro is about to end (or just ended), with one button to renew. */
export function ProReminderBanner({ reminder, proUntil }: { reminder: ProReminder; proUntil: string }) {
  const ending = reminder.kind === "ending";
  const title = ending
    ? reminder.days === 0
      ? "Your Pro ends today."
      : reminder.days === 1
        ? "Your Pro ends tomorrow."
        : `Your Pro ends in ${reminder.days} days (${longDay(proUntil)}).`
    : `Your Pro ended on ${longDay(proUntil)}.`;
  const text = ending
    ? "Renew now to keep every mock exam. The new months are added after the ones you have left."
    : "Renew to open the mock exams again. Your results and progress are still here.";

  return (
    <section aria-label="Pro plan" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold-ink/50 bg-card px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink">
          <Hourglass className="size-5" aria-hidden />
        </span>
        <div className="grid gap-0.5">
          <p className="font-bold">{title}</p>
          <p className="text-[14px] text-muted-foreground">{text}</p>
        </div>
      </div>
      <Button asChild>
        <Link href="/dashboard/upgrade">Renew Pro</Link>
      </Button>
    </section>
  );
}
