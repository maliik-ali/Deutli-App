import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { CheckoutForm } from "@/components/dashboard/checkout-form";
import { Card, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { cardReady, getFxRates, getPlan } from "@/lib/pro/data";
import { convertEur, formatMinor } from "@/lib/pro/money";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage(props: PageProps<"/dashboard/upgrade/checkout">) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const plan = typeof sp.plan === "string" ? await getPlan(sp.plan) : null;
  if (!plan) redirect("/dashboard/upgrade");
  const rates = await getFxRates();
  // EUR plan: the total is in EUR (card). Bank/wallet shows the PKR amount that will be locked on the order.
  const eur = plan.price_eur_cents;
  const total = eur != null ? formatMinor(eur, "EUR") : formatMinor(plan.price_pkr * 100, "PKR");
  const bankNote = eur != null && rates.PKR ? `Paying by bank or wallet: you send ${formatMinor(convertEur(eur, rates.PKR), "PKR")} (1 EUR = ${rates.PKR} PKR). The amount is fixed when you place the order.` : null;

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
            <span className="font-semibold">{total}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-4">
            <span className="font-semibold">Total</span>
            <span className="font-heading text-2xl font-extrabold">{total}</span>
          </div>
          <p className="text-[12px] text-muted-foreground">{eur != null ? "Prices in EUR." : "Prices in PKR."} You are not charged until you pay in the next step.</p>
          {bankNote && <p className="text-[12px] text-muted-foreground">{bankNote}</p>}
        </Card>
      </div>
    </main>
  );
}
