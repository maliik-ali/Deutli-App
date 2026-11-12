"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, Trash2, Volume2 } from "lucide-react";

import { removeVocabularyWord } from "@/lib/practice/actions";
import type { LanguageCode } from "@/lib/languages";
import { getLanguage } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { setWordStarred } from "@/lib/vocabulary/actions";
import { MAX_BOX, statusOf } from "@/lib/vocabulary/srs";
import { Meaning } from "./meanings";
import { speakGerman } from "./speak";

export type TableWord = {
  id: string;
  word: string;
  dictionaryForm: string | null;
  translations: Record<string, string>;
  starred: boolean;
  box: number;
  due: boolean;
  savedAt: string;
  track: { id: string; title: string } | null;
};

const STATUS_LABEL = { new: "New", learning: "Learning", learned: "Learned" } as const;

function Progress({ box }: { box: number }) {
  const status = statusOf(box);
  return (
    <span className="flex items-center gap-2" title={`${STATUS_LABEL[status]} · step ${box} of ${MAX_BOX}`}>
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: MAX_BOX }, (_, i) => (
          <span
            key={i}
            className={cn(
              "size-2 rounded-full bg-border",
              i < box && (status === "learned" ? "bg-success" : "bg-brand-cyan"),
            )}
          />
        ))}
      </span>
      <span className={cn("text-[13px]", status === "learned" ? "text-success" : "text-muted-foreground")}>
        {STATUS_LABEL[status]}
      </span>
    </span>
  );
}

function IconButton({
  label,
  onClick,
  pressed,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      className="grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 md:size-9"
    >
      {children}
    </button>
  );
}

export function WordTable({ words, languages }: { words: TableWord[]; languages: LanguageCode[] }) {
  const router = useRouter();
  const [starred, setStarred] = useState(() => new Map(words.map((w) => [w.id, w.starred])));
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();

  function toggleStar(w: TableWord) {
    const next = !(starred.get(w.id) ?? w.starred);
    setStarred((m) => new Map(m).set(w.id, next));
    setError(null);
    startBusy(async () => {
      const r = await setWordStarred(w.id, next);
      if ("error" in r) {
        setStarred((m) => new Map(m).set(w.id, !next));
        setError(r.error);
      }
    });
  }

  function remove(w: TableWord) {
    setError(null);
    startBusy(async () => {
      const r = await removeVocabularyWord(w.id);
      if (r?.error) {
        setError(r.error);
        return;
      }
      setRemoved((s) => new Set(s).add(w.id));
      router.refresh();
    });
  }

  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });
  const visible = words.filter((w) => !removed.has(w.id));
  const cols = "md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,1fr)_120px_auto]";

  return (
    <div>
      {error && (
        <p className="border-b border-border px-4 py-3 text-sm text-destructive sm:px-6" role="alert">
          {error}
        </p>
      )}
      <div
        className={cn(
          "hidden gap-4 border-b border-border bg-ink/40 px-6 py-3 text-[13px] font-semibold text-subtle-foreground md:grid",
          cols,
        )}
      >
        <span>German</span>
        <span>{languages.map((c) => getLanguage(c)?.name ?? c).join(" · ")}</span>
        <span>From</span>
        <span>Progress</span>
        <span className="w-[120px] text-right">
          <span className="sr-only">Actions</span>
        </span>
      </div>
      <ul className="divide-y divide-border">
        {visible.map((w) => {
          const isStarred = starred.get(w.id) ?? w.starred;
          const head = w.dictionaryForm ?? w.word;
          const showSaved =
            w.dictionaryForm && w.dictionaryForm.toLowerCase().split(" ").pop() !== w.word.toLowerCase();
          return (
            <li
              key={w.id}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-4 py-3 transition-colors hover:bg-muted/40 sm:px-6 md:gap-4",
                cols,
              )}
            >
              <div className="min-w-0">
                <p lang="de" className="truncate text-[15px] font-semibold">
                  {head}
                </p>
                <p className="text-[13px] text-subtle-foreground">
                  {showSaved && (
                    <>
                      <span lang="de">{w.word}</span> ·{" "}
                    </>
                  )}
                  {w.due ? (
                    <span className="font-medium text-gold-ink">Due today</span>
                  ) : (
                    `Saved ${date.format(new Date(w.savedAt))}`
                  )}
                </p>
              </div>

              <div className="col-span-2 row-start-2 flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-0.5 text-[15px] text-muted-foreground md:col-span-1 md:row-start-auto">
                {languages.some((c) => w.translations[c]) ? (
                  languages.map((c) => <Meaning key={c} code={c} text={w.translations[c]} />)
                ) : (
                  <span className="text-sm">No meaning yet</span>
                )}
              </div>

              <div className="col-span-2 row-start-3 min-w-0 text-[13px] text-muted-foreground md:col-span-1 md:row-start-auto md:text-sm">
                {w.track ? (
                  <Link
                    href={`/practice/${w.track.id}`}
                    lang="de"
                    className="truncate underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {w.track.title}
                  </Link>
                ) : (
                  "—"
                )}
              </div>

              <div className="col-span-2 row-start-4 md:col-span-1 md:row-start-auto">
                <Progress box={w.box} />
              </div>

              <div className="col-start-2 row-start-1 flex justify-end md:col-start-auto md:row-start-auto md:w-[120px]">
                <IconButton label={`Listen to ${head}`} onClick={() => speakGerman(head)}>
                  <Volume2 className="size-[18px]" aria-hidden />
                </IconButton>
                <IconButton
                  label={isStarred ? `Unmark ${head}` : `Mark ${head}`}
                  pressed={isStarred}
                  onClick={() => toggleStar(w)}
                >
                  <Star className={cn("size-[18px]", isStarred && "fill-gold-ink text-gold-ink")} aria-hidden />
                </IconButton>
                <IconButton label={`Remove ${head}`} onClick={() => remove(w)} disabled={busy}>
                  <Trash2 className="size-[18px]" aria-hidden />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
