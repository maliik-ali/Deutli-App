"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cancelJoinRequest, requestToJoin } from "@/lib/directory/requests";

type Existing = { id: string; status: "new" | "payment_sent" | "assigned" | "declined"; createdAt: string } | null;

const STATUS_TEXT: Record<string, string> = {
  new: "We got your request. We will contact you by email soon, with the price and how to pay.",
  payment_sent: "We sent you a payment link. Check your email. After you pay, we add you to this teacher.",
  declined: "We could not arrange this one. You can ask another teacher.",
};

/** "Ask to join" for a student without a teacher. Deutli sends the payment link and adds them by hand. */
export function JoinRequestCard({ teacherId, firstName, academyName, existing }: { teacherId: string; firstName: string; academyName: string; existing: Existing }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
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
            const r = await requestToJoin({ teacherId, message });
            if ("error" in r) setError(r.error);
            else router.refresh();
          });
        }}
      >
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
