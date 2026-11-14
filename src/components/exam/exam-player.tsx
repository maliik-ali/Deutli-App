"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, Minus, Pause, Play, Plus, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { saveAttempt, submitAttempt } from "@/lib/papers/actions";
import { SECTIONS, countWords, partQuestions, type PaperPart, type PaperStructure } from "@/lib/papers/template";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  title: string;
  attemptId: string;
  structure: PaperStructure;
  pageUrls: Record<number, string>;
  audioUrl: string | null;
  initialAnswers: Record<string, string>;
  initialWriting: string;
};

const WRITING_AIM = 100;

function mmss(total: number) {
  const s = Math.max(0, Math.floor(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function ExamPlayer({ slug, title, attemptId, structure, pageUrls, audioUrl, initialAnswers, initialWriting }: Props) {
  const router = useRouter();
  const parts = structure.parts;
  const [partIndex, setPartIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [writing, setWriting] = useState(initialWriting);
  const [zoom, setZoom] = useState(1);
  const [timersOn, setTimersOn] = useState(true);
  const [spent, setSpent] = useState<Record<string, number>>({});
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const lastSaved = useRef(JSON.stringify([initialAnswers, initialWriting]));

  const part = parts[partIndex];
  const section = SECTIONS.find((s) => s.id === part.section)!;
  const sectionsInPaper = SECTIONS.filter((s) => parts.some((p) => p.section === s.id));

  // Section timers count down while you are inside that section.
  useEffect(() => {
    if (!timersOn) return;
    const id = window.setInterval(() => setSpent((s) => ({ ...s, [part.section]: (s[part.section] ?? 0) + 1 })), 1000);
    return () => window.clearInterval(id);
  }, [timersOn, part.section]);

  // Save a moment after every change.
  useEffect(() => {
    const snapshot = JSON.stringify([answers, writing]);
    if (snapshot === lastSaved.current) return;
    setSaveState("saving");
    const t = window.setTimeout(async () => {
      const r = await saveAttempt(attemptId, answers, writing);
      if (!("error" in r)) lastSaved.current = snapshot;
      setSaveState("error" in r ? "error" : "saved");
    }, 700);
    return () => window.clearTimeout(t);
  }, [answers, writing, attemptId]);

  // Show the top of the paper when the part changes.
  useEffect(() => {
    paperRef.current?.scrollTo({ top: 0 });
  }, [partIndex]);

  const answered = useMemo(() => Object.keys(answers).length, [answers]);
  const partAnswered = (p: PaperPart) =>
    p.kind === "write" ? countWords(writing) > 0 : partQuestions(p).filter((n) => answers[String(n)]).length;
  const partDone = (p: PaperPart) => (p.kind === "write" ? countWords(writing) >= 20 : partAnswered(p) === p.count);

  function choose(n: number, value: string) {
    setAnswers((a) => {
      const next = { ...a };
      if (next[String(n)] === value) delete next[String(n)];
      else next[String(n)] = value;
      return next;
    });
  }

  async function finish() {
    setSubmitting(true);
    setSubmitError(null);
    const r = await submitAttempt(attemptId, answers, writing);
    if ("error" in r) {
      setSubmitting(false);
      setSubmitError(r.error);
      return;
    }
    router.push(`/dashboard/exam/mock/${slug}/result?a=${r.id}`);
  }

  const pages = Array.from({ length: part.toPage - part.fromPage + 1 }, (_, i) => part.fromPage + i);
  const unanswered = 60 - answered;

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={`/dashboard/exam/mock/${slug}`} aria-label="Leave the exam" className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <p className="truncate font-bold">
            {title} <span className="ml-1 text-[12px] font-semibold tracking-[0.12em] text-subtle-foreground uppercase">telc · B1</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[13px] text-muted-foreground sm:block" role="status">
            {saveState === "saving" ? "Saving…" : saveState === "error" ? "Not saved — check your internet" : "All answers saved"}
          </span>
          <Button type="button" onClick={() => setConfirming(true)}>
            <Send aria-hidden /> Submit exam
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_minmax(0,1fr)_340px]">
        {/* Sections */}
        <nav aria-label="Sections" className="hidden min-h-0 flex-col border-r border-border bg-card lg:flex">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            <p className="mb-3 px-2 text-[12px] font-semibold tracking-[0.14em] text-subtle-foreground uppercase">Sections</p>
            {sectionsInPaper.map((s) => {
              const left = s.minutes * 60 - (spent[s.id] ?? 0);
              return (
                <div key={s.id} className="mb-5">
                  <div className={cn("flex items-baseline justify-between px-2 pb-1 text-[13px] font-bold tracking-[0.08em] uppercase", s.id === part.section ? "text-foreground" : "text-muted-foreground")}>
                    <span>{s.title}</span>
                    {timersOn && <span className={cn("font-mono text-[12px]", left <= 0 ? "text-destructive" : "text-subtle-foreground")}>{mmss(left)}</span>}
                  </div>
                  {parts.map((p, i) =>
                    p.section !== s.id ? null : (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPartIndex(i)}
                        aria-current={i === partIndex ? "true" : undefined}
                        className={cn("flex h-10 w-full items-center justify-between rounded-lg px-3 text-left text-[15px] transition-colors", i === partIndex ? "bg-gold-soft font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                      >
                        {p.title}
                        {partDone(p) && <span className="size-2 rounded-full bg-success" aria-label="done" />}
                      </button>
                    ),
                  )}
                </div>
              );
            })}
          </div>
          <div className="border-t border-border px-6 py-4">
            <p className="text-3xl font-extrabold">
              {answered}
              <span className="text-lg font-semibold text-muted-foreground"> / 60</span>
            </p>
            <p className="text-[12px] font-semibold tracking-[0.14em] text-subtle-foreground uppercase">Answered</p>
            <button type="button" onClick={() => setTimersOn((v) => !v)} className="mt-3 flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em] text-muted-foreground uppercase hover:text-foreground">
              {timersOn ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />} Timers {timersOn ? "on" : "off"}
            </button>
          </div>
        </nav>

        {/* The paper */}
        <section className="flex min-h-0 min-w-0 flex-col" aria-label="Exam paper">
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-3 sm:px-5">
            <button type="button" disabled={partIndex === 0} onClick={() => setPartIndex((i) => i - 1)} aria-label="Previous part" className="grid size-10 place-items-center rounded-full border border-border bg-card disabled:opacity-40">
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <div className="grid min-w-0 flex-1">
              <span className="text-[12px] font-semibold tracking-[0.14em] text-subtle-foreground uppercase">{section.title}</span>
              <span className="font-bold">
                {part.title} <span className="font-medium text-muted-foreground">· {partIndex + 1}/{parts.length}</span>
              </span>
            </div>
            <select aria-label="Go to part" value={partIndex} onChange={(e) => setPartIndex(Number(e.target.value))} className="h-10 max-w-40 rounded-full border border-border bg-card px-3 text-sm lg:hidden">
              {parts.map((p, i) => (
                <option key={p.id} value={i}>
                  {SECTIONS.find((s) => s.id === p.section)?.title} · {p.title}
                </option>
              ))}
            </select>
            <button type="button" disabled={partIndex === parts.length - 1} onClick={() => setPartIndex((i) => i + 1)} aria-label="Next part" className="grid size-10 place-items-center rounded-full bg-ink text-ink-foreground disabled:opacity-40">
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>

          {part.section === "hoeren" && <AudioBar url={audioUrl} />}

          <div ref={paperRef} className="relative min-h-0 flex-1 overflow-y-auto bg-muted/40 px-3 py-6 sm:px-6">
            <div className="mx-auto grid gap-6" style={{ width: `min(100%, ${Math.round(820 * zoom)}px)` }}>
              {pages.map((n) =>
                pageUrls[n] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={n} src={pageUrls[n]} alt={`Page ${n} of the exam paper`} loading="lazy" draggable={false} className="w-full rounded-sm bg-white shadow-xl shadow-black/40 select-none" />
                ) : (
                  <p key={n} className="rounded-lg bg-card p-6 text-center text-muted-foreground">This page could not load. Reload the page.</p>
                ),
              )}
            </div>
            <div className="sticky bottom-3 z-10 mx-auto mt-6 flex w-fit items-center gap-1 rounded-full bg-ink px-2 py-1.5 text-ink-foreground shadow-lg shadow-black/40">
              <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(1)))} className="grid size-8 place-items-center rounded-full hover:bg-white/10">
                <Minus className="size-4" aria-hidden />
              </button>
              <span className="w-12 text-center text-sm font-semibold">{Math.round(zoom * 100)}%</span>
              <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(1)))} className="grid size-8 place-items-center rounded-full hover:bg-white/10">
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </section>

        {/* Answer sheet */}
        <aside aria-label="Answer sheet" className="flex min-h-0 flex-col border-t border-border bg-card lg:border-t-0 lg:border-l">
          <div className="shrink-0 border-b border-border px-5 py-4">
            <div className="flex items-center justify-between text-[12px] font-semibold tracking-[0.14em] text-subtle-foreground uppercase">
              <span>
                {section.title} · {part.title}
              </span>
              {part.kind !== "write" && (
                <span>
                  {partAnswered(part)}/{part.count}
                </span>
              )}
            </div>
            <h2 className="mt-1 text-2xl font-extrabold">{part.kind === "write" ? "Your email" : "Answer sheet"}</h2>
            <p className="text-sm text-muted-foreground">{part.kind === "write" ? `Aim for about ${WRITING_AIM} words.` : "Tap a letter to mark your answer. Tap it again to clear it."}</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
            {part.kind === "write" ? (
              <div className="grid gap-2 py-3">
                <textarea value={writing} onChange={(e) => setWriting(e.target.value.slice(0, 6000))} rows={14} aria-label="Your email" placeholder="Write your email here…" className="min-h-72 w-full resize-y rounded-xl border border-input bg-background p-4 text-[16px] leading-relaxed outline-none focus-visible:border-ink" />
                <p className={cn("text-right text-sm", countWords(writing) >= WRITING_AIM ? "text-success" : "text-muted-foreground")}>{countWords(writing)} words</p>
              </div>
            ) : (
              <ol>
                {partQuestions(part).map((n) => (
                  <li key={n} className="border-b border-border py-4 last:border-0">
                    <p className="mb-3 text-2xl font-extrabold">{String(n).padStart(2, "0")}</p>
                    <div className={cn("flex flex-wrap gap-2.5", part.kind === "tf" && "grid grid-cols-2")}>
                      {(part.kind === "tf" ? ["+", "-"] : part.kind === "abc" ? ["a", "b", "c"] : (part.options ?? [])).map((o) => {
                        const on = answers[String(n)] === o;
                        return (
                          <button
                            key={o}
                            type="button"
                            aria-pressed={on}
                            aria-label={part.kind === "tf" ? (o === "+" ? `${n} richtig` : `${n} falsch`) : `${n} ${o.toUpperCase()}`}
                            onClick={() => choose(n, o)}
                            className={cn(
                              "grid place-items-center border font-semibold transition-colors",
                              part.kind === "tf" ? "h-12 rounded-full text-xl" : "size-12 rounded-full text-[15px]",
                              on ? "border-gold-ink bg-gold-ink text-ink" : "border-border bg-background text-muted-foreground hover:border-gold-ink/60 hover:text-foreground",
                            )}
                          >
                            {part.kind === "tf" ? (o === "+" ? "+" : "−") : o.toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                    {part.kind === "match" && part.options?.includes("x") && <p className="mt-2 text-[12px] text-subtle-foreground">X = no advert fits</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>

      {confirming && (
        <div role="dialog" aria-modal="true" aria-labelledby="submit-title" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="grid w-full max-w-md gap-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 id="submit-title" className="text-xl font-extrabold">
              Submit your exam?
            </h2>
            <p className="text-muted-foreground">
              {unanswered > 0 ? `You have not answered ${unanswered} of 60 questions. ` : "You answered all 60 questions. "}
              After you submit, you cannot change your answers.
            </p>
            {submitError && (
              <p role="alert" className="text-sm text-destructive">
                {submitError}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={submitting} onClick={() => setConfirming(false)}>
                Keep working
              </Button>
              <Button type="button" disabled={submitting} onClick={finish}>
                {submitting && <Loader2 className="animate-spin" aria-hidden />} Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AudioBar({ url }: { url: string | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  if (!url) return <p className="shrink-0 border-b border-border px-5 py-3 text-sm text-muted-foreground">The audio for this paper has not been added yet.</p>;
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-3 py-3 sm:px-5">
      <audio ref={ref} src={url} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} />
      <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={() => (playing ? ref.current?.pause() : ref.current?.play())} className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-ink text-ink">
        {playing ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
      </button>
      <input type="range" aria-label="Audio position" min={0} max={duration || 1} step={1} value={time} onChange={(e) => ref.current && (ref.current.currentTime = Number(e.target.value))} className="h-1 min-w-0 flex-1 accent-[var(--gold-ink)]" />
      <span className="shrink-0 font-mono text-[13px] text-muted-foreground">
        {mmss(time)} / {mmss(duration)}
      </span>
    </div>
  );
}
