"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, Volume2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { LanguageCode } from "@/lib/languages";
import { cn } from "@/lib/utils";
import type { VerbItem } from "@/lib/verbs/game";
import { Meaning } from "./meanings";
import { speakGerman } from "./speak";

const PAGE = 50;
type Filter = "all" | "prep" | "dat" | "akk" | "weak";

/** The verbs list: search, a few filters, and a tap on a verb shows its example sentence. */
export function VerbList({ verbs, languages }: { verbs: VerbItem[]; languages: LanguageCode[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);
  const hasWeak = verbs.some((v) => v.wrong > v.right);

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "prep", label: "With a preposition" },
    { id: "dat", label: "Dative" },
    { id: "akk", label: "Accusative" },
    ...(hasWeak ? [{ id: "weak" as const, label: "Need practice" }] : []),
  ];

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return verbs.filter((v) => {
      if (filter === "prep" && !v.preposition) return false;
      if (filter === "dat" && !(v.verbCase ?? "").includes("Dat")) return false;
      if (filter === "akk" && !(v.verbCase ?? "").includes("Akk")) return false;
      if (filter === "weak" && !(v.wrong > v.right)) return false;
      if (!needle) return true;
      return v.german.toLowerCase().includes(needle) || Object.values(v.translations).some((t) => t.toLowerCase().includes(needle));
    });
  }, [verbs, q, filter]);

  return (
    <div className="grid gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} placeholder="Search a verb or its meaning" aria-label="Search verbs" className="h-11 rounded-xl pl-10 text-[15px]" />
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter verbs">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => { setFilter(f.id); setShown(PAGE); }}
            aria-pressed={filter === f.id}
            className={cn("h-11 shrink-0 rounded-full border px-4 text-[14px] font-medium transition-colors", filter === f.id ? "border-gold-ink bg-gold-soft text-foreground" : "border-border bg-card text-muted-foreground hover:border-gold-ink/60")}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="text-[13px] text-muted-foreground" aria-live="polite">{list.length} {list.length === 1 ? "verb" : "verbs"}</p>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted-foreground">No verb matches. Try another word or filter.</p>
      ) : (
        <ul className="grid gap-2">
          {list.slice(0, shown).map((v) => {
            const isOpen = open === v.id;
            const code = languages.find((c) => v.translations[c]) ?? ("en" as LanguageCode);
            return (
              <li key={v.id} className="rounded-2xl border border-border bg-card">
                <div className="flex items-start gap-2 p-3 sm:p-4">
                  <button type="button" onClick={() => speakGerman(v.german)} aria-label={`Listen to ${v.german}`} className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted hover:bg-gold-soft hover:text-gold-ink">
                    <Volume2 className="size-5" aria-hidden />
                  </button>
                  <button type="button" onClick={() => setOpen(isOpen ? null : v.id)} aria-expanded={isOpen} className="grid min-w-0 flex-1 gap-1 text-left">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span lang="de" className="text-[17px] font-bold">{v.german}</span>
                      {v.preposition && <span lang="de" className="rounded-full bg-gold-soft px-2.5 py-0.5 text-[12px] font-semibold text-gold-ink">{v.preposition}{v.verbCase ? ` + ${v.verbCase}` : ""}</span>}
                      {!v.preposition && v.verbCase && <span className="rounded-full bg-muted px-2.5 py-0.5 text-[12px] font-semibold text-muted-foreground">{v.verbCase}</span>}
                    </span>
                    <Meaning code={code} text={v.translations[code]} className="text-[15px] text-muted-foreground" />
                    <span lang="de" className="text-[14px] text-foreground/90">{[v.praesens, v.praeteritum, v.perfekt].filter(Boolean).join(" · ")}</span>
                  </button>
                  <ChevronDown className={cn("mt-3 size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} aria-hidden />
                </div>
                {isOpen && v.exampleDe && (
                  <div className="border-t border-border px-4 py-3 text-[14px]">
                    <p lang="de">{v.exampleDe}</p>
                    {v.exampleTranslations[code] && <p className="mt-1"><Meaning code={code} text={v.exampleTranslations[code]} className="text-muted-foreground" /></p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {list.length > shown && (
        <button type="button" onClick={() => setShown((s) => s + PAGE)} className="mx-auto h-11 rounded-full border border-border bg-card px-6 text-[14px] font-semibold hover:border-gold-ink/60">
          Show {Math.min(PAGE, list.length - shown)} more
        </button>
      )}
    </div>
  );
}
