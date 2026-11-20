import type { Metadata } from "next";
import Link from "next/link";

import { PlanCompare, type PlanView } from "@/components/dashboard/plan-compare";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { hasPro, requireUser } from "@/lib/auth/dal";
import { cardReady, getActivePlans, getMyOrders, pkr } from "@/lib/pro/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Deutli Pro" };

const STATUS: Record<string, string> = { pending: "Waiting for your payment", awaiting_review: "We are checking your payment", paid: "Paid", rejected: "Not accepted", cancelled: "Cancelled" };

export default async function UpgradePage() {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const [plans, orders] = await Promise.all([getActivePlans(), getMyOrders(5)]);
  const pro = hasPro(user) && user.role === "student";
  const supabase = await createClient();
  const { data: req } = plans.length === 0 ? await supabase.from("pro_requests").select("user_id").eq("user_id", user.id).maybeSingle() : { data: null };
  // Savings are worked out against paying the 1-month plan again and again (only when there is one).
  const monthly = plans.find((p) => p.months === 1);
  const views: PlanView[] = plans.map((p) => {
    const full = monthly && p.months > 1 ? monthly.price_pkr * p.months : 0;
    const saved = full > p.price_pkr ? full - p.price_pkr : 0;
    return {
      id: p.id,
      months: p.months,
      total: p.price_pkr,
      perMonth: Math.round(p.price_pkr / p.months),
      save: saved || null,
      savePct: saved ? Math.round((saved / full) * 100) : null,
    };
  });
  const open = orders.filter((o) => o.status === "pending" || o.status === "awaiting_review");

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Deutli Pro</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">
          {pro ? `Pro is active until ${new Date(`${user.proUntil}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.` : "Everything in Free, plus every mock exam and new features the day they go live."}
        </p>
      </header>

      {open.length > 0 && (
        <Card className="border-gold-ink/60">
          <CardTitle>Your order</CardTitle>
          <ul className="grid gap-2">
            {open.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[15px]">
                  {o.plan_name} · {pkr(o.amount_pkr)} <span className="text-muted-foreground">· {STATUS[o.status]}</span>
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/upgrade/order/${o.id}`}>Open</Link>
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <PlanCompare plans={views} isPro={pro} requested={!!req} cardReady={cardReady()} />
      <p className="text-center text-[14px] text-muted-foreground">
        Questions about Pro or paying?{" "}
        <Link href="/dashboard/support?kind=payment&from=/dashboard/upgrade" className="font-semibold text-foreground underline underline-offset-4">
          Contact support
        </Link>
      </p>
    </main>
  );
}
