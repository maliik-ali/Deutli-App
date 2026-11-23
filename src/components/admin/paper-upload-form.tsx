"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";

import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPaper, createPaperUploadUrls, setPaperText } from "@/lib/papers/actions";
import { createTeacherPaper, createTeacherUploadUrls, setTeacherPaperText } from "@/lib/papers/teacher";
import { extractPageText, openPdf, pageToJpeg, renderPage, type TextItem } from "@/lib/papers/render";
import { COVER_TONES } from "@/lib/exam/catalog";
import { SECTIONS, TELC_B1_PARTS, type PaperPart } from "@/lib/papers/template";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { OptionSelect } from "@/components/ui/option-select";

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
/** Admin form. With `teacher`, the same form makes a private paper for the teacher's batches or workspace. */
export function PaperUploadForm({ teacher }: { teacher?: { batches: { id: string; name: string }[] } } = {}) {
  const [visibility, setVisibility] = useState<"batches" | "academy">("batches");
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [rights, setRights] = useState(false);
  const router = useRouter();
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [allParts, setParts] = useState<PaperPart[]>(TELC_B1_PARTS);
  // Not every paper has every section (a teacher may only have the Reading part).
  const [included, setIncluded] = useState<Set<PaperPart["section"]>>(new Set(SECTIONS.map((s) => s.id)));
  const parts = allParts.filter((p) => included.has(p.section));
  const hasQuestions = parts.some((p) => p.kind !== "write");
  const hasListening = included.has("hoeren");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function setPage(id: string, key: "fromPage" | "toPage", value: string) {
    setParts((ps) => ps.map((p) => (p.id === id ? { ...p, [key]: Number(value) || 0 } : p)));
  }

  function toggleSection(id: PaperPart["section"], on: boolean) {
    setIncluded((cur) => {
      const next = new Set(cur);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
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
    if (parts.length === 0) return setError("Switch on at least one section that this paper has.");
    for (const p of parts) {
      if (p.fromPage < 1 || p.toPage < p.fromPage || p.toPage > doc.numPages)
        return setError(`${p.title} (${SECTIONS.find((s) => s.id === p.section)?.title}): enter the PDF pages it sits on (1–${doc.numPages}).`);
    }
    const audio = f.get("audio") as File | null;
    const hasAudio = !!audio && audio.size > 0;
    if (hasListening && !hasAudio) return setError("Add the listening audio, or switch Listening off if this paper has no audio.");
    start(async () => {
      const id = crypto.randomUUID();
      const pages = [...new Set(parts.flatMap((p) => Array.from({ length: p.toPage - p.fromPage + 1 }, (_, i) => p.fromPage + i)))].sort((a, b) => a - b);
      setStatus("Preparing the upload…");
      const links = await (teacher ? createTeacherUploadUrls : createPaperUploadUrls)(id, pages, hasAudio ? audio.name : null);
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
      const res = teacher
        ? await createTeacherPaper({
            id,
            title: String(f.get("title") ?? ""),
            topics: String(f.get("topics") ?? ""),
            tone: f.get("tone"),
            visibility,
            batchIds: visibility === "batches" ? batchIds : [],
            rights,
            structure: { parts },
            audioPath: hasAudio ? (links.audio?.path ?? null) : null,
            answersText: String(f.get("answers") ?? ""),
          })
        : await createPaper({
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
      let textNote = "";
      if (!("error" in res)) {
        // Selectable text for the chosen pages (best effort: scanned PDFs have none).
        setStatus("Reading the text of the pages…");
        try {
          const text: Record<string, TextItem[]> = {};
          for (const n of pages) text[String(n)] = await extractPageText(doc, n);
          const found = Object.values(text).reduce((a, b) => a + b.length, 0);
          if (found > 0) {
            const saved = await (teacher ? setTeacherPaperText : setPaperText)(res.id, text);
            if ("error" in saved) textNote = " Students can't select words yet: " + saved.error;
          } else textNote = " This PDF has no selectable text (it may be a scan), so students can't select words on it.";
        } catch {
          textNote = " The text of the pages could not be read, so students can't select words yet.";
        }
      }
      setStatus(null);
      if ("error" in res) setError(res.error);
      else {
        setDone(`"${String(f.get("title"))}" is uploaded and saved as a draft. Click Publish in the list above so students can see it.${textNote}`);
        formEl.reset();
        setDoc(null);
        setParts(TELC_B1_PARTS);
        setIncluded(new Set(SECTIONS.map((x) => x.id)));
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
        {!teacher && (
          <div className="grid gap-2">
            <Label htmlFor="p-slug">Web address</Label>
            <Input id="p-slug" name="slug" required maxLength={40} placeholder="e.g. hamburg" />
          </div>
        )}
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="p-topics">
            Topics <span className="font-normal text-subtle-foreground">(optional)</span>
          </Label>
          <Input id="p-topics" name="topics" maxLength={300} placeholder="e.g. Computer, Weiterbildung, Anzeigen" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="p-tone">Cover colour</Label>
          <OptionSelect id="p-tone" name="tone" defaultValue="navy" options={COVER_TONES.map((t) => ({ value: t, label: t }))} />
        </div>
        {!teacher && (
          <label className="flex items-center gap-3 self-end pb-2 text-[15px] font-medium">
            <input type="checkbox" name="free" defaultChecked className="size-5 accent-[var(--gold-ink)]" /> Free for all students
          </label>
        )}
      </div>

      {teacher && (
        <section className="grid gap-4 rounded-xl border border-border bg-card p-4" aria-label="Who can open this paper">
          <div className="grid gap-2">
            <span className="text-sm font-semibold">Who can open it?</span>
            <div role="radiogroup" className="flex flex-wrap gap-2">
              {([["batches", "Selected batches"], ["academy", "My whole workspace"]] as const).map(([k, label]) => (
                <label key={k} className="relative">
                  <input type="radio" name="p-vis" className="peer sr-only" checked={visibility === k} onChange={() => setVisibility(k)} />
                  <span className="inline-flex h-11 cursor-pointer items-center rounded-full border border-input bg-card px-5 text-[14px] font-semibold peer-checked:border-gold-ink peer-checked:bg-gold-soft peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">{label}</span>
                </label>
              ))}
            </div>
          </div>
          {visibility === "batches" && (
            <ul className="grid gap-1 sm:grid-cols-2">
              {teacher.batches.length === 0 && <li className="text-[14px] text-muted-foreground">Create a batch first, or share with your whole workspace.</li>}
              {teacher.batches.map((b) => (
                <li key={b.id}>
                  <label className="relative flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-[15px] hover:bg-muted">
                    <input type="checkbox" className="peer sr-only" checked={batchIds.includes(b.id)} onChange={() => setBatchIds((p) => (p.includes(b.id) ? p.filter((x) => x !== b.id) : [...p, b.id]))} />
                    <span className="grid size-5 place-items-center rounded-md border border-input bg-card text-transparent peer-checked:border-gold-ink peer-checked:bg-gold-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"><Check className="size-3.5" aria-hidden /></span>
                    {b.name}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <label className="relative flex min-h-11 cursor-pointer items-start gap-3 text-[14px]">
            <input type="checkbox" className="peer sr-only" checked={rights} onChange={(e) => setRights(e.target.checked)} />
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border border-input bg-card text-transparent peer-checked:border-gold-ink peer-checked:bg-gold-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"><Check className="size-3.5" aria-hidden /></span>
            <span>I own this paper or have the right to use it with my students. Students can report papers that should not be here.</span>
          </label>
        </section>
      )}

      <div className="grid gap-2">
        <Label htmlFor="p-pdf">Paper PDF (telc Deutsch B1)</Label>
        <input id="p-pdf" type="file" accept="application/pdf" onChange={(e) => onPdf(e.target.files?.[0])} className={cn(FIELD, "h-11 py-2")} />
        <p className="text-sm text-muted-foreground">
          The PDF stays on your computer. Only the exam pages you choose below are uploaded, as images, so students never get the answer pages.
        </p>
      </div>

      <section className="grid gap-3" aria-label="Sections in this paper">
        <div className="grid gap-1">
          <h3 className="text-base font-bold">What does this paper have?</h3>
          <p className="text-sm text-muted-foreground">Switch off the sections you don&apos;t have. Students only see and are marked on the sections that are on.</p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {SECTIONS.map((sec) => (
            <li key={sec.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <label htmlFor={`sec-${sec.id}`} className="grid min-w-0 cursor-pointer">
                <span className="text-[15px] font-semibold">{sec.english}</span>
                <span className="text-[13px] text-muted-foreground">{sec.title}</span>
              </label>
              <Switch id={`sec-${sec.id}`} checked={included.has(sec.id)} onCheckedChange={(on) => toggleSection(sec.id, on)} />
            </li>
          ))}
        </ul>
      </section>

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
              {parts.map((p) => (
                <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_88px_88px] items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
                  <span className="min-w-0 text-[15px]">
                    <span className="font-semibold">{SECTIONS.find((s) => s.id === p.section)?.title}</span> · {p.title}
                    <span className="block truncate text-[13px] text-muted-foreground">{p.task}</span>
                  </span>
                  <Input aria-label={`${p.title} from page`} inputMode="numeric" placeholder="from" value={p.fromPage || ""} onChange={(e) => setPage(p.id, "fromPage", e.target.value)} />
                  <Input aria-label={`${p.title} to page`} inputMode="numeric" placeholder="to" value={p.toPage || ""} onChange={(e) => setPage(p.id, "toPage", e.target.value)} />
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {hasListening && (
        <div className="grid gap-2">
          <Label htmlFor="p-audio">Listening audio (MP3)</Label>
          <input id="p-audio" name="audio" type="file" accept="audio/*" className={cn(FIELD, "h-11 py-2")} />
        </div>
      )}

      {hasQuestions && (
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
        <p className="text-sm text-muted-foreground">Copy the whole page of solutions from the PDF. We pick out the numbers and answers (every question of the sections above is needed).</p>
      </div>
      )}

      <Button type="submit" disabled={pending} className="w-full sm:w-fit">
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {pending ? (status ?? "Working…") : "Upload paper"}
      </Button>
      {!pending && status && <p className="text-sm text-muted-foreground">{status}</p>}
      <p className="text-sm text-muted-foreground">The paper is saved as a draft. Publish it from the list when you are ready.</p>
    </form>
  );
}
