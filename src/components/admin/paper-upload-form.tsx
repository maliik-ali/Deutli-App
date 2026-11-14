"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";

import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPaper, createPaperUploadUrls } from "@/lib/papers/actions";
import { openPdf, pageToJpeg, renderPage } from "@/lib/papers/render";
import { COVER_TONES } from "@/lib/exam/catalog";
import { SECTIONS, TELC_B1_PARTS, type PaperPart } from "@/lib/papers/template";
import { cn } from "@/lib/utils";

const FIELD =
  "w-full rounded-xl border border-input bg-card px-3.5 text-[15px] text-foreground outline-none transition-colors placeholder:text-subtle-foreground/80 focus-visible:border-ink focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-0 focus-visible:outline-ink/20";

async function put(url: string, blob: Blob) {
  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", blob);
  const res = await fetch(url, { method: "PUT", body, headers: { "x-upsert": "true" } }).catch(() => null);
  return !!res?.ok;
}

function Thumb({ doc, n }: { doc: PDFDocumentProxy; n: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) renderPage(doc, n, 120, ref.current).catch(() => {});
  }, [doc, n]);
  return (
    <figure className="grid gap-1 text-center">
      <canvas ref={ref} className="w-full rounded border border-border bg-white" />
      <figcaption className="text-[12px] font-semibold text-muted-foreground">{n}</figcaption>
    </figure>
  );
}

