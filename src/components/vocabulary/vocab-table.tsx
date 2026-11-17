"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ListFilter, Star, Trash2, Volume2 } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { removeVocabularyWord } from "@/lib/practice/actions";
import { textProps, type LanguageCode } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { setLevelWordStarred, setWordStarred } from "@/lib/vocabulary/actions";
import { MAX_BOX, statusOf } from "@/lib/vocabulary/srs";
import type { Column, ColumnId } from "./columns";
import { Meaning } from "./meanings";
import { speakGerman } from "./speak";

export type TableRow = {
  /** Unique row key. */
  key: string;
  /** The student's own word id (vocabulary_words), if they have one. */
  wordId: string | null;
  /** The level word id (A1/A2/B1 lists), if the row comes from a level list. */
  levelWordId: string | null;
  head: string;
  /** Small line under the German word, e.g. the plural or the form the student saved. */
  sub: string | null;
  translations: Record<string, string>;
  /** Example sentences: "de" = German, other keys = its translation. */
  examples: Record<string, string>;
  from: { label: string; href?: string } | null;
  /** Review step 0–5, or null if not started yet. */
  box: number | null;
  starred: boolean;
  due: boolean;
  removable: boolean;
};

export type { Column, ColumnId } from "./columns";

const STATUS_LABEL = { new: "New", learning: "Learning", learned: "Learned" } as const;

function Progress({ box }: { box: number | null }) {
  if (box === null) return <span className="text-[13px] text-subtle-foreground">Not started</span>;
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
      className="grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 lg:size-9"
    >
      {children}
    </button>
  );
}

const WIDTH: Record<string, string> = {
  meaning: "minmax(0,1fr)",
  example: "minmax(0,1.5fr)",
  from: "minmax(0,0.9fr)",
  progress: "130px",
};

const CHANGE = "vocab-columns-change";
// Fallback when the browser blocks storage (private mode): remembered until the page reloads.
const memory = new Map<string, string>();
function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

/** Which columns are shown, remembered per list in this browser. */
export function useColumns(storageKey: string, columns: Column[], defaults: ColumnId[]) {
  const raw = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      window.addEventListener(CHANGE, onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(CHANGE, onChange);
      };
    },
    () => readStored(storageKey),
    () => null,
  );
  let shown: ColumnId[] = defaults;
  try {
    const saved = raw ? JSON.parse(raw) : null;
    if (Array.isArray(saved)) shown = saved.filter((id): id is ColumnId => columns.some((c) => c.id === id));
  } catch {
    // Broken value: use the defaults.
  }
  function toggle(id: ColumnId) {
    const next = shown.includes(id) ? shown.filter((c) => c !== id) : [...shown, id];
    memory.set(storageKey, JSON.stringify(next));
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Not saved; nothing else to do.
    }
    window.dispatchEvent(new Event(CHANGE));
  }
  return { shown: columns.filter((c) => shown.includes(c.id)), isShown: (id: ColumnId) => shown.includes(id), toggle };
}

/** "Columns" button with a checkbox per column. */
export function ColumnPicker({
  columns,
  isShown,
  toggle,
}: {
  columns: Column[];
  isShown: (id: ColumnId) => boolean;
  toggle: (id: ColumnId) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Choose which columns to show"
          title="Choose columns"
          className="grid size-11 shrink-0 place-items-center rounded-xl border border-input bg-background text-muted-foreground transition-colors hover:text-foreground focus-visible:border-gold-ink focus-visible:outline-none"
        >
          <ListFilter className="size-5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <p className="px-2 pt-1 pb-2 text-[13px] text-muted-foreground">Show in the table</p>
        <ul className="grid gap-0.5">
          <li className="flex h-10 items-center gap-3 rounded-lg px-2 text-sm text-subtle-foreground">
            <span className="grid size-5 place-items-center rounded-md bg-muted">
              <Check className="size-3.5" aria-hidden />
            </span>
            German word (always)
          </li>
          {columns.map((c) => {
            const on = isShown(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(c.id)}
                  className="flex h-10 w-full items-center gap-3 rounded-lg px-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span
                    className={cn(
                      "grid size-5 place-items-center rounded-md border border-border",
                      on && "border-transparent bg-brand-gradient text-white",
                    )}
                  >
                    {on && <Check className="size-3.5" aria-hidden />}
                  </span>
                  {c.label}
                </button>
              </li>
            );
          })}
        </ul>
        <Link
          href="/dashboard/account"
          className="mt-1 flex h-10 items-center rounded-lg border-t border-border px-2 pt-1 text-[13px] font-semibold text-gold-ink hover:underline"
        >
          Change my meaning languages
        </Link>
      </PopoverContent>
    </Popover>
  );
}

function Example({ code, text }: { code: string; text: string | undefined }) {
  if (!text) return <span className="text-subtle-foreground">—</span>;
  const props = textProps(code);
  return (
    <span
      lang={code}
      dir={props.dir}
      title={text}
      className={cn("line-clamp-2", props.className, code === "de" && "text-foreground/90")}
    >
      {text}
    </span>
  );
}

