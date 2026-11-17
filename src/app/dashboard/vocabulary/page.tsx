import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, ChevronLeft, ChevronRight, GraduationCap, Search, Sparkles, Trophy } from "lucide-react";

import { BorderBeam } from "@/components/magicui/border-beam";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildColumns, VocabTableWithColumns, type ColumnId, type TableRow } from "@/components/vocabulary/vocab-table";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { getVocabulary, inSet, type VocabSet } from "@/lib/vocabulary/data";
import {
  getLevelList,
  LESSON_SIZE,
  LEVELS,
  levelLabel,
  levelStatus,
  meaningLanguages,
  nextLesson,
  toLevelParam,
  type Level,
  type LevelWord,
} from "@/lib/vocabulary/levels";
import { LEARNED_BOX } from "@/lib/vocabulary/srs";

export const metadata: Metadata = { title: "Vocabulary" };

type Params = { list?: Level | null; set?: string; topic?: string | null; q?: string; page?: number };

function href(p: Params) {
  const sp = new URLSearchParams();
  if (p.list) sp.set("list", p.list);
  if (p.set) sp.set("set", p.set);
  if (p.topic) sp.set("topic", p.topic);
  if (p.q) sp.set("q", p.q);
  if (p.page && p.page > 1) sp.set("page", String(p.page));
  const s = sp.toString();
  return `/dashboard/vocabulary${s ? `?${s}` : ""}`;
}

function practiceHref(p: { list?: Level | null; set: string; topic?: string | null }) {
  const sp = new URLSearchParams({ set: p.set });
  if (p.list) sp.set("list", p.list);
  if (p.topic) sp.set("topic", p.topic);
  return `/vocabulary/practice?${sp}`;
}

/** How many words each level list has (to show "Soon" for empty ones). */
async function levelCounts(): Promise<Record<Level, number>> {
  const supabase = await createClient();
  const results = await Promise.all(
    LEVELS.map((l) => supabase.from("level_words").select("id", { count: "exact", head: true }).eq("level", l)),
  );
  return Object.fromEntries(LEVELS.map((l, i) => [l, results[i].count ?? 0])) as Record<Level, number>;
}

function Tabs({ tabs }: { tabs: { key: string; label: string; count: number; href: string; active: boolean }[] }) {
  return (
    <nav aria-label="Word lists" className="-mx-1 flex gap-1 overflow-x-auto px-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
            t.active
              ? "bg-gold-soft font-semibold text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {t.label}
          <span
            className={cn(
              "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold",
              t.active ? "bg-gold text-white" : "bg-ink text-ink-foreground",
            )}
          >
            {t.count}
          </span>
        </Link>
      ))}
    </nav>
  );
}

function SearchBox({ q, hidden }: { q: string; hidden: Record<string, string | undefined> }) {
  return (
    <form role="search" className="relative w-full lg:w-64">
      {Object.entries(hidden).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <label htmlFor="vocab-search" className="sr-only">
        Search words
      </label>
      <input
        id="vocab-search"
        name="q"
        defaultValue={q}
        placeholder="Search a word or meaning"
        className="h-11 w-full rounded-xl border border-input bg-background pr-3 pl-9 text-[15px] outline-none placeholder:text-muted-foreground/70 focus-visible:border-gold-ink"
      />
    </form>
  );
}

function Pager({ from, to, total, prev, next }: { from: number; to: number; total: number; prev?: string; next?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:px-6">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex gap-1">
        {[
          { href: prev, label: "Previous page", icon: ChevronLeft },
          { href: next, label: "Next page", icon: ChevronRight },
        ].map(({ href: h, label, icon: Icon }) =>
          h ? (
            <Button key={label} asChild variant="ghost" size="icon">
              <Link href={h} aria-label={label}>
                <Icon aria-hidden />
              </Link>
            </Button>
          ) : (
            <Button key={label} variant="ghost" size="icon" disabled aria-label={label}>
              <Icon aria-hidden />
            </Button>
          ),
        )}
      </div>
    </div>
  );
}

function Stats({ items }: { items: { label: string; value: number; accent?: boolean }[] }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-6">
      {items.map((s) => (
        <Card key={s.label} className="gap-1 p-4 sm:p-6">
          <span className="text-[13px] text-muted-foreground">{s.label}</span>
          <span
            className={cn("font-heading text-2xl font-extrabold tabular-nums sm:text-[32px]", s.accent && "text-gold-ink")}
          >
            {s.value.toLocaleString("en-US")}
          </span>
        </Card>
      ))}
    </div>
  );
}

