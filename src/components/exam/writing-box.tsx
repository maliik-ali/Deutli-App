"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Clock, Mail } from "lucide-react";

import { countWords } from "@/lib/papers/template";
import { cn } from "@/lib/utils";

const SEEN_KEY = "deutli-writing-hint-seen";

/**
 * The email box of the writing part: a prompt-style card with chips and a word-count ring.
 * The first time a student reaches it, a slow purple light travels around the border so they
 * know where to write. It stops (for good) as soon as they tap into the box.
 */
export function WritingBox({ value, onChange, aim }: { value: string; onChange: (v: string) => void; aim: number }) {
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [startedEmpty] = useState(() => countWords(value) === 0);
  // Read once on the client (server renders without the hint, so nothing mismatches).
  const neverSeen = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return !localStorage.getItem(SEEN_KEY);
      } catch {
        return false; // storage blocked: no hint, nothing breaks
      }
    },
    () => false,
  );
  const hint = neverSeen && startedEmpty && !dismissed;
  const words = countWords(value);

  function seen() {
    setDismissed(true);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  const pct = Math.min(100, Math.round((words / aim) * 100));
  const reached = words >= aim;
  const long = words > aim * 1.4;
  const R = 15;
  const C = 2 * Math.PI * R;

  return (
    <div className="grid gap-2">
      <div className={cn("relative overflow-hidden rounded-[18px] p-px transition-colors", focused ? "bg-ring" : "bg-border")}>
        {hint && (
          <span aria-hidden className="pointer-events-none absolute inset-0 motion-reduce:hidden">
            <span className="absolute -inset-[60%] animate-shine-spin bg-[conic-gradient(from_0deg,transparent_0_65%,var(--gold)_82%,var(--brand-magenta)_94%,transparent)]" />
          </span>
        )}
        <div className="relative rounded-[17px] bg-card p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] text-muted-foreground">
              <Mail className="size-3.5" aria-hidden /> Formal email
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] text-muted-foreground">
              <Clock className="size-3.5" aria-hidden /> About {aim} words
            </span>
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, 6000))}
            onFocus={() => {
              setFocused(true);
              if (hint) seen();
            }}
            onBlur={() => setFocused(false)}
            rows={12}
            aria-label="Your email"
            placeholder="Write your email here…"
            lang="de"
            className="min-h-64 w-full resize-y bg-transparent p-1 text-[16px] leading-relaxed outline-none placeholder:text-subtle-foreground"
          />
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
              <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden className="-rotate-90">
                <circle cx="18" cy="18" r={R} fill="none" strokeWidth="3" className="stroke-muted" />
                <circle cx="18" cy="18" r={R} fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} className={cn("transition-[stroke-dashoffset] duration-300", reached ? "stroke-success" : "stroke-gold-ink")} />
              </svg>
              <span aria-live="polite">
                <span className={cn("font-semibold", reached ? "text-success" : "text-foreground")}>{words}</span> words
                {long && <span className="block text-[12px]">A bit long. About {aim} is enough.</span>}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
              <Check className="size-3.5 text-success" aria-hidden /> Saved automatically
            </span>
          </div>
        </div>
      </div>
      {hint && <p className="text-[13px] text-gold-ink">Tap the box and write your email here.</p>}
    </div>
  );
}
