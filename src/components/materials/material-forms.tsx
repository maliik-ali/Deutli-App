"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, ExternalLink, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createMaterial, createMaterialUploadUrl, deleteMaterial, getMaterialLink, setHomeworkDone, setMaterialBatch } from "@/lib/materials/actions";

const field = "grid gap-1.5 text-[13px] font-medium text-muted-foreground";
const KINDS = [
  { id: "homework", label: "Homework" },
  { id: "notes", label: "Notes" },
  { id: "file", label: "File" },
  { id: "link", label: "Link" },
] as const;
type Kind = (typeof KINDS)[number]["id"];

export function NewMaterialForm({ batches, defaultBatch }: { batches: { id: string; name: string }[]; defaultBatch?: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("homework");
  const [v, setV] = useState({ title: "", body: "", url: "", dueOn: "" });
  const [picked, setPicked] = useState<string[]>(defaultBatch ? [defaultBatch] : []);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, start] = useTransition();

  if (batches.length === 0) return <p className="text-[14px] text-muted-foreground">Create a batch first. Material is shared with batches.</p>;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      let filePath: string | undefined;
      let fileName: string | undefined;
      if (kind === "file" || file) {
        if (!file) return setError("Choose a file.");
        if (file.size > 25 * 1024 * 1024) return setError("The file is over 25 MB. Use a smaller file.");
        setStatus("Uploading…");
        const link = await createMaterialUploadUrl(file.name);
        if ("error" in link) {
          setStatus(null);
          return setError(link.error);
        }
        const body = new FormData();
        body.append("cacheControl", "3600");
        body.append("", file);
        const res = await fetch(link.signedUrl, { method: "PUT", body, headers: { "x-upsert": "false" } }).catch(() => null);
        if (!res?.ok) {
          setStatus(null);
          return setError("The upload didn't finish. Check your internet and try again.");
        }
        filePath = link.path;
        fileName = file.name;
      }
      setStatus("Saving…");
      const r = await createMaterial({ kind, ...v, filePath, fileName, batchIds: picked });
      setStatus(null);
      if ("error" in r) return setError(r.error);
      setV({ title: "", body: "", url: "", dueOn: "" });
      setFile(null);
      router.refresh();
    });
  }
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className={field}>
        <span id="m-kind">What is it?</span>
        <div role="radiogroup" aria-labelledby="m-kind" className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <label key={k.id} className="relative">
              <input type="radio" name="m-kind" className="peer sr-only" checked={kind === k.id} onChange={() => setKind(k.id)} />
              <span className="inline-flex h-11 cursor-pointer items-center rounded-full border border-input bg-card px-5 text-[14px] font-semibold text-foreground peer-checked:border-gold-ink peer-checked:bg-gold-soft peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">{k.label}</span>
            </label>
          ))}
        </div>
      </div>
      <label className={field}>Title<Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={160} placeholder="Chapter 3 exercises" required /></label>
      <label className={field}>{kind === "homework" ? "Task" : "Text"} (optional)<Textarea value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} rows={4} maxLength={8000} /></label>
      {kind === "homework" && (
        <div className={`${field} max-w-[260px]`}>
          <label htmlFor="due-date">Due date</label>
          <DatePicker id="due-date" value={v.dueOn} onChange={(dueOn) => setV({ ...v, dueOn })} clearable />
        </div>
      )}
      {kind === "link" && <label className={field}>Link<Input value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} placeholder="https://" inputMode="url" /></label>}
      {(kind === "file" || kind === "homework" || kind === "notes") && (
        <div className={field}>
          <span>{kind === "file" ? "File" : "File (optional)"} · PDF, image, audio, Word, PowerPoint up to 25 MB</span>
          <input type="file" id="m-file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" variant="outline" onClick={() => document.getElementById("m-file")?.click()}>{file ? "Change file" : "Choose file"}</Button>
            {file && <span className="text-[14px] text-foreground">{file.name}</span>}
          </div>
        </div>
      )}
      <fieldset className="grid gap-2">
        <legend className="text-[13px] font-medium text-muted-foreground">Share with</legend>
        <ul className="grid gap-1 sm:grid-cols-2">
          {batches.map((b) => (
            <li key={b.id}>
              <label className="relative flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-[15px] hover:bg-muted">
                <input type="checkbox" className="peer sr-only" checked={picked.includes(b.id)} onChange={() => toggle(b.id)} />
                <span className="grid size-5 place-items-center rounded-md border border-input bg-card text-transparent peer-checked:border-gold-ink peer-checked:bg-gold-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"><Check className="size-3.5" aria-hidden /></span>
                {b.name}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy || picked.length === 0}>{status ?? "Share with students"}</Button>
        {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
      </div>
    </form>
  );
}

export function MaterialAdminRow({ id, batches, shared }: { id: string; batches: { id: string; name: string }[]; shared: string[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {batches.map((b) => {
        const on = shared.includes(b.id);
        return (
          <button
            key={b.id}
            type="button"
            disabled={busy}
            aria-pressed={on}
            onClick={() => start(async () => { const r = await setMaterialBatch(id, b.id, !on); if ("error" in r) setError(r.error); else router.refresh(); })}
            className={`inline-flex h-9 items-center rounded-full border px-3 text-[13px] font-semibold transition-colors ${on ? "border-gold-ink bg-gold-soft text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {b.name}
          </button>
        );
      })}
      <Button type="button" size="sm" variant="outline" disabled={busy} aria-label="Delete this item" onClick={() => { if (window.confirm("Delete this item for every batch?")) start(async () => { await deleteMaterial(id); router.refresh(); }); }}><Trash2 aria-hidden /></Button>
      {error && <span role="alert" className="text-[13px] text-destructive">{error}</span>}
    </div>
  );
}

export function OpenMaterial({ id, kind, url }: { id: string; kind: "file" | "link" | "homework" | "notes"; url: string | null }) {
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (kind === "link" && url) {
    return <Button asChild size="sm" variant="outline"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden /> Open link</a></Button>;
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => start(async () => { const r = await getMaterialLink(id); if ("error" in r) setError("We couldn't open the file."); else window.open(r.url, "_blank", "noopener"); })}><Download aria-hidden /> Open file</Button>
      {error && <span role="alert" className="text-[13px] text-destructive">{error}</span>}
    </span>
  );
}

export function DoneToggle({ id, done }: { id: string; done: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  return (
    <Button type="button" size="sm" variant={done ? "outline" : "default"} disabled={busy} onClick={() => start(async () => { await setHomeworkDone(id, !done); router.refresh(); })}>
      {done ? <><Check aria-hidden /> Done · undo</> : "Mark as done"}
    </Button>
  );
}