export default async function VocabularyPage(props: PageProps<"/dashboard/vocabulary">) {
  const user = await requireUser(["student", "academy_admin", "super_admin"]);
  const sp = await props.searchParams;
  const list = toLevelParam(sp.list);
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const pageParam = Number(sp.page) || 1;
  const counts = await levelCounts();

  const switcher = (
    <nav aria-label="Choose a word list" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {[{ key: null as Level | null, label: "My words", sub: "Saved while reading" }, ...LEVELS.map((l) => ({ key: l, label: `${levelLabel(l)} words`, sub: counts[l] ? `${counts[l]} words` : "Coming soon" }))].map(
        (item) => {
          const active = item.key === list;
          const empty = item.key !== null && counts[item.key] === 0;
          return (
            <Link
              key={item.label}
              href={href({ list: item.key })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 shrink-0 flex-col justify-center rounded-2xl border px-4 py-2 transition-colors",
                active
                  ? "border-gold-ink bg-gold-soft"
                  : "border-border bg-card hover:border-gold-ink/60 hover:bg-muted",
                empty && !active && "opacity-60",
              )}
            >
              <span className="text-[15px] font-semibold">{item.label}</span>
              <span className="text-[12px] text-muted-foreground">{item.sub}</span>
            </Link>
          );
        },
      )}
    </nav>
  );

  if (list) {
    return (
      <LevelView
        level={list}
        userId={user.id}
        userLanguages={user.languages}
        sp={{ set: typeof sp.set === "string" ? sp.set : "", topic: typeof sp.topic === "string" ? sp.topic : null }}
        q={q}
        pageParam={pageParam}
        switcher={switcher}
        counts={counts}
      />
    );
  }

  // MY WORDS: words saved while reading in Improve Accent.
  const MY_PAGE = 25;
  const TABS: { set: VocabSet; label: string }[] = [
    { set: "all", label: "All words" },
    { set: "due", label: "Due today" },
    { set: "marked", label: "Marked" },
    { set: "learned", label: "Learned" },
  ];
  const set = (TABS.find((t) => t.set === sp.set)?.set ?? "all") as VocabSet;
  const vocab = await getVocabulary(user.id);
  const words = vocab.words.filter((w) => w.source !== "level");
  const today = vocab.today;
  const c = {
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
  const pages = Math.max(1, Math.ceil(filtered.length / MY_PAGE));
  const page = Math.min(pages, Math.max(1, pageParam));
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });
  const rows: TableRow[] = filtered.slice((page - 1) * MY_PAGE, page * MY_PAGE).map((w) => {
    const head = w.dictionaryForm ?? w.word;
    const showSaved = w.dictionaryForm && w.dictionaryForm.toLowerCase().split(" ").pop() !== w.word.toLowerCase();
    return {
      key: w.id,
      wordId: w.id,
      levelWordId: null,
      head,
      sub: w.dueOn <= today ? (showSaved ? w.word : null) : `${showSaved ? `${w.word} · ` : ""}Saved ${date.format(new Date(w.savedAt))}`,
      translations: w.translations,
      examples: w.context ? { de: w.context } : ({} as Record<string, string>),
      from: w.track ? { label: w.track.title, href: `/practice/${w.track.id}` } : null,
      box: w.box,
      starred: w.starred,
      due: w.dueOn <= today,
      removable: true,
    };
  });
  const columns = buildColumns({ languages: user.languages, exampleLanguages: ["de"], fromLabel: "From" });
  const defaults: ColumnId[] = [...user.languages.map((l) => `meaning:${l}` as ColumnId), "from", "progress"];
  const from = filtered.length ? (page - 1) * MY_PAGE + 1 : 0;
  const practiseSet: VocabSet = c.due > 0 ? "due" : "all";

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-2">
          <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Vocabulary</h1>
          <p className="text-[15px] text-muted-foreground">
            Words you saved in Improve Accent, plus the A1, A2 and B1 word lists. Practise a little every day so they
            stick.
          </p>
        </div>
        {c.all > 0 && (
          <div className="flex flex-wrap gap-2">
            {c.marked > 0 && (
              <Button asChild variant="outline">
                <Link href={practiceHref({ set: "marked" })}>Practise marked</Link>
              </Button>
            )}
            <Button asChild>
              <Link href={practiceHref({ set: practiseSet })}>
                <BookOpenCheck aria-hidden />
                {c.due > 0 ? `Practise ${Math.min(c.due, 10)} due words` : "Practise words"}
              </Link>
            </Button>
          </div>
        )}
      </header>

      {switcher}

      <Stats
        items={[
          { label: "Saved words", value: c.all },
          { label: "Due today", value: c.due, accent: c.due > 0 },
          { label: "Learned", value: c.learned },
        ]}
      />

      {vocab.failed ? (
        <Card>
          <p className="text-destructive" role="alert">
            Your words couldn&apos;t load. Reload the page and try again.
          </p>
        </Card>
      ) : c.all === 0 ? (
        <Card className="items-center py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-gold-soft text-gold-ink">
            <Sparkles className="size-7" aria-hidden />
          </span>
          <div className="grid gap-2">
            <h2 className="text-lg font-bold">No saved words yet</h2>
            <p className="max-w-sm text-muted-foreground">
              Open a text in Improve Accent and select a word you don&apos;t know. Tap “Save word” and it appears here
              with its meaning. Or learn the A1 words above.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/daily-practice">Go to Improve Accent</Link>
          </Button>
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden p-0">
          <VocabTableWithColumns
            rows={rows}
            columns={columns}
            defaults={defaults}
            storageKey="vocab-columns:mine"
            tabs={
              <Tabs
                tabs={TABS.map((t) => ({
                  key: t.set,
                  label: t.label,
                  count: c[t.set],
                  href: href({ set: t.set === "all" ? undefined : t.set, q }),
                  active: t.set === set,
                }))}
              />
            }
            search={<SearchBox q={q} hidden={{ set: set === "all" ? undefined : set }} />}
            empty={
              <p className="px-6 py-12 text-center text-muted-foreground">
                {q ? (
                  <>
                    No word matches “{q}”.{" "}
                    <Link href={href({ set: set === "all" ? undefined : set })} className="font-semibold text-gold-ink">
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
            }
          />
          <Pager
            from={from}
            to={Math.min(filtered.length, page * MY_PAGE)}
            total={filtered.length}
            prev={page > 1 ? href({ set: set === "all" ? undefined : set, q, page: page - 1 }) : undefined}
            next={page < pages ? href({ set: set === "all" ? undefined : set, q, page: page + 1 }) : undefined}
          />
        </Card>
      )}
    </main>
  );
}

