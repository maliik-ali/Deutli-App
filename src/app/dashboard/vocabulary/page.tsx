import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, ChevronLeft, ChevronRight, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WordTable, type TableWord } from "@/components/vocabulary/word-table";
import { requireUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";
import { getVocabulary, inSet, type VocabSet } from "@/lib/vocabulary/data";
import { LEARNED_BOX } from "@/lib/vocabulary/srs";

export const metadata: Metadata = { title: "Vocabulary" };

const PAGE_SIZE = 25;
const TABS: { set: VocabSet; label: string }[] = [
  { set: "all", label: "All words" },
  { set: "due", label: "Due today" },
  { set: "marked", label: "Marked" },
  { set: "learned", label: "Learned" },
];

function href(params: { set?: VocabSet; q?: string; page?: number }) {
  const sp = new URLSearchParams();
  if (params.set && params.set !== "all") sp.set("set", params.set);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return `/dashboard/vocabulary${s ? `?${s}` : ""}`;
}

export default async function VocabularyPage(props: PageProps<"/dashboard/vocabulary">) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const set = (TABS.find((t) => t.set === sp.set)?.set ?? "all") as VocabSet;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const { words, today, failed } = await getVocabulary(user.id);

  const counts = {
    all: words.length,
    due: words.filter((w) => inSet(w, "due", today)).length,
    marked: words.filter((w) => w.starred).length,
    learned: words.filter((w) => w.box >= LEARNED_BOX).length,
  };
  const needle = q.toLowerCase();
  const filtered = words
    .filter((w) => inSet(w, set, today))
    .filter(
      (w) =>
        !needle ||
        w.word.toLowerCase().includes(needle) ||
        (w.dictionaryForm ?? "").toLowerCase().includes(needle) ||
        Object.values(w.translations).some((t) => t.toLowerCase().includes(needle)),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(sp.page) || 1));
  const shown: TableWord[] = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((w) => ({
    id: w.id,
    word: w.word,
    dictionaryForm: w.dictionaryForm,
    translations: w.translations,
    starred: w.starred,
    box: w.box,
    due: w.dueOn <= today,
    savedAt: w.savedAt,
    track: w.track,
  }));
  const from = filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(filtered.length, page * PAGE_SIZE);
  const practiseSet: VocabSet = counts.due > 0 ? "due" : "all";

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-2">
          <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Vocabulary</h1>
          <p className="text-[15px] text-muted-foreground">
            Words you saved in Daily Practice. Practise them a little every day so they stick.
          </p>
        </div>
        {counts.all > 0 && (
          <div className="flex flex-wrap gap-2">
            {counts.marked > 0 && (
              <Button asChild variant="outline">
                <Link href="/vocabulary/practice?set=marked">Practise marked</Link>
              </Button>
            )}
            <Button asChild>
              <Link href={`/vocabulary/practice?set=${practiseSet}`}>
                <BookOpenCheck aria-hidden />
                {counts.due > 0 ? `Practise ${Math.min(counts.due, 10)} due words` : "Practise words"}
              </Link>
            </Button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        {[
          { label: "Saved words", value: counts.all },
          { label: "Due today", value: counts.due, accent: counts.due > 0 },
          { label: "Learned", value: counts.learned },
        ].map((s) => (
          <Card key={s.label} className="gap-1 p-4 sm:p-6">
            <span className="text-[13px] text-muted-foreground">{s.label}</span>
            <span
              className={cn(
                "font-heading text-2xl font-extrabold tabular-nums sm:text-[32px]",
                s.accent && "text-gold-ink",
              )}
            >
              {s.value}
            </span>
          </Card>
        ))}
      </div>

      {failed ? (
        <Card>
          <p className="text-destructive" role="alert">
            Your words couldn&apos;t load. Reload the page and try again.
          </p>
        </Card>
      ) : counts.all === 0 ? (
        <Card className="items-center py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-gold-soft text-gold-ink">
            <Sparkles className="size-7" aria-hidden />
          </span>
          <div className="grid gap-2">
            <h2 className="text-lg font-bold">No saved words yet</h2>
            <p className="max-w-sm text-muted-foreground">
              Open a text in Daily Practice and select a word you don&apos;t know. Tap “Save word” and it appears here
              with its meaning.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/daily-practice">Go to Daily Practice</Link>
          </Button>
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:p-6 md:flex-row md:items-center md:justify-between">
            <nav aria-label="Word lists" className="-mx-1 flex gap-1 overflow-x-auto px-1">
              {TABS.map((t) => {
                const active = t.set === set;
                return (
                  <Link
                    key={t.set}
                    href={href({ set: t.set, q })}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
                      active
                        ? "bg-gold-soft font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {t.label}
                    <span
                      className={cn(
                        "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold",
                        active ? "bg-gold text-white" : "bg-ink text-ink-foreground",
                      )}
                    >
                      {counts[t.set]}
                    </span>
                  </Link>
                );
              })}
            </nav>
            <form role="search" className="relative w-full md:w-72">
              {set !== "all" && <input type="hidden" name="set" value={set} />}
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <label htmlFor="vocab-search" className="sr-only">
                Search your words
              </label>
              <input
                id="vocab-search"
                name="q"
                defaultValue={q}
                placeholder="Search a word or meaning"
                className="h-11 w-full rounded-xl border border-input bg-background pr-3 pl-9 text-[15px] outline-none placeholder:text-muted-foreground/70 focus-visible:border-gold-ink"
              />
            </form>
          </div>

          {shown.length === 0 ? (
            <p className="px-6 py-12 text-center text-muted-foreground">
              {q ? (
                <>
                  No word matches “{q}”.{" "}
                  <Link href={href({ set })} className="font-semibold text-gold-ink">
                    Clear search
                  </Link>
                </>
              ) : set === "due" ? (
                "Nothing to review today. Well done!"
              ) : set === "marked" ? (
                "No marked words. Tap the ☆ next to a word to mark it."
              ) : (
                "No learned words yet. Practise your words to move them here."
              )}
            </p>
          ) : (
            <WordTable key={`${set}-${q}-${page}`} words={shown} languages={user.languages} />
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:px-6">
            <span>
              {from}–{to} of {filtered.length}
            </span>
            <div className="flex gap-1">
              {page > 1 ? (
                <Button asChild variant="ghost" size="icon">
                  <Link href={href({ set, q, page: page - 1 })} aria-label="Previous page">
                    <ChevronLeft aria-hidden />
                  </Link>
                </Button>
              ) : (
                <Button variant="ghost" size="icon" disabled aria-label="Previous page">
                  <ChevronLeft aria-hidden />
                </Button>
              )}
              {page < pages ? (
                <Button asChild variant="ghost" size="icon">
                  <Link href={href({ set, q, page: page + 1 })} aria-label="Next page">
                    <ChevronRight aria-hidden />
                  </Link>
                </Button>
              ) : (
                <Button variant="ghost" size="icon" disabled aria-label="Next page">
                  <ChevronRight aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
    </main>
  );
}
