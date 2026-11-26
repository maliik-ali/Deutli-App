"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateJoinRequest } from "@/lib/directory/requests";

/** Admin: move a join request along (payment link sent, assign the teacher, decline) and keep a note. */
export function RequestActions({ id, status, note, teacherName }: { id: string; status: "new" | "payment_sent" | "assigned" | "declined"; note: string | null; teacherName: string }) {
  const router = useRouter();
  const [text, setText] = useState(note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const run = (action: "payment_sent" | "assign" | "decline" | "reopen" | "note") =>
    start(async () => {
      setError(null);
      const r = await updateJoinRequest({ id, action, note: text });
      if ("error" in r) setError(r.error);
      else router.refresh();
    });
  const open = status === "new" || status === "payment_sent";
  return (
    <div className="grid gap-3">
      <label className="grid gap-1.5 text-[13px] font-medium text-muted-foreground">
        Note (only you see it)
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={500} placeholder="Payment link sent on WhatsApp, paid 30 Nov, teacher paid…" />
      </label>
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {open ? (
          <>
            {status === "new" && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => run("payment_sent")}>Payment link sent</Button>}
            <Button type="button" size="sm" disabled={busy} onClick={() => { if (window.confirm(`Payment received? This makes the student ${teacherName}'s student.`)) run("assign"); }}>Paid: assign to {teacherName.split(" ")[0]}</Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { if (window.confirm("Decline this request?")) run("decline"); }}>Decline</Button>
          </>
        ) : (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => run("reopen")}>Reopen</Button>
        )}
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => run("note")}>Save note</Button>
      </div>
    </div>
  );
}
