"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Check,
  Ear,
  EyeOff,
  Mic,
  Pause,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  RotateCw,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { saveVocabularyWord, setPractisedToday } from "@/lib/practice/actions";
import type { PracticeTrack } from "@/lib/practice/data";
import type { SavedWord } from "@/lib/practice/plan";
import { cn } from "@/lib/utils";
import { WordBox, wordBoxHeight } from "./word-box";

const STEPS: { title: string; hint: string; icon: LucideIcon }[] = [
  { title: "Listen", hint: "Round 1: just listen. The text is hidden so your ears do the work.", icon: Ear },
  { title: "Listen and read", hint: "Round 2: play it again and follow the text with your eyes.", icon: BookOpenText },
  { title: "Speak along", hint: "Round 3: play it again and say every sentence aloud with the speaker.", icon: Mic },
];
const SPEEDS = [1, 0.75, 1.25];
const TEXT_SIZES = ["text-[17px] leading-[1.75]", "text-[20px] leading-[1.75]", "text-[23px] leading-[1.7]"];
const BACK = "/dashboard/daily-practice";

function clock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Line = { speaker: string | null; voice: "a" | "b" | null; text: string };

const VOICE_A = /^\s*[●•·∙▪]\s*/; // filled bullet = first speaker
const VOICE_B = /^\s*(?:[○◦]\s*|o\s+)/; // hollow bullet (or a lone "o" from PDFs) = second speaker
const HEADING = /^(aufgabe|dialog|kapitel|teil|track|\d+\.?$)/i;

/**
 * Splits the text into speaker turns. Understands "Jana: …" names and the
 * ● / ○ bullets used in course-book transcripts, and joins lines that a PDF
 * broke in the middle of a sentence.
 */
