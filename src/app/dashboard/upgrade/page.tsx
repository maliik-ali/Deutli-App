import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { ProRequest } from "@/components/dashboard/pro-request";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { hasPro, requireUser } from "@/lib/auth/dal";
import { getActivePlans, getMyOrders, pkr } from "@/lib/pro/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Deutli Pro" };

const FREE = ["The free Hamburg mock exam, marked on screen", "Improve Accent: listen, read, speak along", "Vocabulary with meanings in your languages", "AI estimate for your writing"];
const PRO = ["More full telc B1 mock exams", "Teacher-checked writing", "Everything in Free"];
const STATUS: Record<string, string> = { pending: "Waiting for your payment", awaiting_review: "We are checking your payment", paid: "Paid", rejected: "Not accepted", cancelled: "Cancelled" };

export default async function UpgradePage() {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const [plans, orders] = await Promise.all([getActivePlans(), getMyOrders(5)]);
  const pro = hasPro(user) && user.role === "student";
  const supabase = await createClient();
  const { data: req } = plans.length === 0 ? await supabase.from("pro_requests").select("user_id").eq("user_id", user.id).maybeSingle() : { data: null };
  const open = orders.filter((o) => o.status === "pending" || o.status === "awaiting_review");

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Deutli Pro</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">
          {pro ? `Pro is active until ${new Date(`${user.proUntil}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.` : "Unlock every mock exam and teacher-checked writing."}
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

      {plans.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((p, i) => (
            <Card key={p.id} className={i === 1 ? "border-gold-ink/60" : undefined}>
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-1">
                  <CardTitle>{p.name}</CardTitle>
                  <CardDescription>{p.months === 1 ? "1 month" : `${p.months} months`} of Pro</CardDescription>
                </div>
                {i === 1 && <Badge variant="gold">Popular</Badge>}
              </div>
              <p className="flex items-baseline gap-2">
                <span className="font-heading text-[36px] leading-none font-extrabold">{pkr(p.price_pkr)}</span>
                {p.months > 1 && <span className="text-sm text-muted-foreground">{pkr(Math.round(p.price_pkr / p.months))} / month</span>}
              </p>
              <ul className="grid gap-2">
                {PRO.map((t) => (
                  <li key={t} className="flex gap-2 text-[14px]">
                    <Check className="mt-0.5 size-4 shrink-0 text-gold-ink" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-auto" variant={i === 1 ? "default" : "outline"}>
                <Link href={`/dashboard/upgrade/checkout?plan=${p.id}`}>{pro ? "Extend with this plan" : "Choose plan"}</Link>
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <div className="grid gap-1">
              <CardTitle>Free</CardTitle>
              <CardDescription>What you have now</CardDescription>
            </div>
            <ul className="grid gap-2.5">
              {FREE.map((t) => (
                <li key={t} className="flex gap-2 text-[15px]">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="border-gold-ink/60">
            <div className="grid gap-1">
              <CardTitle>Pro</CardTitle>
              <CardDescription>Pro is opening soon. Join the waitlist.</CardDescription>
            </div>
            <ul className="grid gap-2.5">
              {PRO.map((t) => (
                <li key={t} className="flex gap-2 text-[15px]">
                  <Check className="mt-0.5 size-4 shrink-0 text-gold-ink" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <ProRequest already={!!req} />
          </Card>
        </div>
      )}
    </main>
  );
}
