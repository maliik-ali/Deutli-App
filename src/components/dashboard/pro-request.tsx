"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requestPro } from "@/lib/pro/actions";

export function ProRequest({ already }: { already: boolean }) {
  const [done, setDone] = useState(already);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  if (done)
    return (
      <p className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-[15px] text-success" role="status">
        <CheckCircle2 className="size-5 shrink-0" aria-hidden /> Request received. We will contact you with the price and how to pay.
      </p>
    );
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await requestPro(note);
          if ("error" in r) setError(r.error);
          else setDone(true);
        });
      }}
    >
      <label className="grid gap-2 text-sm font-semibold">
        Anything we should know? (optional)
        <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} rows={2} placeholder="For example: my exam is in March, I prefer WhatsApp" className="w-full resize-none rounded-xl border border-input bg-background p-3 text-[15px] font-normal outline-none focus-visible:border-ring" />
      </label>
      {error && (
        <p role="alert" className="text-[14px] text-destructive">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={busy}>
          <Sparkles aria-hidden /> {busy ? "Sending…" : "I want Pro"}
        </Button>
      </div>
    </form>
  );
}
