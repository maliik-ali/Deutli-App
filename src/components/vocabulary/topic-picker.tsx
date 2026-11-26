"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { ChevronDown, X } from "lucide-react";

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

const DESKTOP = "(min-width: 640px)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(DESKTOP);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const useIsDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP).matches, () => false);

function status(t: TopicItem) {
  if (t.total > 0 && t.started >= t.total) return "All started";
  return t.started > 0 ? "Continue" : "Start";
}

function Cards({ items, onPick }: { items: TopicItem[]; onPick: () => void }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {items.map((t) => {
        const pct = t.total ? Math.round((t.started / t.total) * 100) : 0;
        return (
          <li key={t.key} className={t.name === null ? "col-span-2 sm:col-span-3" : undefined}>
            <Link
              href={t.href}
              onClick={onPick}
              aria-current={t.active ? "page" : undefined}
              className={cn(
                "grid h-full min-h-11 content-start gap-1.5 rounded-xl border p-3 transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                t.active ? "border-gold-ink bg-gold-soft" : "border-border bg-card hover:bg-muted",
              )}
            >
              <span lang={t.name ? "de" : undefined} className="text-[14px] leading-snug font-semibold">{t.name ?? "All topics"}</span>
              {t.meaning && <span {...textProps(t.meaning.lang)} className={cn("text-[12px] text-muted-foreground", textProps(t.meaning.lang).className)}>{t.meaning.text}</span>}
              <span className="mt-1 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden>
                <span className="block h-full rounded-full bg-brand-gradient" style={{ width: `${pct}%` }} />
              </span>
              <span className="flex items-baseline justify-between gap-2 text-[12px] text-muted-foreground">
                <span className="tabular-nums">{t.started} of {t.total}</span>
                {t.name !== null && <span className={cn(t.started >= t.total && t.total > 0 && "text-success")}>{status(t)}</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * One slim row for choosing a topic. It opens a panel of topic cards (progress at a glance):
 * a popover on bigger screens, a bottom sheet on phones. The chosen topic can be cleared with one tap.
 */
export function TopicPicker({ items, allHref }: { items: TopicItem[]; allHref: string }) {
  const [open, setOpen] = useState(false);
  const desktop = useIsDesktop();
  const current = items.find((t) => t.active) ?? items[0];
  const chosen = current.name !== null;
  const trigger = (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      className="flex min-h-11 w-full max-w-md items-center gap-2 rounded-xl border border-border bg-card px-4 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span className="text-muted-foreground">Topic</span>
      <span lang={chosen ? "de" : undefined} className="min-w-0 flex-1 truncate font-semibold">{current.name ?? "All topics"}</span>
      <span className="text-[12px] tabular-nums text-subtle-foreground">{current.started}/{current.total}</span>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      {desktop ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent align="start" className="max-h-[70vh] w-[min(46rem,92vw)] overflow-y-auto p-4">
            <p className="mb-3 text-[15px] font-semibold">Choose a topic</p>
            <Cards items={items} onPick={() => setOpen(false)} />
          </PopoverContent>
        </Popover>
      ) : (
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
            <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-card p-4 pb-6 outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Dialog.Title className="font-heading text-[16px] font-bold">Choose a topic</Dialog.Title>
                <Dialog.Close className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring" aria-label="Close">
                  <X className="size-5" aria-hidden />
                </Dialog.Close>
              </div>
              <Dialog.Description className="sr-only">Pick a topic to show only its words.</Dialog.Description>
              <div className="overflow-y-auto">
                <Cards items={items} onPick={() => setOpen(false)} />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
      {chosen && (
        <Link href={allHref} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-gold-soft px-4 text-[13px] font-semibold text-gold-ink focus-visible:outline-2 focus-visible:outline-ring">
          Show all topics <X className="size-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
