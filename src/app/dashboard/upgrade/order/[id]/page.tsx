import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronLeft, Clock, XCircle } from "lucide-react";

import { CopyButton } from "@/components/dashboard/copy-button";
import { ProofForm } from "@/components/dashboard/proof-form";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { getActiveAccounts, getMyOrder, pkr } from "@/lib/pro/data";

export const metadata: Metadata = { title: "Your order" };

export default async function OrderPage(props: PageProps<"/dashboard/upgrade/order/[id]">) {
  await requireUser(["student", "academy_admin", "super_admin"]);
  const { id } = await props.params;
  const order = await getMyOrder(id);
  if (!order) notFound();
  const accounts = order.method === "bank_wallet" ? await getActiveAccounts() : [];

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <Link href="/dashboard/upgrade" className="inline-flex w-fit items-center gap-1 py-2 pr-3 text-[14px] font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden /> Deutli Pro
      </Link>
      <header className="grid gap-1">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Order {order.reference}</h1>
        <p className="text-muted-foreground">
          Deutli Pro · {order.plan_name} · {pkr(order.amount_pkr)}
        </p>
      </header>

      {order.status === "paid" && (
        <Card className="border-success/50">
          <p className="flex items-center gap-2 text-lg font-bold text-success">
            <CheckCircle2 className="size-5" aria-hidden /> Payment confirmed
          </p>
          <p className="text-[15px] text-muted-foreground">Deutli Pro is active. Thank you!</p>
          <div>
            <Button asChild>
              <Link href="/dashboard/exam">Open mock exams</Link>
            </Button>
          </div>
        </Card>
      )}

      {order.status === "awaiting_review" && (
        <Card>
          <p className="flex items-center gap-2 text-lg font-bold">
            <Clock className="size-5 text-gold-ink" aria-hidden /> We are checking your payment
          </p>
          <p className="text-[15px] text-muted-foreground">Transaction ID: {order.txn_id}. This usually takes up to one working day. Pro turns on as soon as we confirm it.</p>
        </Card>
      )}

      {order.status === "rejected" && (
        <Card className="border-destructive/50">
          <p className="flex items-center gap-2 text-lg font-bold text-destructive">
            <XCircle className="size-5" aria-hidden /> We could not confirm this payment
          </p>
          {order.admin_note && <p className="text-[15px]">{order.admin_note}</p>}
          <div>
            <Button asChild variant="outline">
              <Link href="/dashboard/upgrade">Choose a plan again</Link>
            </Button>
          </div>
        </Card>
      )}

      {order.status === "cancelled" && (
        <Card>
          <p className="font-bold">This order was cancelled.</p>
        </Card>
      )}

      {order.method === "bank_wallet" && (order.status === "pending" || order.status === "awaiting_review") && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card>
            <div className="grid gap-1">
              <CardTitle>1 · Send {pkr(order.amount_pkr)}</CardTitle>
              <CardDescription>Use your bank app, internet banking, ATM, EasyPaisa or JazzCash. Write your reference in the message if you can.</CardDescription>
            </div>
            {accounts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-[14px] text-muted-foreground">Payment details are not set up yet. Please contact us and we will help you.</p>
            ) : (
              <ul className="grid gap-3">
                {accounts.map((a) => (
                  <li key={a.id} className="grid gap-1 rounded-xl border border-border p-4">
                    <span className="text-[13px] font-semibold text-gold-ink">{a.label}</span>
                    <span className="font-semibold">{a.account_title}</span>
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[17px] tracking-wide">{a.account_number}</span>
                      <CopyButton text={a.account_number} />
                    </span>
                    {a.note && <span className="text-[13px] text-muted-foreground">{a.note}</span>}
                  </li>
                ))}
              </ul>
            )}
            <p className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3 text-[14px]">
              <span>
                Your reference: <strong className="font-mono">{order.reference}</strong>
              </span>
              <CopyButton text={order.reference} />
            </p>
          </Card>
          <Card>
            <div className="grid gap-1">
              <CardTitle>2 · Tell us you paid</CardTitle>
              <CardDescription>Enter the transaction ID from your receipt or SMS.</CardDescription>
            </div>
            <ProofForm orderId={order.id} initialTxn={order.txn_id ?? ""} initialNote={order.payer_note ?? ""} sent={order.status === "awaiting_review"} />
          </Card>
        </div>
      )}

      {order.method === "card" && order.status === "pending" && (
        <Card>
          <p className="font-bold">Card payment is being connected</p>
          <p className="text-[15px] text-muted-foreground">We will let you know when you can pay by card. You can pay by bank or wallet now instead.</p>
          <div>
            <Button asChild variant="outline">
              <Link href="/dashboard/upgrade">Back to plans</Link>
            </Button>
          </div>
        </Card>
      )}
    </main>
  );
}