// LEVEL LISTS (A1 / A2 / B1) ---------------------------------------------------

const LEVEL_PAGE = 50;
type LevelSet = "marked" | "all" | "due" | "learning" | "learned";

async function LevelView({
  level,
  userId,
  userLanguages,
  sp,
  q,
  pageParam,
  switcher,
  counts,
}: {
  counts: Record<Level, number>;
  level: Level;
  userId: string;
  userLanguages: Parameters<typeof meaningLanguages>[1];
  sp: { set: string; topic: string | null };
  q: string;
  pageParam: number;
  switcher: React.ReactNode;
}) {
  const data = await getLevelList(userId, level);
  const L = levelLabel(level);
  const today = data.today;
  const topic = data.topics.some((t) => t.name === sp.topic) ? sp.topic : null;
  const inTopic = data.words.filter((w) => !topic || w.topic === topic);

  const isIn = (w: LevelWord, s: LevelSet) => {
    if (s === "marked") return !!w.progress?.starred;
    if (s === "due") return !!w.progress && w.progress.dueOn <= today;
    if (s === "learning") return levelStatus(w) === "learning";
    if (s === "learned") return levelStatus(w) === "learned";
    return true;
  };
  const c = {
    marked: inTopic.filter((w) => isIn(w, "marked")).length,
    all: inTopic.length,
    due: inTopic.filter((w) => isIn(w, "due")).length,
    learning: inTopic.filter((w) => isIn(w, "learning")).length,
    learned: inTopic.filter((w) => isIn(w, "learned")).length,
  };
  // Marked words first if the student has any, otherwise the whole list (first 50).
  const SETS: LevelSet[] = ["marked", "all", "due", "learning", "learned"];
  const set: LevelSet = SETS.find((s) => s === sp.set) ?? (c.marked > 0 ? "marked" : "all");

  const needle = q.toLowerCase();
  const filtered = inTopic
    .filter((w) => isIn(w, set))
    .filter(
      (w) =>
        !needle ||
        w.head.toLowerCase().includes(needle) ||
        Object.values(w.translations).some((t) => t.toLowerCase().includes(needle)),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / LEVEL_PAGE));
  const page = Math.min(pages, Math.max(1, pageParam));
  const langs = meaningLanguages(data, userLanguages);

  const rows: TableRow[] = filtered.slice((page - 1) * LEVEL_PAGE, page * LEVEL_PAGE).map((w) => ({
    key: w.id,
    wordId: w.progress?.id ?? null,
    levelWordId: w.id,
    head: w.head,
    sub: w.plural ? `Plural: die ${w.plural}` : null,
    translations: w.translations,
    examples: w.examples,
    from: { label: w.topic },
    box: w.progress?.box ?? null,
    starred: w.progress?.starred ?? false,
    due: !!w.progress && w.progress.dueOn <= today,
    removable: false,
  }));
  const columns = buildColumns({
    languages: data.languages,
    exampleLanguages: data.exampleLanguages,
    fromLabel: "Topic",
  });
  const defaults: ColumnId[] = [...langs.map((l) => `meaning:${l}` as ColumnId), "progress"];

  const lesson = nextLesson(data, topic);
  const totalStarted = data.words.filter((w) => w.progress).length;
  const totalLearned = data.words.filter((w) => levelStatus(w) === "learned").length;
  const dueAll = data.words.filter((w) => w.progress && w.progress.dueOn <= today).length;
  const finished = data.words.length > 0 && totalStarted === data.words.length;
  const pct = data.words.length ? Math.round((totalStarted / data.words.length) * 100) : 0;
  const next = LEVELS[LEVELS.indexOf(level) + 1];
  const setParam = (s: LevelSet) => (s === (c.marked > 0 ? "marked" : "all") ? undefined : s);

  return (
    <main className="mx-auto grid max-w-[1240px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <header className="grid gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-[32px]">Vocabulary</h1>
        <p className="text-[15px] text-muted-foreground">
          The {L} word list. Learn {LESSON_SIZE} new words at a time; words you learned come back for review just before
          you forget them.
        </p>
      </header>

      {switcher}

      {data.failed ? (
        <Card>
          <p className="text-destructive" role="alert">
            The {L} words couldn&apos;t load. Reload the page and try again.
          </p>
        </Card>
      ) : data.words.length === 0 ? (
        <Card className="items-center py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-gold-soft text-gold-ink">
            <GraduationCap className="size-7" aria-hidden />
          </span>
          <div className="grid gap-2">
            <h2 className="text-lg font-bold">The {L} list is coming soon</h2>
            <p className="max-w-sm text-muted-foreground">
              We&apos;re preparing the {L} words with Urdu and English meanings. Meanwhile, practise another level.
            </p>
          </div>
          <Button asChild>
            <Link href={href({ list: "a1" })}>Open A1 words</Link>
          </Button>
        </Card>
      ) : (
        <>
          {/* Continue learning: the featured card of this screen. */}
          <Card className="relative gap-5">
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] motion-reduce:hidden">
              <BorderBeam size={140} duration={9} colorFrom="#7161ff" colorTo="#cb3cff" borderWidth={1.5} />
            </div>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="grid gap-1">
                <p className="text-[13px] font-semibold text-gold-ink uppercase">
                  {finished ? `${L} complete` : totalStarted ? "Continue where you left off" : `Start ${L}`}
                </p>
                <h2 className="text-xl font-bold">
                  {finished ? (
                    <span className="inline-flex items-center gap-2">
                      <Trophy className="size-5 text-gold-ink" aria-hidden /> You&apos;ve learned every {L} word
                    </span>
                  ) : (
                    <>
                      Next: <span lang="de">{lesson[0]?.topic}</span> · {lesson.length} new{" "}
                      {lesson.length === 1 ? "word" : "words"}
                    </>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {totalStarted} of {data.words.length} words started · {totalLearned} learned
                  {dueAll > 0 && ` · ${dueAll} due for review`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {dueAll > 0 && (
                  <Button asChild variant={finished ? "default" : "outline"}>
                    <Link href={practiceHref({ list: level, set: "due" })}>Review {Math.min(dueAll, 10)} due</Link>
                  </Button>
                )}
                {finished ? (
                  next &&
                  counts[next] > 0 && (
                    <Button asChild variant={dueAll > 0 ? "outline" : "default"}>
                      <Link href={href({ list: next })}>Go to {levelLabel(next)}</Link>
                    </Button>
                  )
                ) : (
                  <Button asChild>
                    <Link href={practiceHref({ list: level, set: "learn", topic })}>
                      <BookOpenCheck aria-hidden /> Learn {lesson.length} new words
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-border"
              role="progressbar"
              aria-label={`${L} words started`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${pct}%` }} />
            </div>
          </Card>

          <section aria-label="Topics" className="grid gap-3">
            <h2 className="text-[15px] font-semibold text-muted-foreground">Topics</h2>
            <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {[{ name: null as string | null, total: data.words.length, started: totalStarted }, ...data.topics].map(
                (t) => {
                  const active = t.name === topic;
                  return (
                    <Link
                      key={t.name ?? "all"}
                      href={href({ list: level, topic: t.name })}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors",
                        active
                          ? "border-gold-ink bg-gold-soft font-semibold"
                          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <span lang="de">{t.name ?? "All topics"}</span>
                      <span className="text-[12px] tabular-nums text-subtle-foreground">
                        {t.started}/{t.total}
                      </span>
                    </Link>
                  );
                },
              )}
            </nav>
          </section>

          <Card className="gap-0 overflow-hidden p-0">
            <VocabTableWithColumns
              rows={rows}
              columns={columns}
              defaults={defaults}
              storageKey={`vocab-columns:${level}`}
              tabs={
                <Tabs
                  tabs={(
                    [
                      { s: "marked", label: "Marked" },
                      { s: "all", label: "All words" },
                      { s: "due", label: "Due today" },
                      { s: "learning", label: "Learning" },
                      { s: "learned", label: "Learned" },
                    ] as { s: LevelSet; label: string }[]
                  ).map((t) => ({
                    key: t.s,
                    label: t.label,
                    count: c[t.s],
                    href: href({ list: level, topic, set: setParam(t.s), q }),
                    active: t.s === set,
                  }))}
                />
              }
              search={
                <SearchBox
                  q={q}
                  hidden={{ list: level, topic: topic ?? undefined, set: setParam(set) }}
                />
              }
              empty={
                <p className="px-6 py-12 text-center text-muted-foreground">
                  {q ? (
                    <>
                      No word matches “{q}”.{" "}
                      <Link href={href({ list: level, topic, set: setParam(set) })} className="font-semibold text-gold-ink">
                        Clear search
                      </Link>
                    </>
                  ) : set === "due" ? (
                    "Nothing to review today. Well done!"
                  ) : set === "learning" ? (
                    "No words in progress. Tap “Learn new words” to start."
                  ) : set === "learned" ? (
                    "No learned words yet. Words move here after a few right answers on different days."
                  ) : (
                    "No marked words. Tap the ☆ next to a word to mark it."
                  )}
                </p>
              }
            />
            <Pager
              from={filtered.length ? (page - 1) * LEVEL_PAGE + 1 : 0}
              to={Math.min(filtered.length, page * LEVEL_PAGE)}
              total={filtered.length}
              prev={page > 1 ? href({ list: level, topic, set: setParam(set), q, page: page - 1 }) : undefined}
              next={page < pages ? href({ list: level, topic, set: setParam(set), q, page: page + 1 }) : undefined}
            />
          </Card>
        </>
      )}
    </main>
  );
}
