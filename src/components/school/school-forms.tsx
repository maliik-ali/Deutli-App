"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addTeacherByEmail, bulkAddStudents, removeTeacher, type BulkResult } from "@/lib/school/actions";

const field = "grid gap-1.5 text-[13px] font-medium text-muted-foreground";

export function AddTeacherForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setMsg(null); start(async () => { const r = await addTeacherByEmail(email); if ("error" in r) setMsg({ ok: false, text: r.error }); else { setEmail(""); setMsg({ ok: true, text: "Teacher added." }); router.refresh(); } }); }}>
      <label className={`${field} min-w-[240px] flex-1`}>Teacher&apos;s email (they need a Deutli account)<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@example.com" required /></label>
      <Button type="submit" disabled={busy}>{busy ? "Adding…" : "Add teacher"}</Button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`basis-full text-[13px] ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>}
    </form>
  );
}

export function RemoveTeacher({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  return <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { if (window.confirm(`Remove ${name} from your school? Their students stay with the school.`)) start(async () => { await removeTeacher(id); router.refresh(); }); }}>Remove</Button>;
}

export function BulkStudentsForm({ teachers }: { teachers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [teacher, setTeacher] = useState(teachers[0]?.id ?? "");
  const [result, setResult] = useState<BulkResult | null>(null);
  const [busy, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); setResult(null); start(async () => { const r = await bulkAddStudents(csv, teacher); setResult(r); if ("ok" in r) { setCsv(""); router.refresh(); } }); }}>
      <div className={field}>
        <label htmlFor="bulk-teacher">Their teacher</label>
        <Select value={teacher} onValueChange={setTeacher}>
          <SelectTrigger id="bulk-teacher" className="h-11 max-w-sm rounded-xl text-[15px]"><SelectValue placeholder="Choose a teacher" /></SelectTrigger>
          <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <label className={field}>
        Students: one per line, “name, email” (up to 200)
        <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} placeholder={"Ayesha Khan, ayesha@example.com\nBilal Ahmed, bilal@example.com"} className="font-mono text-[13px]" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="sr-only" id="bulk-file" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); e.target.value = ""; }} />
        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>Choose a CSV file</Button>
        <Button type="submit" disabled={busy || !csv.trim() || !teacher}>{busy ? "Sending invites…" : "Add students and send invites"}</Button>
      </div>
      {result && ("error" in result ? <p role="alert" className="text-[13px] text-destructive">{result.error}</p> : (
        <div role="status" className="grid gap-1 text-[13px]">
          <p className="text-success">{result.added} student{result.added === 1 ? "" : "s"} invited.</p>
          {result.skipped.length > 0 && <ul className="grid gap-0.5 text-muted-foreground">{result.skipped.slice(0, 20).map((s) => <li key={s.line}>Line {s.line}: {s.reason}</li>)}</ul>}
        </div>
      ))}
    </form>
  );
}
