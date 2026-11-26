"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_REASONS } from "@/lib/reviews/constants";
import { reportReview } from "@/lib/reviews/actions";
import { cn } from "@/lib/utils";

/** "Report" under a review: pick a reason, add an optional note. Only puts the review in Deutli's queue. */
export function ReportButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, start] = useTransition();

  if (sent) return <p role="status" className="text-[13px] text-muted-foreground">Thanks. We will take a look.</p>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground sm:min-h-9">
        <Flag className="size-3.5" aria-hidden /> Report
      </button>
    );
  }
  return (
    <form
      className="grid gap-3 rounded-xl bg-muted/50 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!reason) return setError("Choose a reason.");
        start(async () => {
          const r = await reportReview({ reviewId, reason, note });
          if ("error" in r) setError(r.error);
          else setSent(true);
        });
      }}
    >
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-[13px] font-semibold">What is wrong with this review?</legend>
        <div className="flex flex-wrap gap-1.5">
          {REPORT_REASONS.map((r) => (
            <button key={r.id} type="button" aria-pressed={reason === r.id} onClick={() => setReason(r.id)} className={cn("inline-flex h-11 items-center rounded-full border px-4 text-[13px] font-medium sm:h-9", reason === r.id ? "border-gold-ink bg-gold/30" : "border-border text-muted-foreground hover:text-foreground")}>
              {r.label}
            </button>
          ))}
        </div>
      </fieldset>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} placeholder="Anything we should know? (optional)" aria-label="Note" />
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Sending…" : "Send report"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