/** The word table: German word, the chosen columns, and listen / mark / remove buttons. */
export function VocabTable({ rows, columns }: { rows: TableRow[]; columns: Column[] }) {
  const router = useRouter();
  const [starred, setStarred] = useState(() => new Map(rows.map((r) => [r.key, r.starred])));
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();

  function toggleStar(r: TableRow) {
    const next = !(starred.get(r.key) ?? r.starred);
    setStarred((m) => new Map(m).set(r.key, next));
    setError(null);
    startBusy(async () => {
      const result = r.levelWordId
        ? await setLevelWordStarred(r.levelWordId, next)
        : await setWordStarred(r.wordId, next);
      if ("error" in result) {
        setStarred((m) => new Map(m).set(r.key, !next));
        setError(result.error);
      } else if (r.levelWordId && !r.wordId) router.refresh();
    });
  }

  function remove(r: TableRow) {
    if (!r.wordId) return;
    setError(null);
    startBusy(async () => {
      const result = await removeVocabularyWord(r.wordId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setRemoved((s) => new Set(s).add(r.key));
      router.refresh();
    });
  }

  const visible = rows.filter((r) => !removed.has(r.key));
  const template = [
    "minmax(0,1.1fr)",
    ...columns.map((c) => WIDTH[c.id.split(":")[0]]),
    "auto",
  ].join(" ");

  return (
    <div>
      {error && (
        <p className="border-b border-border px-4 py-3 text-sm text-destructive sm:px-6" role="alert">
          {error}
        </p>
      )}
      <div
        style={{ "--cols": template } as React.CSSProperties}
        className="hidden gap-4 border-b border-border bg-ink/40 px-6 py-3 text-[13px] font-semibold text-subtle-foreground lg:grid lg:[grid-template-columns:var(--cols)]"
      >
        <span>German</span>
        {columns.map((c) => (
          <span key={c.id}>{c.label.replace(/ meaning$/, "")}</span>
        ))}
        <span className="w-[120px] text-right">
          <span className="sr-only">Actions</span>
        </span>
      </div>
      <ul className="divide-y divide-border">
        {visible.map((r) => {
          const isStarred = starred.get(r.key) ?? r.starred;
          return (
            <li
              key={r.key}
              style={{ "--cols": template } as React.CSSProperties}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-4 transition-colors hover:bg-muted/40 sm:px-6 lg:gap-4 lg:py-3 lg:[grid-template-columns:var(--cols)]"
            >
              <div className="min-w-0">
                <p lang="de" className="truncate text-[15px] font-semibold">
                  {r.head}
                </p>
                {(r.sub || r.due) && (
                  <p className="text-[13px] text-subtle-foreground">
                    {r.sub && <span lang="de">{r.sub}</span>}
                    {r.sub && r.due && " · "}
                    {r.due && <span className="font-medium text-gold-ink">Due today</span>}
                  </p>
                )}
              </div>

              {columns.map((c) => {
                const [kind, code] = c.id.split(":");
                return (
                  <div
                    key={c.id}
                    className={cn(
                      // Phones and tablets: one labelled line per column. Wide screens: a table cell.
                      "col-span-2 grid min-w-0 grid-cols-[96px_minmax(0,1fr)] items-baseline gap-3 lg:col-span-1 lg:block",
                      kind === "meaning" && "text-[15px] text-muted-foreground",
                      (kind === "example" || kind === "from") && "text-sm text-muted-foreground",
                    )}
                  >
                    <span className="text-[12px] font-semibold text-subtle-foreground lg:hidden">
                      {c.label.replace(/ meaning$/, "")}
                    </span>
                    {kind === "meaning" ? (
                      r.translations[code] ? (
                        <Meaning code={code as LanguageCode} text={r.translations[code]} />
                      ) : (
                        <span className="text-sm text-subtle-foreground">—</span>
                      )
                    ) : kind === "example" ? (
                      <Example code={code} text={r.examples[code]} />
                    ) : kind === "from" ? (
                      r.from?.href ? (
                        <Link
                          href={r.from.href}
                          lang="de"
                          className="truncate underline-offset-4 hover:text-foreground hover:underline"
                        >
                          {r.from.label}
                        </Link>
                      ) : (
                        <span lang="de">{r.from?.label ?? "—"}</span>
                      )
                    ) : (
                      <Progress box={r.box} />
                    )}
                  </div>
                );
              })}

              <div className="col-start-2 row-start-1 flex justify-end lg:col-start-auto lg:row-start-auto lg:w-[120px]">
                <IconButton label={`Listen to ${r.head}`} onClick={() => speakGerman(r.head)}>
                  <Volume2 className="size-[18px]" aria-hidden />
                </IconButton>
                <IconButton
                  label={isStarred ? `Unmark ${r.head}` : `Mark ${r.head}`}
                  pressed={isStarred}
                  onClick={() => toggleStar(r)}
                >
                  <Star className={cn("size-[18px]", isStarred && "fill-gold-ink text-gold-ink")} aria-hidden />
                </IconButton>
                {r.removable && (
                  <IconButton label={`Remove ${r.head}`} onClick={() => remove(r)} disabled={busy}>
                    <Trash2 className="size-[18px]" aria-hidden />
                  </IconButton>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Toolbar (tabs, search, Columns button) and the table, sharing the chosen columns. */
export function VocabTableWithColumns({
  rows,
  columns,
  defaults,
  storageKey,
  tabs,
  search,
  empty,
}: {
  rows: TableRow[];
  columns: Column[];
  defaults: ColumnId[];
  storageKey: string;
  tabs: React.ReactNode;
  search: React.ReactNode;
  /** Shown instead of the table when there are no rows. */
  empty: React.ReactNode;
}) {
  const { shown, isShown, toggle } = useColumns(storageKey, columns, defaults);
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        {tabs}
        <div className="flex w-full gap-2 lg:w-auto">
          {search}
          <ColumnPicker columns={columns} isShown={isShown} toggle={toggle} />
        </div>
      </div>
      {rows.length === 0 ? empty : <VocabTable key={rows.map((r) => r.key).join()} rows={rows} columns={shown} />}
    </>
  );
}
