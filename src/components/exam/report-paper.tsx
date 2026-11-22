"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reportPaper } from "@/lib/papers/teacher";

/** "Report this paper": for papers uploaded by a teacher. Admins read the reports. */
export function ReportPaper({ paperId }: { paperId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  if (msg?.ok) return <p role="status" className="text-[13px] text-success">{msg.text}</p>;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground">Report this paper</button>;
  return (
    <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await reportPaper(paperId, reason); setMsg("error" in r ? { ok: false, text: r.error } : { ok: true, text: "Thank you. We will look at it." }); }); }}>
      <label className="grid gap-1.5 text-[13px] font-medium text-muted-foreground">What is wrong with this paper?<Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} /></label>
      <div className="flex flex-wrap items-center gap-2"><Button type="submit" size="sm" disabled={busy || reason.trim().length < 3}>{busy ? "Sending…" : "Send report"}</Button><Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>{msg && <span role="alert" className="text-[13px] text-destructive">{msg.text}</span>}</div>
    </form>
  );
}
