"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cancelOrder } from "@/lib/pro/actions";

/** Cancels an order that is still waiting for payment. Nothing was charged, so there is nothing to undo. */
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      {error && <span role="alert" className="text-[13px] text-destructive">{error}</span>}
      <Button
        size="sm"
        variant="ghost"
        className="h-11 sm:h-9"
        disabled={busy}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await cancelOrder(orderId);
            if ("error" in r) setError(r.error);
            else router.refresh();
          })
        }
      >
        {busy ? "Cancelling…" : "Cancel"}
      </Button>
    </span>
  );
}