function parseTranscript(text: string): Line[] {
  const lines: Line[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const voice = VOICE_A.test(trimmed) ? "a" : VOICE_B.test(trimmed) ? "b" : null;
    const body = trimmed.replace(voice === "a" ? VOICE_A : VOICE_B, "").replace(/^[–-]\s+/, "").trim();
    if (!body) continue;

    const named = body.match(/^(\p{Lu}[\p{L}\p{M} .'-]{0,28}):\s+(.+)$/u);
    const prev = lines[lines.length - 1];
    // A line without bullet or name, right after a bullet turn, is the rest of that turn.
    if (!voice && !named && prev?.voice && !HEADING.test(body)) {
      prev.text += ` ${body}`;
      continue;
    }
    lines.push(named ? { speaker: named[1], voice, text: named[2] } : { speaker: null, voice, text: body });
  }
  return lines;
}

/** Where a floating box should sit on screen, from the rectangle of the selected or clicked word. */
type Anchor = { x: number; top: number; bottom: number };
const anchorOf = (r: DOMRect): Anchor => ({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
const escapeRegExp = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TRIM = /^[\s.,;:!?„“”"'»«()–-]+|[\s.,;:!?„“”"'»«()–-]+$/g;

function floatStyle(a: Anchor, height: number, prefer: "above" | "below" = "above"): React.CSSProperties {
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const below = prefer === "below" ? a.bottom + height + 24 < vh : a.top < height + 24;
  const x = typeof window === "undefined" ? a.x : Math.min(Math.max(a.x, 150), window.innerWidth - 150);
  return { left: x, top: below ? a.bottom + 8 : a.top - height - 8, transform: "translateX(-50%)" };
}

export function PracticeReader({ track }: { track: PracticeTrack }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasAudio = Boolean(track.audioUrl);

  const [step, setStep] = useState(hasAudio ? 0 : 1);
  const [revealed, setRevealed] = useState(false);
  const [textSize, setTextSize] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [loop, setLoop] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const [done, setDone] = useState(track.doneToday);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  // Saved words: select a word in the text to save it; saved words are marked in the text.
  const articleRef = useRef<HTMLElement>(null);
  const [words, setWords] = useState<SavedWord[]>(track.words);
  const [languages, setLanguages] = useState(track.languages);
  const [pick, setPick] = useState<{ text: string; context: string; at: Anchor } | null>(null);
  const [openWord, setOpenWord] = useState<{ id: string; at: Anchor } | null>(null);
  const [wordError, setWordError] = useState<string | null>(null);
  const [wordBusy, startWord] = useTransition();
  const active = openWord ? words.find((w) => w.id === openWord.id) : undefined;

  const lines = parseTranscript(track.transcript);
  const index = track.siblings.findIndex((s) => s.id === track.id);
  const prev = index > 0 ? track.siblings[index - 1] : null;
  const next = index >= 0 && index < track.siblings.length - 1 ? track.siblings[index + 1] : null;
  const textHidden = step === 0 && !revealed;

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setAudioFailed(true));
    else a.pause();
  }, []);

  const skip = useCallback((by: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.min(Math.max(0, a.currentTime + by), a.duration || 0);
  }, []);

  // Keyboard: Space = play/pause, arrow keys = 5 seconds back/forward.
  useEffect(() => {
    if (!hasAudio) return;
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el?.closest("button, a, input, select, textarea")) return;
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      } else if (e.key === "ArrowLeft") skip(-5);
      else if (e.key === "ArrowRight") skip(5);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasAudio, toggle, skip]);

  // Watch what the reader selects inside the text.
  useEffect(() => {
    function onSelection() {
      const sel = window.getSelection();
      const art = articleRef.current;
      if (!sel || sel.isCollapsed || !art || !art.contains(sel.anchorNode) || !art.contains(sel.focusNode)) {
        setPick(null);
        return;
      }
      const text = sel.toString().replace(/\s+/g, " ").replace(TRIM, "");
      if (!text || text.length > 80) {
        setPick(null);
        return;
      }
      const node = sel.anchorNode;
      const el = node instanceof Element ? node : node?.parentElement;
      const context = (el?.closest("p")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
      setWordError(null);
      setPick({ text, context, at: anchorOf(sel.getRangeAt(0).getBoundingClientRect()) });
    }
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, []);

  // Close the word box with Escape or a click outside it.
  useEffect(() => {
    if (!openWord) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenWord(null);
    }
    function onDown(e: MouseEvent) {
      const el = e.target as HTMLElement | null;
      if (!el?.closest("[data-word-box], [data-word]")) setOpenWord(null);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [openWord]);

  function savePick() {
    if (!pick) return;
    const { text, context, at } = pick;
    startWord(async () => {
      const result = await saveVocabularyWord({ word: text, context, trackId: track.id });
      if ("error" in result) {
        setWordError(result.error);
        return;
      }
      setWords((list) => (list.some((w) => w.id === result.word.id) ? list : [result.word, ...list]));
      window.getSelection()?.removeAllRanges();
      setPick(null);
      setOpenWord({ id: result.word.id, at });
    });
  }

  const meaningOf = (w: SavedWord) => languages.map((c) => w.translations[c]).find(Boolean) ?? "";

  // Marks every saved word inside a line of text.
  const wordPattern = words.length
    ? new RegExp(
        `(?<![\\p{L}\\p{N}])(${[...words]
          .sort((a, b) => b.word.length - a.word.length)
          .map((w) => escapeRegExp(w.word))
          .join("|")})(?![\\p{L}\\p{N}])`,
        "giu"
      )
    : null;
  function withWords(text: string) {
    if (!wordPattern) return text;
    return text.split(wordPattern).map((part, i) => {
      if (i % 2 === 0) return part;
      const saved = words.find((w) => w.word.toLowerCase() === part.toLowerCase());
      if (!saved) return part;
      const open = (el: HTMLElement) => {
        setWordError(null);
        setOpenWord({ id: saved.id, at: anchorOf(el.getBoundingClientRect()) });
      };
      return (
        <mark
          key={i}
          data-word
          role="button"
          tabIndex={0}
          aria-label={`${part}, saved word${meaningOf(saved) ? `: ${meaningOf(saved)}` : ""}`}
          onClick={(e) => open(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              open(e.currentTarget);
            }
          }}
          className="cursor-pointer rounded-[5px] bg-gold/40 px-0.5 text-inherit decoration-gold-ink decoration-dotted underline-offset-4 hover:bg-gold/60 focus-visible:outline-2"
        >
          {part}
        </mark>
      );
    });
  }

  function goToStep(i: number) {
    setStep(i);
    setRevealed(false);
  }

  function onEnded() {
    setPlaying(false);
    // One round finished: move to the next round, ready to play from the start.
    if (step < STEPS.length - 1) goToStep(step + 1);
    const a = audioRef.current;
    if (a) a.currentTime = 0;
  }

  function cycleSpeed() {
    const nextIndex = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(nextIndex);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[nextIndex];
  }

  function toggleDone() {
    const value = !done;
    setDone(value);
    setSaveError(null);
    startSaving(async () => {
      const result = await setPractisedToday(track.id, value);
      if (result?.error) {
        setDone(!value);
        setSaveError(result.error);
      }
    });
  }

  const StepIcon = STEPS[step].icon;

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Top bar */}
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex h-16 items-center gap-2 px-2 sm:gap-4 sm:px-4">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link href={BACK} aria-label="Close and go back to Daily Practice">
              <X className="size-5" aria-hidden />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-muted-foreground">
              <span lang="de">{track.set.title}</span> · {track.set.level}
              {index >= 0 && ` · Text ${index + 1} of ${track.siblings.length}`}
            </p>
            <h1 className="truncate font-heading text-base font-bold sm:text-lg" lang="de">
              {track.title}
            </h1>
          </div>
          <StepSwitch step={step} onChange={goToStep} className="hidden md:flex" />
          <div className="flex shrink-0 items-center" role="group" aria-label="Text size">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTextSize((s) => Math.max(0, s - 1))}
              disabled={textSize === 0}
              aria-label="Smaller text"
            >
              <span className="text-sm font-bold" aria-hidden>
                A
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTextSize((s) => Math.min(TEXT_SIZES.length - 1, s + 1))}
              disabled={textSize === TEXT_SIZES.length - 1}
              aria-label="Larger text"
            >
              <span className="text-xl font-bold" aria-hidden>
                A
              </span>
            </Button>
          </div>
        </div>
        <div className="border-t border-border px-2 py-2 md:hidden">
          <StepSwitch step={step} onChange={goToStep} className="flex" />
        </div>
      </header>

      {/* Text */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-[720px] gap-6 px-4 py-6 sm:px-6 sm:py-10">
          <p
            className="flex items-start gap-2.5 rounded-xl bg-gold-soft px-4 py-3 text-[15px] text-foreground"
            aria-live="polite"
          >
            <StepIcon className="mt-0.5 size-[18px] shrink-0 text-gold-ink" aria-hidden />
            <span>
              {hasAudio
                ? STEPS[step].hint
                : "There is no audio for this text yet. Read it aloud at your own pace."}
            </span>
          </p>

          {!textHidden && (
            <p className="-mt-3 text-[13px] text-muted-foreground">
              Don&apos;t know a word? Select it in the text to save it to your vocabulary.
              {words.length > 0 && ` Marked words are already saved.`}
            </p>
          )}

          {textHidden ? (
            <div className="grid justify-items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-ink text-gold-ink">
                <EyeOff className="size-7" aria-hidden />
              </span>
              <div className="grid gap-1">
                <p className="text-lg font-bold">Press play and listen</p>
                <p className="max-w-sm text-muted-foreground">
                  Don&apos;t worry if you miss words. You will see the text in the next round.
                </p>
              </div>
              <Button variant="outline" onClick={() => setRevealed(true)}>
                Show the text now
              </Button>
            </div>
          ) : (
            <article ref={articleRef} lang="de" className={cn("grid gap-4 text-foreground", TEXT_SIZES[textSize])}>
              {lines.map((line, i) => (
                <p key={i} className={cn(line.voice && "flex gap-3")}>
                  {line.voice && (
                    <span
                      className={cn(
                        "mt-[0.6em] size-2.5 shrink-0 rounded-full border-2 border-gold-ink",
                        line.voice === "a" && "bg-gold-ink"
                      )}
                      aria-hidden
                    />
                  )}
                  <span>
                    {line.voice && <span className="sr-only">{line.voice === "a" ? "Speaker 1: " : "Speaker 2: "}</span>}
                    {line.speaker && <span className="mr-2 font-semibold text-gold-ink">{line.speaker}:</span>}
                    {withWords(line.text)}
                  </span>
                </p>
              ))}
            </article>
          )}
        </div>
      </main>

      {/* Small bar above the selected text */}
      {pick && !openWord && (
        <div
          data-word-box
          role="toolbar"
          aria-label="Selected text"
          style={floatStyle(pick.at, 48)}
          className="fixed z-40 flex max-w-[300px] items-center gap-2 rounded-full border border-border bg-ink p-1 pl-4 shadow-lg shadow-black/40"
          onMouseDown={(e) => e.preventDefault()}
        >
          {wordError ? (
            <span className="py-2 pr-3 text-[13px] text-destructive" role="alert">
              {wordError}
            </span>
          ) : (
            <>
              <span className="min-w-0 truncate text-sm font-semibold" lang="de">
                {pick.text}
              </span>
              <Button size="sm" className="shrink-0" onClick={savePick} disabled={wordBusy}>
                <Plus aria-hidden /> {wordBusy ? "Saving…" : "Save word"}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Box for a saved word: meanings in the student's languages, remove */}
      {openWord && active && (
        <WordBox
          key={active.id}
          word={active}
          languages={languages}
          style={floatStyle(openWord.at, wordBoxHeight(languages.length), "below")}
          onClose={() => setOpenWord(null)}
          onUpdate={(updated) => setWords((list) => list.map((w) => (w.id === updated.id ? updated : w)))}
          onRemoved={(id) => {
            setWords((list) => list.filter((w) => w.id !== id));
            setOpenWord(null);
          }}
          onLanguagesChange={setLanguages}
        />
      )}

      {/* Bottom bar: audio player, then texts of this set + Done + previous/next */}
      <footer className="shrink-0 border-t border-border bg-card">
        {hasAudio && (
          <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center gap-x-3 gap-y-1 px-3 pt-3 sm:px-6">
            <audio
              ref={audioRef}
              src={track.audioUrl ?? undefined}
              preload="metadata"
              loop={loop}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onDurationChange={(e) => setDuration(e.currentTarget.duration)}
              onEnded={onEnded}
              onError={() => setAudioFailed(true)}
            />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => skip(-5)} aria-label="Back 5 seconds">
                <RotateCcw className="size-5" aria-hidden />
              </Button>
              <Button size="icon" className="size-12" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
                {playing ? (
                  <Pause className="size-5 fill-current" aria-hidden />
                ) : (
                  <Play className="size-5 translate-x-px fill-current" aria-hidden />
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => skip(5)} aria-label="Forward 5 seconds">
                <RotateCw className="size-5" aria-hidden />
              </Button>
            </div>
            <div className="order-last flex min-w-0 basis-full items-center gap-3 sm:order-none sm:basis-0 sm:flex-1">
              <span className="w-10 shrink-0 text-right text-[13px] tabular-nums text-muted-foreground">
                {clock(time)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(time, duration || 0)}
                onChange={(e) => {
                  const t = Number(e.target.value);
                  setTime(t);
                  if (audioRef.current) audioRef.current.currentTime = t;
                }}
                disabled={!duration}
                aria-label="Audio position"
                aria-valuetext={`${clock(time)} of ${clock(duration)}`}
                className="h-11 min-w-0 flex-1 cursor-pointer accent-gold disabled:cursor-default"
              />
              <span className="w-10 shrink-0 text-[13px] tabular-nums text-muted-foreground">{clock(duration)}</span>
            </div>
            <div className="ml-auto flex items-center gap-1 sm:ml-0">
              <Button
                variant="outline"
                size="sm"
                className="h-11 w-16 tabular-nums"
                onClick={cycleSpeed}
                aria-label={`Speed ${SPEEDS[speedIndex]} times. Change speed`}
              >
                {SPEEDS[speedIndex]}×
              </Button>
              <Button
                variant={loop ? "ink" : "ghost"}
                size="icon"
                onClick={() => setLoop((l) => !l)}
                aria-pressed={loop}
                aria-label="Repeat this audio"
                className={cn(loop && "text-gold-ink")}
              >
                <Repeat className="size-5" aria-hidden />
              </Button>
            </div>
            {audioFailed && (
              <p className="basis-full text-[13px] text-destructive" role="alert">
                The audio couldn&apos;t play. Reload the page and try again.
              </p>
            )}
          </div>
        )}

        <div className="mx-auto flex w-full max-w-[1100px] items-center gap-3 px-3 py-3 sm:px-6">
          <nav aria-label="Texts in this set" className="min-w-0 flex-1 overflow-x-auto">
            <ol className="flex w-max items-center gap-1.5 py-0.5">
              {track.siblings.map((s, i) => {
                const current = s.id === track.id;
                const ticked = current ? done : s.doneToday;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/practice/${s.id}`}
                      aria-current={current ? "page" : undefined}
                      aria-label={`Text ${i + 1}: ${s.title}${ticked ? " (practised today)" : ""}`}
                      title={s.title}
                      className={cn(
                        "grid size-11 place-items-center rounded-xl text-sm font-bold transition-colors sm:size-10",
                        current
                          ? "bg-gold text-gold-foreground"
                          : ticked
                            ? "bg-success-soft text-success hover:opacity-85"
                            : "bg-ink text-ink-foreground hover:bg-ink/70"
                      )}
                    >
                      {i + 1}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>
          <Button
            variant={done ? "outline" : "default"}
            onClick={toggleDone}
            disabled={saving}
            aria-pressed={done}
            className={cn("shrink-0", done && "border-success/40 text-success hover:bg-success-soft hover:text-success")}
          >
            <Check aria-hidden />
            {done ? "Practised today" : "Done"}
          </Button>
          <div className="flex shrink-0 items-center gap-1">
            <NavArrow href={prev ? `/practice/${prev.id}` : null} label="Previous text">
              <ArrowLeft className="size-5" aria-hidden />
            </NavArrow>
            <NavArrow href={next ? `/practice/${next.id}` : null} label="Next text">
              <ArrowRight className="size-5" aria-hidden />
            </NavArrow>
          </div>
        </div>
        {saveError && (
          <p className="px-4 pb-3 text-center text-[13px] text-destructive" role="alert">
            {saveError}
          </p>
        )}
      </footer>
    </div>
  );
}

function StepSwitch({
  step,
  onChange,
  className,
}: {
  step: number;
  onChange: (i: number) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Practice round"
      className={cn("shrink-0 items-center gap-1 rounded-full bg-background p-1", className)}
    >
      {STEPS.map((s, i) => (
        <button
          key={s.title}
          type="button"
          onClick={() => onChange(i)}
          aria-pressed={step === i}
          className={cn(
            "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-semibold whitespace-nowrap transition-colors md:flex-none md:px-4",
            step === i ? "bg-gold-soft text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span
            className={cn(
              "grid size-5 place-items-center rounded-full text-[11px] font-bold",
              step === i ? "bg-gold text-gold-foreground" : "bg-ink text-ink-foreground"
            )}
            aria-hidden
          >
            {i + 1}
          </span>
          {s.title}
        </button>
      ))}
    </div>
  );
}

function NavArrow({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  if (!href)
    return (
      <Button variant="outline" size="icon" disabled aria-label={label}>
        {children}
      </Button>
    );
  return (
    <Button asChild variant="outline" size="icon">
      <Link href={href} aria-label={label}>
        {children}
      </Link>
    </Button>
  );
}
