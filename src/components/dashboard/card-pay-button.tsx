"use client";

import { useState, useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { startCardPayment } from "@/lib/pro/actions";

export function CardPayButton({ orderId, label }: { orderId: string; label: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  return (
    <div className="grid gap-2">
      <div>
        <Button
          type="button"
          size="lg"
          disabled={busy}
          onClick={() => {
            setError(null);
            start(async () => {
              const r = await startCardPayment(orderId);
              if ("error" in r) setError(r.error);
              else window.location.assign(r.url);
            });
          }}
        >
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <CreditCard aria-hidden />} {label}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-[14px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
