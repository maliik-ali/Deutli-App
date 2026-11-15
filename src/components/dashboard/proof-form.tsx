"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitPaymentProof } from "@/lib/pro/actions";

export function ProofForm({ orderId, initialTxn, initialNote, sent }: { orderId: string; initialTxn: string; initialNote: string; sent: boolean }) {
  const router = useRouter();
  const [txn, setTxn] = useState(initialTxn);
  const [note, setNote] = useState(initialNote);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await submitPaymentProof(orderId, txn, note);
          if ("error" in r) setError(r.error);
          else router.refresh();
        });
      }}
    >
      <label className="grid gap-2 text-sm font-semibold">
        Transaction ID
        <Input value={txn} onChange={(e) => setTxn(e.target.value.slice(0, 80))} placeholder="From your receipt or SMS" autoComplete="off" />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Note (optional)
        <Input value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} placeholder="Sender name or number, if different from yours" />
      </label>
      {error && (
        <p role="alert" className="text-[14px] text-destructive">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? "Sending…" : sent ? "Update details" : "I have paid"}
        </Button>
      </div>
    </form>
  );
}
