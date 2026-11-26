"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { textProps } from "@/lib/languages";
import { cn } from "@/lib/utils";

export type TopicItem = {
  key: string;
  /** German topic name, or null for "All topics". */
  name: string | null;
  /** The topic name in the student's own language, if we have one. */
  meaning: { text: string; lang: string } | null;
  started: number;
  total: number;
  href: string;
  active: boolean;
};

/**
 * One slim row for choosing a topic. It opens a plain list under the row, as wide as the row.
 * The row shows the new choice at once and a spinner while the word list loads.
 */
export function TopicPicker({ items }: { items: TopicItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<string | null>(null);
  const current = items.find((t) => t.active) ?? items[0];
  const shown = pending ? (items.find((t) => t.key === picked) ?? current) : current;

  function pick(t: TopicItem) {
    setOpen(false);
    if (t.key === current.key) return;
    setPicked(t.key);
    start(() => router.push(t.href, { scroll: false }));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-busy={pending}
          className={cn(
            "flex min-h-11 w-full max-w-md items-center gap-2 rounded-xl border bg-card px-4 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
            open ? "border-gold-ink" : "border-border",
          )}
        >
          <span className="text-muted-foreground">Topic</span>
          <span lang={shown.name ? "de" : undefined} className="min-w-0 flex-1 truncate font-semibold">{shown.name ?? "All topics"}</span>
          <span className="text-[12px] tabular-nums text-subtle-foreground">{shown.started}/{shown.total}</span>
          {pending ? <Loader2 className="size-4 shrink-0 animate-spin text-gold-ink" aria-hidden /> : <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={16}
        className="max-h-[min(22rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] max-w-md overflow-y-auto border-border-strong bg-card p-1.5"
      >
        <ul role="listbox" aria-label="Topics" className="grid gap-0.5">
          {items.map((t) => {
            const on = t.key === current.key;
            return (
              <li key={t.key} role="option" aria-selected={on}>
                <button
                  type="button"
                  onClick={() => pick(t)}
                  className={cn(
                    "relative flex min-h-11 w-full items-center gap-3 rounded-lg py-2 pr-3 pl-4 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                    on ? "bg-gold-ink/15 ring-1 ring-gold-ink/50 ring-inset" : "hover:bg-muted",
                  )}
                >
                  {on && <span aria-hidden className="absolute top-2 bottom-2 left-1.5 w-1 rounded-full bg-gold-ink" />}
                  <span className="min-w-0 flex-1">
                    <span lang={t.name ? "de" : undefined} className={cn("block truncate", on ? "font-bold text-gold-ink" : "font-medium")}>{t.name ?? "All topics"}</span>
                    {t.meaning && <span {...textProps(t.meaning.lang)} className={cn("block truncate text-[12px] text-muted-foreground", textProps(t.meaning.lang).className)}>{t.meaning.text}</span>}
                  </span>
                  <span className={cn("text-[12px] tabular-nums", t.total > 0 && t.started >= t.total ? "text-success" : "text-subtle-foreground")}>{t.started}/{t.total}</span>
                  {on && <Check className="size-4 shrink-0 text-gold-ink" strokeWidth={3} aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
