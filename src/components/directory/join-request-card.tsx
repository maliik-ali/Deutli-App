"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { OpenBatch } from "@/lib/directory/batches";
import { cancelJoinRequest, requestToJoin } from "@/lib/directory/requests";

type Existing = { id: string; status: "new" | "payment_sent" | "assigned" | "declined"; createdAt: string } | null;

const STATUS_TEXT: Record<string, string> = {
  new: "We got your request. We will contact you by email soon, with the price and how to pay.",
  payment_sent: "We sent you a payment link. Check your email. After you pay, we add you to this teacher.",
  declined: "We could not arrange this one. You can ask another teacher.",
};

/** "Ask to join" for a student without a teacher. Deutli sends the payment link and adds them by hand. */
export function JoinRequestCard({ teacherId, firstName, academyName, existing, batches = [] }: { teacherId: string; firstName: string; academyName: string; existing: Existing; batches?: OpenBatch[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [batchId, setBatchId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const open = existing && (existing.status === "new" || existing.status === "payment_sent");

  if (open && existing) {
    return (
      <Card className="gap-3">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Your request</CardTitle>
          <CardDescription>{STATUS_TEXT[existing.status]}</CardDescription>
        </div>
        {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
        <div>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => { if (window.confirm("Cancel your request?")) start(async () => { const r = await cancelJoinRequest(existing.id); if ("error" in r) setError(r.error); else router.refresh(); }); }}>
            Cancel request
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-4">
      <div className="grid gap-1">
        <CardTitle className="text-lg">Study with {firstName}</CardTitle>
        <CardDescription>
          {existing?.status === "declined" ? `${STATUS_TEXT.declined} You can also try again. ` : ""}
          Send a request. We contact you by email with the price and how to pay. After that you join {firstName} at {academyName} and see your batch, homework and tests here.
        </CardDescription>
      </div>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const r = await requestToJoin({ teacherId, message, batchId: batchId || undefined });
            if ("error" in r) setError(r.error);
            else router.refresh();
          });
        }}
      >
        {batches.length > 0 && (
          <div role="radiogroup" aria-label="Which batch" className="grid gap-2">
            <p className="text-[13px] font-medium text-muted-foreground">Which batch? (optional)</p>
            {batches.map((b) => {
              const full = b.seatsLeft === 0;
              const picked = batchId === b.id;
              return (
                <label key={b.id} className={cn("flex items-start gap-3 rounded-xl border p-3", picked ? "border-gold bg-gold-soft" : "border-border", full ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
                  <input type="radio" name="batch" className="peer sr-only" disabled={full} checked={picked} onChange={() => setBatchId(picked ? "" : b.id)} onClick={() => picked && setBatchId("")} />
                  <span aria-hidden className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-gold-ink peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card", picked ? "border-gold bg-gold text-white" : "border-border")}>{picked && <Check className="size-3" strokeWidth={3} />}</span>
                  <span className="grid gap-0.5 text-[14px]">
                    <span className="font-semibold">{b.name}{b.level ? ` · ${b.level}` : ""}{b.exam ? ` · ${b.exam}` : ""}</span>
                    <span className="text-muted-foreground">
                      {b.startsOn ? `Starts ${new Date(b.startsOn + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "Running now"}
                      {b.seatsLeft != null ? (full ? " · Full" : ` · ${b.seatsLeft} seat${b.seatsLeft === 1 ? "" : "s"} left`) : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
        <label className="grid gap-1.5 text-[13px] font-medium text-muted-foreground">
          A few words for {firstName} (optional)
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={300} placeholder="Which exam, which level, when you can study." />
        </label>
        {error && <p role="alert" className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive">{error}</p>}
        <div>
          <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Request to join"}</Button>
        </div>
      </form>
    </Card>
  );
}
