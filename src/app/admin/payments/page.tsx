import type { Metadata } from "next";

import { AccountForm, DeleteAccount, OrderActions, PlanForm, PlanToggle } from "@/components/admin/payments-admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { pkr, type Order, type PayAccount, type Plan, ORDER_COLUMNS } from "@/lib/pro/data";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Payments" };

const when = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });

export default async function PaymentsPage() {
  await requireUser(["academy_admin", "super_admin"]);
  const admin = createAdminClient();
  let plans: Plan[] = [];
  let accounts: PayAccount[] = [];
  let orders: Order[] = [];
  const names = new Map<string, string>();
  if (admin) {
    const [p, a, o] = await Promise.all([
      admin.from("plans").select("id, name, months, price_pkr, active, sort").order("sort"),
      admin.from("payment_accounts").select("id, label, account_title, account_number, note, active, sort").order("sort"),
      admin.from("orders").select(ORDER_COLUMNS).order("created_at", { ascending: false }).limit(100),
    ]);
    plans = (p.data ?? []) as Plan[];
    accounts = (a.data ?? []) as PayAccount[];
    orders = (o.data ?? []) as Order[];
    const ids = [...new Set(orders.map((x) => x.user_id))];
    if (ids.length) {
      const { data } = await admin.from("profiles").select("id, full_name, phone").in("id", ids);
      for (const x of (data ?? []) as { id: string; full_name: string | null; phone: string | null }[]) names.set(x.id, `${x.full_name ?? "Student"}${x.phone ? ` · ${x.phone}` : ""}`);
    }
  }
  const review = orders.filter((o) => o.status === "awaiting_review" || o.status === "pending");

  return (
    <AdminShell title="Payments" description="Set your plans and where students send money. Check each payment, then approve it to turn Pro on." back={{ href: "/admin", label: "Admin" }}>
      <Card>
        <div className="grid gap-1">
          <CardTitle>To check ({review.length})</CardTitle>
          <CardDescription>Look in your bank or wallet for the transaction ID, then approve. Pro starts right away and runs for the plan&apos;s months.</CardDescription>
        </div>
        {review.length === 0 ? (
          <p className="text-[14px] text-muted-foreground">No payments waiting.</p>
        ) : (
          <ul className="divide-y divide-border">
            {review.map((o) => (
              <li key={o.id} className="grid gap-2 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {names.get(o.user_id)} <span className="font-normal text-muted-foreground">· {o.plan_name} · {pkr(o.amount_pkr)}</span>
                  </span>
                  <Badge variant={o.status === "awaiting_review" ? "gold" : "outline"}>{o.status === "awaiting_review" ? "Student says paid" : "Not paid yet"}</Badge>
                </div>
                <p className="text-[13px] text-muted-foreground">
                  Reference {o.reference} · {when(o.created_at)} · {o.method === "card" ? "Card" : "Bank / wallet"}
                  {o.txn_id ? ` · Transaction ID: ${o.txn_id}` : ""}
                  {o.payer_note ? ` · ${o.payer_note}` : ""}
                </p>
                {o.status === "awaiting_review" && <OrderActions id={o.id} />}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="grid gap-1">
          <CardTitle>Plans</CardTitle>
          <CardDescription>Students see the active plans on the Pro page. With no plans, they only see &quot;Pro coming soon&quot;.</CardDescription>
        </div>
        <ul className="divide-y divide-border">
          {plans.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <span>
                <span className="font-semibold">{p.name}</span> <span className="text-muted-foreground">· {p.months} months · {pkr(p.price_pkr)}</span>
                {!p.active && <span className="ml-2 text-[12px] text-muted-foreground">(hidden)</span>}
              </span>
              <PlanToggle id={p.id} active={p.active} />
            </li>
          ))}
        </ul>
        <PlanForm />
      </Card>

      <Card>
        <div className="grid gap-1">
          <CardTitle>Where students send money</CardTitle>
          <CardDescription>Shown to the student after they choose &quot;Pakistani banks &amp; wallets&quot;. Add your bank account, EasyPaisa and JazzCash.</CardDescription>
        </div>
        <ul className="divide-y divide-border">
          {accounts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <span>
                <span className="font-semibold">{a.label}</span> <span className="text-muted-foreground">· {a.account_title} · {a.account_number}</span>
              </span>
              <DeleteAccount id={a.id} />
            </li>
          ))}
        </ul>
        <AccountForm />
      </Card>
    </AdminShell>
  );
}
