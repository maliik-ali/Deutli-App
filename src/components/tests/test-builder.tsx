"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTest } from "@/lib/tests/actions";

type Q =
  | { key: number; kind: "mc"; prompt: string; points: string; options: string[]; correct: number }
  | { key: number; kind: "tf"; prompt: string; points: string; correct: boolean }
  | { key: number; kind: "fill"; prompt: string; points: string; accepted: string };

const field = "grid gap-1.5 text-[13px] font-medium text-muted-foreground";
const KIND_LABEL = { mc: "Multiple choice", tf: "True or false", fill: "Fill in the blank" } as const;
let next = 1;
const blank = (kind: Q["kind"]): Q => {
  const key = next++;
  return kind === "mc" ? { key, kind, prompt: "", points: "1", options: ["", "", "", ""], correct: 0 } : kind === "tf" ? { key, kind, prompt: "", points: "1", correct: true } : { key, kind, prompt: "", points: "1", accepted: "" };
};

export function TestBuilder({ batches }: { batches: { id: string; name: string }[] }) {
  const router = useRouter();
  const [head, setHead] = useState({ title: "", instructions: "", timeLimit: "", closeDate: "", closeTime: "" });
  const [picked, setPicked] = useState<string[]>([]);
  const [qs, setQs] = useState<Q[]>([blank("mc")]);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const patch = (key: number, p: Partial<Q>) => setQs((l) => l.map((q) => (q.key === key ? ({ ...q, ...p } as Q) : q)));

  function save() {
    setError(null);
    start(async () => {
      const r = await createTest({
        title: head.title,
        instructions: head.instructions,
        timeLimit: head.timeLimit.trim() ? Number(head.timeLimit) : null,
        closeDate: head.closeDate,
        closeTime: head.closeTime,
        batchIds: picked,
        questions: qs.map((q) => {
          const points = Number(q.points.replace(",", ".")) || 0;
          if (q.kind === "mc") return { kind: "mc", prompt: q.prompt, points, options: q.options, correct: q.correct };
          if (q.kind === "tf") return { kind: "tf", prompt: q.prompt, points, correct: q.correct };
          return { kind: "fill", prompt: q.prompt, points, accepted: q.accepted.split("|").map((a) => a.trim()).filter(Boolean) };
        }),
      });
      if ("error" in r) setError(r.error);
      else router.push(`/teacher/tests/${r.id}`);
    });
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 rounded-2xl border border-border bg-card p-5">
        <label className={field}>Title<Input value={head.title} onChange={(e) => setHead({ ...head, title: e.target.value })} placeholder="Chapter 4: Perfekt" maxLength={160} /></label>
        <label className={field}>Instructions (optional)<Textarea value={head.instructions} onChange={(e) => setHead({ ...head, instructions: e.target.value })} rows={3} maxLength={2000} /></label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={field}>Time limit (minutes, optional)<Input type="number" inputMode="numeric" min={1} max={240} value={head.timeLimit} onChange={(e) => setHead({ ...head, timeLimit: e.target.value })} /></label>
          <label className={field}>Open until (optional)<Input type="date" value={head.closeDate} onChange={(e) => setHead({ ...head, closeDate: e.target.value })} /></label>
          <label className={field}>Time<Input type="time" value={head.closeTime} onChange={(e) => setHead({ ...head, closeTime: e.target.value })} disabled={!head.closeDate} /></label>
        </div>
        <fieldset className="grid gap-2">
          <legend className="text-[13px] font-medium text-muted-foreground">Share with</legend>
          {batches.length === 0 && <p className="text-[14px] text-muted-foreground">Create a batch first. Tests are shared with batches.</p>}
          <ul className="grid gap-1 sm:grid-cols-2">
            {batches.map((b) => (
              <li key={b.id}>
                <label className="relative flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-[15px] hover:bg-muted">
                  <input type="checkbox" className="peer sr-only" checked={picked.includes(b.id)} onChange={() => setPicked((p) => (p.includes(b.id) ? p.filter((x) => x !== b.id) : [...p, b.id]))} />
                  <span className="grid size-5 place-items-center rounded-md border border-input bg-card text-transparent peer-checked:border-gold-ink peer-checked:bg-gold-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"><Check className="size-3.5" aria-hidden /></span>
                  {b.name}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      </div>

      <ol className="grid gap-4">
        {qs.map((q, i) => (
          <li key={q.key} className="grid gap-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-bold">Question {i + 1}</span>
              <div className="flex items-center gap-2">
                <Select value={q.kind} onValueChange={(k) => setQs((l) => l.map((x) => (x.key === q.key ? { ...blank(k as Q["kind"]), key: q.key, prompt: x.prompt, points: x.points } : x)))}>
                  <SelectTrigger aria-label="Question type" className="h-11 w-[190px] rounded-xl text-[15px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(KIND_LABEL) as Q["kind"][]).map((k) => <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="button" size="sm" variant="outline" aria-label={`Remove question ${i + 1}`} disabled={qs.length === 1} onClick={() => setQs((l) => l.filter((x) => x.key !== q.key))}><Trash2 aria-hidden /></Button>
              </div>
            </div>
            <label className={field}>{q.kind === "fill" ? "Sentence (write ___ where the answer goes)" : "Question"}<Textarea value={q.prompt} onChange={(e) => patch(q.key, { prompt: e.target.value })} rows={2} maxLength={1000} /></label>
            {q.kind === "mc" && (
              <div role="radiogroup" aria-label="Options" className="grid gap-2">
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-3">
                    <label className="relative">
                      <input type="radio" className="peer sr-only" name={`c-${q.key}`} checked={q.correct === oi} onChange={() => patch(q.key, { correct: oi })} aria-label={`Option ${oi + 1} is correct`} />
                      <span className="grid size-6 cursor-pointer place-items-center rounded-full border-2 border-input text-transparent peer-checked:border-gold-ink peer-checked:bg-gold-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"><Check className="size-3.5" aria-hidden /></span>
                    </label>
                    <Input value={o} onChange={(e) => patch(q.key, { options: q.options.map((x, xi) => (xi === oi ? e.target.value : x)) })} placeholder={`Option ${oi + 1}`} maxLength={300} aria-label={`Option ${oi + 1}`} />
                  </div>
                ))}
                <p className="text-[12px] text-muted-foreground">Tick the circle next to the correct answer.</p>
              </div>
            )}
            {q.kind === "tf" && (
              <div role="radiogroup" aria-label="Correct answer" className="flex gap-2">
                {([[true, "True"], [false, "False"]] as const).map(([val, label]) => (
                  <label key={label} className="relative">
                    <input type="radio" className="peer sr-only" name={`tf-${q.key}`} checked={q.correct === val} onChange={() => patch(q.key, { correct: val })} />
                    <span className="inline-flex h-11 cursor-pointer items-center rounded-full border border-input bg-card px-5 text-[14px] font-semibold peer-checked:border-gold-ink peer-checked:bg-gold-soft peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">{label} is correct</span>
                  </label>
                ))}
              </div>
            )}
            {q.kind === "fill" && <label className={field}>Accepted answers (separate with |)<Input value={q.accepted} onChange={(e) => patch(q.key, { accepted: e.target.value })} placeholder="ist gegangen | war gegangen" /></label>}
            <label className={`${field} max-w-[140px]`}>Points<Input inputMode="decimal" value={q.points} onChange={(e) => patch(q.key, { points: e.target.value })} /></label>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={() => setQs((l) => [...l, blank("mc")])}><Plus aria-hidden /> Add a question</Button>
        <Button type="button" onClick={save} disabled={busy || picked.length === 0}>{busy ? "Saving…" : "Save test"}</Button>
        {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
      </div>
      <p className="text-[13px] text-muted-foreground">The test is saved as a draft. Publish it on the next page when you are ready. Correct answers are kept on the server and students only see them after they hand in.</p>
    </div>
  );
}
