"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Eraser, Eye, EyeOff, Highlighter, Hand, Loader2, Minus, Pause, Play, Plus, RotateCcw, RotateCw, Send, StickyNote, Timer } from "lucide-react";

import { PaperPage, type PaperTool } from "@/components/exam/paper-page";
import { usePaperWords } from "@/components/exam/paper-words";
import { useAnnotations } from "@/components/exam/use-annotations";
import { WritingBox } from "@/components/exam/writing-box";
import { Button } from "@/components/ui/button";
import type { LanguageCode } from "@/lib/languages";
import { saveAttempt, saveTimer, submitAttempt } from "@/lib/papers/actions";
import type { TextItem } from "@/lib/papers/render";
import type { SavedWord } from "@/lib/practice/plan";
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
  initialSpent: Record<string, number>;
  pageText: Record<number, TextItem[]>;
  savedWords: SavedWord[];
  languages: LanguageCode[];
};

const WRITING_AIM = 100;

function mmss(total: number) {
  const s = Math.max(0, Math.floor(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function ExamPlayer({ slug, title, attemptId, structure, pageUrls, audioUrl, initialAnswers, initialWriting, initialSpent, pageText, savedWords, languages }: Props) {
  const router = useRouter();
  const parts = structure.parts;
  const [partIndex, setPartIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [writing, setWriting] = useState(initialWriting);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<PaperTool>("move");
  const [marks, setMarks] = useAnnotations(`deutli-paper-marks-${attemptId}`);
  // Hiding the timer only hides the numbers; the clock keeps running.
  const [showTimer, setShowTimer] = useState(true);
  const [spent, setSpent] = useState<Record<string, number>>(initialSpent);
  const [paused, setPaused] = useState(false);
  const spentRef = useRef(spent);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const { overlay: wordTools, withWords } = usePaperWords({
    initialWords: savedWords,
    initialLanguages: languages,
    areaRef: paperRef,
    onHighlight: (page, rects) => setMarks([...marks, ...rects.map((r) => ({ id: crypto.randomUUID(), page, kind: "hl" as const, ...r }))]),
  });
  const lastSaved = useRef(JSON.stringify([initialAnswers, initialWriting]));

  const part = parts[partIndex];
  const section = SECTIONS.find((s) => s.id === part.section)!;
  const sectionLeft = section.minutes * 60 - (spent[part.section] ?? 0);
  const sectionsInPaper = SECTIONS.filter((s) => parts.some((p) => p.section === s.id));

  // Section timers count down while you are inside that section.
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setSpent((s) => ({ ...s, [part.section]: (s[part.section] ?? 0) + 1 })), 1000);
    return () => window.clearInterval(id);
  }, [part.section, paused]);

  useEffect(() => {
    spentRef.current = spent;
  }, [spent]);

  // Save the timers every 10 seconds, when you pause, and when you leave the tab, so a reload keeps your time.
  useEffect(() => {
    const send = () => void saveTimer(attemptId, spentRef.current);
    const id = window.setInterval(send, 10_000);
    const onHide = () => document.visibilityState === "hidden" && send();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", send);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", send);
    };
  }, [attemptId]);

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
        <div className="flex items-center justify-end gap-3">
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
                    {showTimer && <span className={cn("font-mono text-[12px]", left <= 0 ? "text-destructive" : "text-subtle-foreground")}>{mmss(left)}</span>}
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
          </div>
        </nav>

        {/* The paper */}
        <section className="flex min-h-0 min-w-0 flex-col" aria-label="Exam paper">
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-3 sm:px-5">
            <div className="flex min-w-0 flex-1 basis-0 items-center gap-3">
            <button type="button" disabled={partIndex === 0} onClick={() => setPartIndex((i) => i - 1)} aria-label="Previous part" className="grid size-10 place-items-center rounded-full border border-border bg-card disabled:opacity-40">
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <div className="grid min-w-0 flex-1">
              <span className="text-[12px] font-semibold tracking-[0.14em] text-subtle-foreground uppercase">{section.title}</span>
              <span className="font-bold">
                {part.title} <span className="font-medium text-muted-foreground">· {partIndex + 1}/{parts.length}</span>
              </span>
            </div>
            </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-card py-1 pr-1 pl-3.5">
            <Timer className="size-4 text-muted-foreground" aria-hidden />
            <span className="min-w-[4.5rem] text-center font-mono text-[15px] font-semibold tabular-nums" role="timer" aria-label={showTimer ? `${section.title}: ${mmss(sectionLeft)} left` : "Timer hidden"}>
              {showTimer ? <span className={sectionLeft <= 0 ? "text-destructive" : undefined}>{mmss(sectionLeft)}</span> : <span className="text-muted-foreground">Hidden</span>}
            </span>
            <button type="button" onClick={() => { setPaused((v) => !v); void saveTimer(attemptId, spentRef.current); }} aria-pressed={paused} aria-label={paused ? "Resume the timer" : "Pause the timer"} className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
            </button>
            <button type="button" onClick={() => setShowTimer((v) => !v)} aria-pressed={!showTimer} aria-label={showTimer ? "Hide timer" : "Show timer"} className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {showTimer ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
            </button>
          </div>
            <div className="flex min-w-0 flex-1 basis-0 items-center justify-end gap-3">
            <select aria-label="Go to part" value={partIndex} onChange={(e) => setPartIndex(Number(e.target.value))} className="h-10 max-w-40 rounded-full border border-border bg-card px-3 text-sm lg:hidden">
              {parts.map((p, i) => (
                <option key={p.id} value={i}>
                  {SECTIONS.find((s) => s.id === p.section)?.title} · {p.title}
                </option>
              ))}
            </select>
            <button type="button" disabled={partIndex === parts.length - 1} onClick={() => setPartIndex((i) => i + 1)} aria-label="Next part" className="grid size-10 place-items-center rounded-full bg-brand-gradient text-white disabled:opacity-40">
              <ChevronRight className="size-5" aria-hidden />
            </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col">
          <div ref={paperRef} className="min-h-0 flex-1 overflow-y-auto bg-muted/40 px-3 py-6 sm:px-6">
            <div className="mx-auto grid gap-6" style={{ width: `min(100%, ${Math.round(820 * zoom)}px)` }}>
              {pages.map((n) =>
                pageUrls[n] ? (
                  <PaperPage key={n} src={pageUrls[n]} alt={`Page ${n} of the exam paper`} page={n} tool={tool} items={marks} onChange={setMarks} text={pageText[n]} withWords={withWords} />
                ) : (
                  <p key={n} className="rounded-lg bg-card p-6 text-center text-muted-foreground">This page could not load. Reload the page.</p>
                ),
              )}
            </div>
          </div>
          <div className="absolute top-1/2 right-2 z-10 flex -translate-y-1/2 flex-col items-center gap-3 sm:right-[18px]">
          <div role="group" aria-label="Mark the paper" className="flex flex-col items-center gap-0.5 rounded-full bg-ink px-1.5 py-1.5 text-ink-foreground shadow-lg shadow-black/40">
            {([["move", Hand, "Scroll and read"], ["highlight", Highlighter, "Highlight"], ["note", StickyNote, "Add a note"], ["erase", Eraser, "Remove a mark"]] as const).map(([id, Icon, label]) => (
              <button key={id} type="button" aria-label={label} title={label} aria-pressed={tool === id} onClick={() => setTool(id)} className={cn("grid size-9 place-items-center rounded-full transition-colors", tool === id ? "bg-gold text-gold-foreground" : "hover:bg-white/10")}>
                <Icon className="size-4" aria-hidden />
              </button>
            ))}
          </div>
          <div role="group" aria-label="Zoom" className="flex flex-col items-center gap-0.5 rounded-full bg-ink px-1.5 py-1.5 text-ink-foreground shadow-lg shadow-black/40">
            <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(1)))} className="grid size-9 place-items-center rounded-full hover:bg-white/10">
              <Plus className="size-4" aria-hidden />
            </button>
            <span className="py-0.5 text-center text-[12px] font-semibold tabular-nums" aria-live="polite">{Math.round(zoom * 100)}%</span>
            <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(1)))} className="grid size-9 place-items-center rounded-full hover:bg-white/10">
              <Minus className="size-4" aria-hidden />
            </button>
          </div>
          </div>
          </div>

          {wordTools}
          {paused && (
            <div className="fixed inset-x-0 top-16 bottom-0 z-40 grid place-content-center gap-3 bg-background/95 p-6 text-center backdrop-blur-sm" role="dialog" aria-label="Paused">
              <p className="text-2xl font-extrabold">Paused</p>
              <p className="max-w-xs text-muted-foreground">Your time is stopped. The paper is hidden until you continue.</p>
              <div>
                <Button type="button" onClick={() => setPaused(false)}>
                  <Play aria-hidden /> Continue
                </Button>
              </div>
            </div>
          )}
          {part.section === "hoeren" && <AudioBar url={audioUrl} />}
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
              <div className="py-3">
                <WritingBox value={writing} onChange={setWriting} aim={WRITING_AIM} />
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
                              on ? "border-gold-ink bg-gold-soft text-foreground" : "border-border bg-background text-muted-foreground hover:border-gold-ink/60 hover:text-foreground",
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

