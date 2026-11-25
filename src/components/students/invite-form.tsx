"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { inviteStudents, type InviteResult } from "@/lib/students/invite";

const field = "grid gap-1.5 text-[13px] font-medium text-muted-foreground";
const NONE = "none";

/**
 * Invite students by email. Used on My students (with a batch picker) and inside a batch (batch fixed).
 * Each student gets an email, becomes the teacher's student and joins the chosen batch.
 */
export function InviteStudentsForm({ batchId, batches = [] }: { batchId?: string; batches?: { id: string; name: string }[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [batch, setBatch] = useState(batches.length === 1 ? batches[0].id : NONE);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [busy, start] = useTransition();
  const id = batchId ?? (batch === NONE ? undefined : batch);
  const submit = () => {
    setResult(null);
    start(async () => {
      const r = await inviteStudents(text, id);
      setResult(r);
      if ("ok" in r && r.added > 0) { setText(""); router.refresh(); }
    });
  };
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <label className={field}>
        One student per line: name, email
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder={"Ayesha Khan, ayesha@example.com\nBilal Ahmed, bilal@example.com"} className="font-mono text-[13px]" />
      </label>
      {!batchId && batches.length > 0 && (
        <div className={field}>
          <label htmlFor="invite-batch">Add them to a batch (optional)</label>
          <Select value={batch} onValueChange={setBatch}>
            <SelectTrigger id="invite-batch" className="h-11 max-w-sm rounded-xl text-[15px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No batch yet</SelectItem>
              {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={busy || !text.trim()}>{busy ? "Sending invites…" : "Send invites"}</Button>
        <p className="text-[13px] text-muted-foreground">They get an email to set a password and join you.</p>
      </div>
      {result && ("error" in result ? <p role="alert" className="text-[13px] text-destructive">{result.error}</p> : (
        <div role="status" className="grid gap-1 text-[13px]">
          {result.added > 0 && <p className="text-success">{result.added} student{result.added === 1 ? "" : "s"} invited.</p>}
          {result.skipped.length > 0 && <ul className="grid gap-0.5 text-muted-foreground">{result.skipped.slice(0, 20).map((s) => <li key={s.line}>Line {s.line}: {s.reason}</li>)}</ul>}
        </div>
      ))}
    </form>
  );
}

/** "Invite students" button that opens the form (open from the start when the teacher has no students yet). */
export function InviteStudentsToggle({ batches, defaultOpen }: { batches: { id: string; name: string }[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="grid gap-4">
      <Button type="button" size="sm" variant="outline" className="w-fit" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? <X aria-hidden /> : <UserPlus aria-hidden />}
        {open ? "Close" : "Invite students"}
      </Button>
      {open && <InviteStudentsForm batches={batches} />}
    </div>
  );
}