/** Upload a telc B1 paper: PDF pages become images, the audio is stored, the answer key is pasted. */
export function PaperUploadForm() {
  const router = useRouter();
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [parts, setParts] = useState<PaperPart[]>(TELC_B1_PARTS);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function setPage(i: number, key: "fromPage" | "toPage", value: string) {
    setParts((ps) => ps.map((p, j) => (j === i ? { ...p, [key]: Number(value) || 0 } : p)));
  }

  async function onPdf(file: File | undefined) {
    setDoc(null);
    if (!file) return;
    setStatus("Opening the PDF…");
    try {
      setDoc(await openPdf(file));
      setStatus(null);
    } catch {
      setStatus(null);
      setError("We couldn't open this PDF.");
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const f = new FormData(formEl);
    setError(null);
    setDone(null);
    if (!doc) return setError("Choose the paper PDF first.");
    for (const p of parts) {
      if (p.fromPage < 1 || p.toPage < p.fromPage || p.toPage > doc.numPages)
        return setError(`${p.title} (${SECTIONS.find((s) => s.id === p.section)?.title}): enter the PDF pages it sits on (1–${doc.numPages}).`);
    }
    const audio = f.get("audio") as File | null;
    const hasAudio = !!audio && audio.size > 0;
    start(async () => {
      const id = crypto.randomUUID();
      const pages = [...new Set(parts.flatMap((p) => Array.from({ length: p.toPage - p.fromPage + 1 }, (_, i) => p.fromPage + i)))].sort((a, b) => a - b);
      setStatus("Preparing the upload…");
      const links = await createPaperUploadUrls(id, pages, hasAudio ? audio.name : null);
      if ("error" in links) {
        setStatus(null);
        return setError(links.error);
      }
      for (let i = 0; i < pages.length; i++) {
        setStatus(`Uploading page ${i + 1} of ${pages.length}…`);
        const ok = await put(links.pages[pages[i]], await pageToJpeg(doc, pages[i]));
        if (!ok) {
          setStatus(null);
          return setError("A page upload failed. Check your internet connection and try again.");
        }
      }
      if (hasAudio && links.audio) {
        setStatus("Uploading the audio…");
        if (!(await put(links.audio.url, audio))) {
          setStatus(null);
          return setError("The audio upload failed. Check your internet connection and try again.");
        }
      }
      setStatus("Saving…");
      const res = await createPaper({
        id,
        slug: String(f.get("slug") ?? ""),
        title: String(f.get("title") ?? ""),
        topics: String(f.get("topics") ?? ""),
        tone: f.get("tone"),
        isFree: f.get("free") === "on",
        structure: { parts },
        audioPath: hasAudio ? (links.audio?.path ?? null) : null,
        answersText: String(f.get("answers") ?? ""),
      });
      setStatus(null);
      if ("error" in res) setError(res.error);
      else {
        setDone(`"${String(f.get("title"))}" is uploaded and saved as a draft. Click Publish in the list above so students can see it.`);
        formEl.reset();
        setDoc(null);
        setParts(TELC_B1_PARTS);
        router.refresh();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6" noValidate>
      <FormError message={error} />
      {done && (
        <p role="status" className="rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-[15px] font-medium">
          {done}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="p-title">Name (shown on the book cover)</Label>
          <Input id="p-title" name="title" required maxLength={120} placeholder="e.g. Hamburg" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="p-slug">Web address</Label>
          <Input id="p-slug" name="slug" required maxLength={40} placeholder="e.g. hamburg" />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="p-topics">
            Topics <span className="font-normal text-subtle-foreground">(optional)</span>
          </Label>
          <Input id="p-topics" name="topics" maxLength={300} placeholder="e.g. Computer, Weiterbildung, Anzeigen" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="p-tone">Cover colour</Label>
          <select id="p-tone" name="tone" defaultValue="navy" className={cn(FIELD, "h-11")}>
            {COVER_TONES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-3 self-end pb-2 text-[15px] font-medium">
          <input type="checkbox" name="free" defaultChecked className="size-5 accent-[var(--gold-ink)]" /> Free for all students
        </label>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="p-pdf">Paper PDF (telc Deutsch B1)</Label>
        <input id="p-pdf" type="file" accept="application/pdf" onChange={(e) => onPdf(e.target.files?.[0])} className={cn(FIELD, "h-11 py-2")} />
        <p className="text-sm text-muted-foreground">
          The PDF stays on your computer. Only the exam pages you choose below are uploaded, as images, so students never get the answer pages.
        </p>
      </div>

      {doc && (
        <>
          <section className="grid gap-3" aria-label="PDF pages">
            <h3 className="text-base font-bold">Pages of this PDF ({doc.numPages})</h3>
            <div className="grid max-h-72 grid-cols-6 gap-3 overflow-y-auto rounded-xl border border-border bg-card p-3 sm:grid-cols-8 md:grid-cols-10">
              {Array.from({ length: doc.numPages }, (_, i) => (
                <Thumb key={i} doc={doc} n={i + 1} />
              ))}
            </div>
          </section>

          <section className="grid gap-3" aria-label="Where each part sits">
            <h3 className="text-base font-bold">On which PDF pages does each part sit?</h3>
            <p className="text-sm text-muted-foreground">Use the page numbers shown above. A part on one page: from and to are the same.</p>
            <div className="grid gap-2">
              {parts.map((p, i) => (
                <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_88px_88px] items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
                  <span className="min-w-0 text-[15px]">
                    <span className="font-semibold">{SECTIONS.find((s) => s.id === p.section)?.title}</span> · {p.title}
                    <span className="block truncate text-[13px] text-muted-foreground">{p.task}</span>
                  </span>
                  <Input aria-label={`${p.title} from page`} inputMode="numeric" placeholder="from" value={p.fromPage || ""} onChange={(e) => setPage(i, "fromPage", e.target.value)} />
                  <Input aria-label={`${p.title} to page`} inputMode="numeric" placeholder="to" value={p.toPage || ""} onChange={(e) => setPage(i, "toPage", e.target.value)} />
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="grid gap-2">
        <Label htmlFor="p-audio">
          Listening audio <span className="font-normal text-subtle-foreground">(MP3, optional)</span>
        </Label>
        <input id="p-audio" name="audio" type="file" accept="audio/*" className={cn(FIELD, "h-11 py-2")} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="p-answers">Answer key</Label>
        <textarea
          id="p-answers"
          name="answers"
          required
          rows={6}
          placeholder="Paste the Lösungsschlüssel from the PDF, e.g. 1 i 2 d 3 b … 41 + 42 – 43 –"
          className={cn(FIELD, "py-3")}
        />
        <p className="text-sm text-muted-foreground">Copy the whole page of solutions from the PDF. We pick out the numbers and answers (all 60 are needed).</p>
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-fit">
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {pending ? (status ?? "Working…") : "Upload paper"}
      </Button>
      {!pending && status && <p className="text-sm text-muted-foreground">{status}</p>}
      <p className="text-sm text-muted-foreground">The paper is saved as a draft. Publish it from the list when you are ready.</p>
    </form>
  );
}
