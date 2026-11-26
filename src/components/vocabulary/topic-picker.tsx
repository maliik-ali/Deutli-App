"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";

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
 * One slim row for choosing a topic. It opens a plain list under the row, as wide as the row:
 * the German name, its meaning, and how many words are started.
 */
export function TopicPicker({ items }: { items: TopicItem[] }) {
  const [open, setOpen] = useState(false);
  const current = items.find((t) => t.active) ?? items[0];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex min-h-11 w-full max-w-md items-center gap-2 rounded-xl border border-border bg-card px-4 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="text-muted-foreground">Topic</span>
          <span lang={current.name ? "de" : undefined} className="min-w-0 flex-1 truncate font-semibold">{current.name ?? "All topics"}</span>
          <span className="text-[12px] tabular-nums text-subtle-foreground">{current.started}/{current.total}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={16}
        className="max-h-[min(22rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] max-w-md overflow-y-auto p-1.5"
      >
        <ul>
          {items.map((t) => (
            <li key={t.key}>
              <Link
                href={t.href}
                onClick={() => setOpen(false)}
                aria-current={t.active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  t.active ? "bg-gold-soft" : "hover:bg-muted",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span lang={t.name ? "de" : undefined} className={cn("block truncate", t.active ? "font-semibold" : "font-medium")}>{t.name ?? "All topics"}</span>
                  {t.meaning && <span {...textProps(t.meaning.lang)} className={cn("block truncate text-[12px] text-muted-foreground", textProps(t.meaning.lang).className)}>{t.meaning.text}</span>}
                </span>
                <span className={cn("text-[12px] tabular-nums", t.total > 0 && t.started >= t.total ? "text-success" : "text-subtle-foreground")}>{t.started}/{t.total}</span>
                {t.active && <Check className="size-4 shrink-0 text-gold-ink" aria-hidden />}
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
