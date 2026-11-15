"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ExamCover } from "@/components/exam/exam-cover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COVER_TONES, type CoverTone } from "@/lib/exam/catalog";
import { createCoverUploadUrl, deletePaper, setPaperCover, setPaperPublished, setPaperText, setPaperTone } from "@/lib/papers/actions";
import { extractPageText, imageToJpeg, openPdf, type TextItem } from "@/lib/papers/render";

type Props = { id: string; title: string; slug: string; published: boolean; hasAudio: boolean; tone: CoverTone; free: boolean; coverUrl: string | null; pages: number[] };

export function PaperRow({ id, title, slug, published, hasAudio, tone, free, coverUrl, pages }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string | null>(null);

  function run(fn: () => Promise<{ error: string } | { ok: true }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if ("error" in r) setError(r.error);
      else router.refresh();
    });
  }

  function uploadCover(file: File | undefined) {
    if (!file) return;
    run(async () => {
      let blob: Blob;
      try {
        blob = await imageToJpeg(file);
      } catch {
        return { error: "We couldn't read this picture. Choose a JPG, PNG or WebP image." };
      }
      const link = await createCoverUploadUrl(id);
      if ("error" in link) return link;
      const body = new FormData();
      body.append("cacheControl", "3600");
      body.append("", blob);
      const res = await fetch(link.url, { method: "PUT", body, headers: { "x-upsert": "true" } }).catch(() => null);
      if (!res?.ok) return { error: "The upload failed. Check your internet connection and try again." };
      return setPaperCover(id, link.path);
    });
  }

  /** Reads the text of the exam pages from the PDF (it stays on this computer) so students can select words. */
  function addText(file: File | undefined) {
    if (!file) return;
    setNote(null);
    run(async () => {
      try {
        const doc = await openPdf(file);
        if (pages.some((n) => n > doc.numPages)) return { error: "This PDF has fewer pages than the paper uses. Choose the same PDF you uploaded." };
        const text: Record<string, TextItem[]> = {};
        for (const n of pages) text[String(n)] = await extractPageText(doc, n);
        const found = Object.values(text).reduce((a, b) => a + b.length, 0);
        if (found === 0) return { error: "This PDF has no selectable text (it may be a scan)." };
        const r = await setPaperText(id, text);
        if (!("error" in r)) setNote(`Done: ${found} pieces of text added. Students can now select words.`);
        return r;
      } catch {
        return { error: "We couldn't read this PDF. Choose the PDF you uploaded for this paper." };
      }
    });
  }

  return (
    <li className="grid gap-4 rounded-xl border border-border bg-card px-4 py-3 sm:grid-cols-[110px_minmax(0,1fr)]">
      <ExamCover exam={{ id: slug, city: title, topics: "", tone, free, image: coverUrl ?? undefined }} className="mx-auto w-[96px] sm:w-full" />
      <div className="grid content-start gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid min-w-0 flex-1">
            <span className="font-semibold">{title}</span>
            <span className="text-[13px] text-muted-foreground">
              /{slug} · {hasAudio ? "with audio" : "no audio"}
            </span>
          </div>
          <Badge variant={published ? "gold" : "outline"}>{published ? "Published" : "Draft"}</Badge>
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => run(() => setPaperPublished(id, !published))}>
            {published ? "Unpublish" : "Publish"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Delete "${title}" with its pages, audio, answer key and all student results? This cannot be undone.`)) run(() => deletePaper(id));
            }}
          >
            Delete
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            Cover colour
            <select
              value={tone}
              disabled={pending}
              onChange={(e) => run(() => setPaperTone(id, e.target.value))}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            >
              {COVER_TONES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { uploadCover(e.target.files?.[0]); e.target.value = ""; }} />
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => fileRef.current?.click()}>
            {coverUrl ? "Change cover photo" : "Add cover photo"}
          </Button>
          {coverUrl && (
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => run(() => setPaperCover(id, null))}>
              Remove photo
            </Button>
          )}
          <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={(e) => { addText(e.target.files?.[0]); e.target.value = ""; }} />
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => pdfRef.current?.click()}>
            Add selectable text
          </Button>
          {pending && <span className="text-sm text-muted-foreground">Working…</span>}
        </div>
        {note && <p className="text-sm text-success">{note}</p>}
        <p className="text-[13px] text-muted-foreground">Selectable text: choose the same PDF again; it stays on your computer. Needed once for papers uploaded before this feature.</p>
        <p className="text-[13px] text-muted-foreground">Without a photo the cover shows the Deutli owl on the colour.</p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}