const SPEEDS = [1, 0.75, 1.25];

function clock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/** Same audio player as Daily Practice: back 5 s, play, forward 5 s, position bar, speed. */
function AudioBar({ url }: { url: string | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  if (!url)
    return <p className="shrink-0 border-t border-border bg-card px-5 py-4 text-sm text-muted-foreground">The audio for this paper has not been added yet.</p>;

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setFailed(true));
    else a.pause();
  };
  const skip = (by: number) => {
    const a = ref.current;
    if (a) a.currentTime = Math.min(Math.max(0, a.currentTime + by), a.duration || 0);
  };
  const cycleSpeed = () => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    if (ref.current) ref.current.playbackRate = SPEEDS[next];
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border bg-card px-3 py-3 sm:px-6">
      <audio
        ref={ref}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => skip(-5)} aria-label="Back 5 seconds">
          <RotateCcw className="size-5" aria-hidden />
        </Button>
        <Button size="icon" className="size-12" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="size-5 fill-current" aria-hidden /> : <Play className="size-5 translate-x-px fill-current" aria-hidden />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => skip(5)} aria-label="Forward 5 seconds">
          <RotateCw className="size-5" aria-hidden />
        </Button>
      </div>
      <div className="order-last flex min-w-0 basis-full items-center gap-3 sm:order-none sm:basis-0 sm:flex-1">
        <span className="w-10 shrink-0 text-right text-[13px] tabular-nums text-muted-foreground">{clock(time)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(time, duration || 0)}
          onChange={(e) => {
            const t = Number(e.target.value);
            setTime(t);
            if (ref.current) ref.current.currentTime = t;
          }}
          disabled={!duration}
          aria-label="Audio position"
          aria-valuetext={`${clock(time)} of ${clock(duration)}`}
          className="h-11 min-w-0 flex-1 cursor-pointer accent-gold disabled:cursor-default"
        />
        <span className="w-10 shrink-0 text-[13px] tabular-nums text-muted-foreground">{clock(duration)}</span>
      </div>
      <div className="ml-auto sm:ml-0">
        <Button variant="outline" size="sm" className="h-11 w-16 tabular-nums" onClick={cycleSpeed} aria-label={`Speed ${SPEEDS[speedIndex]} times. Change speed`}>
          {SPEEDS[speedIndex]}×
        </Button>
      </div>
      {failed && (
        <p className="basis-full text-[13px] text-destructive" role="alert">
          The audio couldn&apos;t play. Reload the page and try again.
        </p>
      )}
    </div>
  );
}
