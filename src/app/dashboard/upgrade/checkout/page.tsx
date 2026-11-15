import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { CheckoutForm } from "@/components/dashboard/checkout-form";
import { Card, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { cardReady, getPlan, pkr } from "@/lib/pro/data";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage(props: PageProps<"/dashboard/upgrade/checkout">) {
  await requireUser(["student", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const plan = typeof sp.plan === "string" ? await getPlan(sp.plan) : null;
  if (!plan) redirect("/dashboard/upgrade");

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <Link href="/dashboard/upgrade" className="inline-flex w-fit items-center gap-1 py-2 pr-3 text-[14px] font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden /> Plans
      </Link>
      <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Checkout</h1>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <CheckoutForm planId={plan.id} cardReady={cardReady()} />
        <Card>
          <CardTitle>Your order</CardTitle>
          <div className="flex items-start justify-between gap-3 text-[15px]">
            <span>
              Deutli Pro · {plan.name}
              <span className="block text-[13px] text-muted-foreground">{plan.months === 1 ? "1 month" : `${plan.months} months`}</span>
            </span>
            <span className="font-semibold">{pkr(plan.price_pkr)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-4">
            <span className="font-semibold">Total</span>
            <span className="font-heading text-2xl font-extrabold">{pkr(plan.price_pkr)}</span>
          </div>
          <p className="text-[12px] text-muted-foreground">Prices in PKR. You are not charged until you pay in the next step.</p>
        </Card>
      </div>
    </main>
  );
}
