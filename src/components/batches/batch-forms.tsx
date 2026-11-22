"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addStudentsToBatch, createBatch, deleteAnnouncement, makeBatchJoinCode, postAnnouncement, removeStudentFromBatch, setBatchArchived } from "@/lib/batches/actions";

type Res = { error: string } | { ok: true };
function useRun() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<Res | ({ ok: true } & Record<string, unknown>)>, then?: (r: Record<string, unknown>) => void) => {
    setError(null);
    start(async () => {
      const r = (await fn()) as Record<string, unknown>;
      if (typeof r.error === "string") setError(r.error);
      else {
        then?.(r);
        router.refresh();
      }
    });
  };
  return { error, busy, run };
}
const field = "grid gap-1.5 text-[13px] font-medium text-muted-foreground";
const Err = ({ text }: { text: string | null }) => (text ? <p role="alert" className="text-[13px] text-destructive">{text}</p> : null);

export function NewBatchForm() {
  const router = useRouter();
  const { error, busy, run } = useRun();
  const [v, setV] = useState({ name: "", level: "B1", exam: "", startsOn: "", endsOn: "" });
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); run(() => createBatch(v), (r) => router.push(`/teacher/batches/${r.id as string}`)); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>Batch name<Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="B1 Evening, January" maxLength={80} required /></label>
        <div className={field}>
          <label htmlFor="b-level">Level</label>
          <Select value={v.level} onValueChange={(level) => setV({ ...v, level })}>
            <SelectTrigger id="b-level" className="h-11 rounded-xl text-[15px]"><SelectValue /></SelectTrigger>
            <SelectContent>{["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <label className={field}>Exam (optional)<Input value={v.exam} onChange={(e) => setV({ ...v, exam: e.target.value })} placeholder="Goethe B1" maxLength={40} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className={field}>Starts<Input type="date" value={v.startsOn} onChange={(e) => setV({ ...v, startsOn: e.target.value })} /></label>
          <label className={field}>Ends<Input type="date" value={v.endsOn} onChange={(e) => setV({ ...v, endsOn: e.target.value })} /></label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create batch"}</Button>
        <Err text={error} />
      </div>
    </form>
  );
}

export function PostAnnouncementForm({ batchId }: { batchId: string }) {
  const { error, busy, run } = useRun();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); run(() => postAnnouncement({ batchId, title, body }), () => { setTitle(""); setBody(""); }); }}>
      <label className={field}>Title<Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Class moved to 7 pm tomorrow" /></label>
      <label className={field}>Message<Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} rows={4} /></label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy || !title.trim() || !body.trim()}>{busy ? "Posting…" : "Post and email students"}</Button>
        <Err text={error} />
      </div>
    </form>
  );
}

export function DeleteAnnouncement({ batchId, id }: { batchId: string; id: string }) {
  const { busy, run } = useRun();
  return (
    <Button type="button" size="sm" variant="outline" disabled={busy} aria-label="Delete this announcement" onClick={() => { if (window.confirm("Delete this announcement?")) run(() => deleteAnnouncement(batchId, id)); }}>
      <Trash2 aria-hidden />
    </Button>
  );
}

export function AddStudents({ batchId, students }: { batchId: string; students: { id: string; name: string }[] }) {
  const { error, busy, run } = useRun();
  const [picked, setPicked] = useState<string[]>([]);
  if (students.length === 0) return <p className="text-[14px] text-muted-foreground">All your students are in this batch, or you have none yet. Share your join code so students can join you.</p>;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <div className="grid gap-3">
      <ul className="grid max-h-64 gap-1 overflow-y-auto">
        {students.map((s) => (
          <li key={s.id}>
            <label className="relative flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-[15px] hover:bg-muted">
              <input type="checkbox" className="peer sr-only" checked={picked.includes(s.id)} onChange={() => toggle(s.id)} />
              <span className="grid size-5 place-items-center rounded-md border border-input bg-card text-transparent transition-colors peer-checked:border-gold-ink peer-checked:bg-gold-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"><Check className="size-3.5" aria-hidden /></span>
              {s.name}
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" disabled={busy || picked.length === 0} onClick={() => run(() => addStudentsToBatch(batchId, picked), () => setPicked([]))}>{busy ? "Adding…" : `Add ${picked.length || ""} to batch`}</Button>
        <Err text={error} />
      </div>
    </div>
  );
}

export function RemoveMember({ batchId, studentId, name }: { batchId: string; studentId: string; name: string }) {
  const { busy, run } = useRun();
  return (
    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { if (window.confirm(`Remove ${name} from this batch?`)) run(() => removeStudentFromBatch(batchId, studentId)); }}>Remove</Button>
  );
}

export function ArchiveBatch({ batchId, archived }: { batchId: string; archived: boolean }) {
  const { busy, run } = useRun();
  return <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => run(() => setBatchArchived(batchId, !archived))}>{archived ? "Bring back" : "Archive batch"}</Button>;
}

export function BatchCode({ batchId }: { batchId: string }) {
  const { error, busy, run } = useRun();
  const [code, setCode] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => run(() => makeBatchJoinCode(batchId), (r) => setCode(r.code as string))}>{code ? "New batch code" : "Make a code for this batch"}</Button>
        {code && <span className="font-mono text-xl font-extrabold tracking-[0.2em]">{code}</span>}
      </div>
      {code && <p className="text-[13px] text-muted-foreground">Students who join with this code land in this batch. Link: /signup?join={code}</p>}
      <Err text={error} />
    </div>
  );
}
