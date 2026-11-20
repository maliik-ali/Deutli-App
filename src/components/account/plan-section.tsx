import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AccountInfo } from "./account-types";
import { Section, SettingRow } from "./account-ui";

/** Which plan the student has, and the way to change it (the plans page has the choice and the payment). */
export function PlanSection({ info }: { info: AccountInfo }) {
  const { kind, until, daysLeft, reminder, openOrder } = info.plan;
  const renew = reminder != null;
  const left =
    daysLeft == null ? "" : daysLeft === 0 ? " (ends today)" : daysLeft === 1 ? " (1 day left)" : ` (${daysLeft} days left)`;

  return (
    <Section title="Plan" description="What you have today, and how to change it.">
      <SettingRow
        label="Your plan"
        value={
          kind === "pro" ? (
            <span className="grid gap-1">
              <span className="flex items-center gap-2">
                <Badge variant="gold">Pro</Badge>
                <span className="text-foreground">Active until {until}{left}</span>
              </span>
              <span className={renew ? "text-[13px] font-medium text-gold-ink" : "text-[13px]"}>
                {renew ? "Pro ends soon. Renew to keep every mock exam." : "Every mock exam, and new features the day they go live."}
              </span>
            </span>
          ) : kind === "staff" ? (
            <span className="grid gap-1">
              <span className="text-foreground">Full access</span>
              <span className="text-[13px]">Staff accounts can open everything, so there is nothing to buy.</span>
            </span>
          ) : (
            <span className="grid gap-1">
              <span className="flex items-center gap-2">
                <Badge variant="outline">Free</Badge>
                <span className="text-foreground">Free plan</span>
              </span>
              <span className={reminder ? "text-[13px] font-medium text-gold-ink" : "text-[13px]"}>
                {reminder ? `Your Pro ended on ${reminder.until}. Renew to open the mock exams again.` : "1 free mock exam, the A1 word list and AI writing checks."}
              </span>
            </span>
          )
        }
        action={
          kind === "staff" ? undefined : (
            <Button asChild variant={kind === "free" || renew ? "default" : "outline"} size="sm" className="h-11 sm:h-9">
              <Link href="/dashboard/upgrade">
                {kind === "free" ? <Sparkles aria-hidden /> : null}
                {kind === "free" ? (reminder ? "Renew Pro" : "Upgrade to Pro") : renew ? "Renew Pro" : "Extend Pro"}
              </Link>
            </Button>
          )
        }
      />
      {openOrder && (
        <SettingRow
          label="Payment"
          value={
            <span className="grid gap-0.5">
              <span className="text-foreground">{openOrder.status === "awaiting_review" ? "We are checking your payment" : "Waiting for your payment"}</span>
              <span className="text-[13px]">Order {openOrder.reference}</span>
            </span>
          }
          action={
            <Button asChild variant="outline" size="sm" className="h-11 sm:h-9">
              <Link href={`/dashboard/upgrade/order/${openOrder.id}`}>Open</Link>
            </Button>
          }
        />
      )}
    </Section>
  );
}
