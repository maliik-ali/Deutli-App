"use client";

import { useEffect, useState, useTransition } from "react";
import { Highlighter, Languages } from "lucide-react";

import { WordBox, wordBoxHeight } from "@/components/practice/word-box";
import { Button } from "@/components/ui/button";
import type { LanguageCode } from "@/lib/languages";
import { saveVocabularyWord } from "@/lib/practice/actions";
import type { SavedWord } from "@/lib/practice/plan";

type Anchor = { x: number; top: number; bottom: number };
const anchorOf = (r: DOMRect): Anchor => ({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
const TRIM = /^[\s.,;:!?„“”"'»«()–-]+|[\s.,;:!?„“”"'»«()–-]+$/g;
export const escapeRegExp = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function floatStyle(a: Anchor, height: number, prefer: "above" | "below" = "above"): React.CSSProperties {
  const below = prefer === "below" ? a.bottom + height + 24 < window.innerHeight : a.top < height + 24;
  const x = Math.min(Math.max(a.x, 150), window.innerWidth - 150);
  return { left: x, top: below ? a.bottom + 8 : a.top - height - 8, transform: "translateX(-50%)" };
}

type Pick = { text: string; context: string; at: Anchor; page: number | null; rects: { x: number; y: number; w: number; h: number }[] };

/**
 * Select a word on the paper: a small bar offers "Highlight" and "Translate" (translate saves the
 * word to the student's vocabulary, same as in Improve Accent). Saved words are marked on the page.
 * `onHighlight` receives rectangles as fractions of the page.
 */
export function usePaperWords({
  initialWords,
  initialLanguages,
  areaRef,
  onHighlight,
}: {
  initialWords: SavedWord[];
  initialLanguages: LanguageCode[];
  areaRef: React.RefObject<HTMLElement | null>;
  onHighlight: (page: number, rects: { x: number; y: number; w: number; h: number }[]) => void;
}) {
  const [words, setWords] = useState(initialWords);
  const [languages, setLanguages] = useState(initialLanguages);
  const [pick, setPick] = useState<Pick | null>(null);
  const [openWord, setOpenWord] = useState<{ id: string; at: Anchor } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const active = openWord ? words.find((w) => w.id === openWord.id) : undefined;

  useEffect(() => {
    function onSelection() {
      const sel = window.getSelection();
      const area = areaRef.current;
      if (!sel || sel.isCollapsed || !area || !area.contains(sel.anchorNode) || !area.contains(sel.focusNode)) return setPick(null);
      const text = sel.toString().replace(/\s+/g, " ").replace(TRIM, "");
      const node = sel.anchorNode;
      const el = node instanceof Element ? node : node?.parentElement;
      const layer = el?.closest<HTMLElement>("[data-text-layer]");
      if (!text || text.length > 80 || !layer) return setPick(null);
      const pageBox = layer.getBoundingClientRect();
      const range = sel.getRangeAt(0);
      const rects = Array.from(range.getClientRects())
        .filter((r) => r.width > 2 && r.height > 2)
        .map((r) => ({ x: (r.left - pageBox.left) / pageBox.width, y: (r.top - pageBox.top) / pageBox.height, w: r.width / pageBox.width, h: r.height / pageBox.height }));
      const context = (el?.closest("[data-text-item]")?.textContent ?? text).replace(/\s+/g, " ").trim().slice(0, 500);
      setError(null);
      setPick({ text, context, at: anchorOf(range.getBoundingClientRect()), page: Number(layer.dataset.textLayer) || null, rects });
    }
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, [areaRef]);

  useEffect(() => {
    if (!openWord) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenWord(null);
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement | null)?.closest("[data-word-box], [data-word]")) setOpenWord(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [openWord]);

  function translate() {
    if (!pick) return;
    const { text, context, at } = pick;
    start(async () => {
      const r = await saveVocabularyWord({ word: text, context });
      if ("error" in r) return setError(r.error);
      setWords((list) => (list.some((w) => w.id === r.word.id) ? list : [r.word, ...list]));
      window.getSelection()?.removeAllRanges();
      setPick(null);
      setOpenWord({ id: r.word.id, at });
    });
  }

  function highlight() {
    if (!pick?.page || pick.rects.length === 0) return;
    onHighlight(pick.page, pick.rects);
    window.getSelection()?.removeAllRanges();
    setPick(null);
  }

  const pattern = words.length
    ? new RegExp(`(?<![\\p{L}\\p{N}])(${[...words].sort((a, b) => b.word.length - a.word.length).map((w) => escapeRegExp(w.word)).join("|")})(?![\\p{L}\\p{N}])`, "giu")
    : null;

  /** Splits a piece of page text so saved words become clickable marks. */
  function withWords(text: string): React.ReactNode {
    if (!pattern) return text;
    return text.split(pattern).map((part, i) => {
      if (i % 2 === 0) return part;
      const saved = words.find((w) => w.word.toLowerCase() === part.toLowerCase());
      if (!saved) return part;
      return (
        <mark
          key={i}
          data-word
          role="button"
          tabIndex={0}
          aria-label={`${part}, saved word`}
          onClick={(e) => setOpenWord({ id: saved.id, at: anchorOf(e.currentTarget.getBoundingClientRect()) })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpenWord({ id: saved.id, at: anchorOf(e.currentTarget.getBoundingClientRect()) });
            }
          }}
          className="cursor-pointer rounded-[3px] bg-gold/40 text-transparent hover:bg-gold/60"
        >
          {part}
        </mark>
      );
    });
  }

  const overlay = (
    <>
      {pick && !openWord && (
        <div data-word-box role="toolbar" aria-label="Selected text" style={floatStyle(pick.at, 48)} className="fixed z-40 flex max-w-[320px] items-center gap-1 rounded-full border border-border bg-ink p-1 shadow-lg shadow-black/40" onMouseDown={(e) => e.preventDefault()}>
          {error ? (
            <span className="px-3 py-2 text-[13px] text-destructive" role="alert">
              {error}
            </span>
          ) : (
            <>
              <Button size="sm" variant="ghost" className="shrink-0" onClick={highlight}>
                <Highlighter aria-hidden /> Highlight
              </Button>
              <Button size="sm" className="shrink-0" onClick={translate} disabled={busy}>
                <Languages aria-hidden /> {busy ? "Saving…" : "Translate"}
              </Button>
            </>
          )}
        </div>
      )}
      {openWord && active && (
        <WordBox
          key={active.id}
          word={active}
          languages={languages}
          style={floatStyle(openWord.at, wordBoxHeight(languages.length), "below")}
          onClose={() => setOpenWord(null)}
          onUpdate={(u) => setWords((list) => list.map((w) => (w.id === u.id ? u : w)))}
          onRemoved={(id) => {
            setWords((list) => list.filter((w) => w.id !== id));
            setOpenWord(null);
          }}
          onLanguagesChange={setLanguages}
        />
      )}
    </>
  );

  return { overlay, withWords };
}
