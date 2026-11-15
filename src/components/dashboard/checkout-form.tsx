"use client";

import { useState, useTransition } from "react";
import { CreditCard, Landmark, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { createOrder } from "@/lib/pro/actions";
import { cn } from "@/lib/utils";

type Method = "card" | "bank_wallet";

export function CheckoutForm({ planId, cardReady }: { planId: string; cardReady: boolean }) {
  const [method, setMethod] = useState<Method>("bank_wallet");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const options: { id: Method; title: string; icon: typeof CreditCard; line: string; chips: string[]; foot: string; off?: boolean }[] = [
    { id: "card", title: "Credit/Debit Card", icon: CreditCard, line: "Pay online with a credit or debit card enabled for online payments.", chips: ["Visa", "Mastercard"], foot: cardReady ? "Your bank may ask you to verify the payment before it completes." : "Card payments are being connected. Use a bank or wallet for now.", off: !cardReady },
    { id: "bank_wallet", title: "Pakistani banks & wallets", icon: Landmark, line: "Send the amount from your bank app, internet banking, ATM, EasyPaisa or JazzCash. Then tell us your transaction ID.", chips: ["Bank transfer", "EasyPaisa", "JazzCash"], foot: "Next, you get our account details and your payment reference." },
  ];

  return (
    <Card className="gap-6">
      <div className="grid gap-1">
        <CardTitle className="text-xl">Choose how to pay</CardTitle>
        <CardDescription>Select an option below. You can review the details before completing your payment.</CardDescription>
      </div>
      <div role="radiogroup" aria-label="Payment method" className="grid gap-4 md:grid-cols-2">
        {options.map((o) => {
          const on = method === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={o.off}
              onClick={() => setMethod(o.id)}
              className={cn("grid content-start gap-3 rounded-2xl border p-5 text-left transition-colors", on ? "border-gold-ink bg-gold-soft" : "border-border hover:bg-muted", o.off && "cursor-not-allowed opacity-60 hover:bg-transparent")}
            >
              <span className="flex items-center gap-3">
                <span aria-hidden className={cn("grid size-5 place-items-center rounded-full border-2", on ? "border-gold-ink" : "border-border")}>
                  {on && <span className="size-2.5 rounded-full bg-gold-ink" />}
                </span>
                <o.icon className="size-5 text-gold-ink" aria-hidden />
                <span className="font-bold">{o.title}</span>
                {o.off && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">Soon</span>}
              </span>
              <span className="text-[14px] text-muted-foreground">{o.line}</span>
              <span className="flex flex-wrap gap-1.5">
                {o.chips.map((c) => (
                  <span key={c} className="rounded-md border border-border bg-card px-2 py-0.5 text-[12px] font-medium text-muted-foreground">
                    {c}
                  </span>
                ))}
              </span>
              <span className="border-t border-border pt-3 text-[12px] text-muted-foreground">{o.foot}</span>
            </button>
          );
        })}
      </div>
      <label className="flex items-start gap-3 text-[14px]">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 size-5 accent-[var(--gold)]" />
        <span>I understand that Pro starts after my payment is confirmed.</span>
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-[14px] text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button
          type="button"
          size="lg"
          disabled={busy}
          onClick={() => {
            setError(null);
            if (!agreed) return setError("Please tick the box to continue.");
            start(async () => {
              const r = await createOrder({ planId, method, agreed });
              if (r?.error) setError(r.error);
            });
          }}
        >
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Submit order
        </Button>
      </div>
    </Card>
  );
}
