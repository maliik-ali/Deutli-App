"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";

import { rateClass } from "@/lib/classes/actions";
import { cn } from "@/lib/utils";

/** "How was class?" with five stars. Saves on tap; the student can change it. */
export function RateClass({ classId, initial }: { classId: string; initial: number | null }) {
  const [value, setValue] = useState(initial ?? 0);
  const [hover, setHover] = useState(0);
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(n: number) {
    const before = value;
    setValue(n);
    setError(null);
    startBusy(async () => {
      const r = await rateClass(classId, n);
      if ("error" in r) {
        setValue(before);
        setError(r.error);
      }
    });
  }

  const shown = hover || value;
  return (
    <div className="grid gap-2 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] font-semibold">{value ? "Thanks for your rating" : "How was class?"}</p>
        <div role="radiogroup" aria-label="Rate this class" className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              disabled={busy}
              onMouseEnter={() => setHover(n)}
              onClick={() => pick(n)}
              className="grid size-11 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-gold-ink"
            >
              <Star
                className={cn("size-6 transition-colors", n <= shown ? "fill-brand-cyan text-brand-cyan" : "text-subtle-foreground")}
                aria-hidden
              />
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
