"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronRight, Sprout, X } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { SetupStep } from "@/lib/setup-step";
import { cn } from "@/lib/utils";

const HIDE_KEY = "deutli-getting-started-hidden";
const HIDE_EVENT = "deutli-getting-started";

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(HIDE_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(HIDE_EVENT, cb);
  };
};
const isHidden = () => {
  try {
    return localStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return false;
  }
};
function hide() {
  try {
    localStorage.setItem(HIDE_KEY, "1");
  } catch {
    /* Private mode: it just comes back next time. */
  }
  window.dispatchEvent(new Event(HIDE_EVENT));
}

/**
 * The first steps for a new teacher or student (checklist card, Slack-style). Ticks itself off as they work,
 * can be hidden on this device, and disappears for good when everything is done.
 */
export function GettingStarted({ steps, description = "Do these in order. Each step ticks off by itself when you have done it.", footer }: { steps: SetupStep[]; description?: string; footer?: ReactNode }) {
  const hidden = useSyncExternalStore(subscribe, isHidden, () => false);
  const done = steps.filter((s) => s.done).length;
  if (steps.length === 0 || done === steps.length || hidden) return null;

  return (
    <Card className="gap-5 overflow-hidden pb-0" aria-labelledby="getting-started">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 id="getting-started" className="flex items-center gap-2.5 text-xl font-extrabold">
            <Sprout className="size-6 text-success" aria-hidden /> Get started
          </h2>
          <p className="text-[14px] text-muted-foreground">{description}</p>
        </div>
        <button
          type="button"
          onClick={hide}
          aria-label="Hide Get started"
          title="Hide this"
          className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div
          role="progressbar"
          aria-label={`${done} of ${steps.length} steps done`}
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={done}
          className="flex h-3 flex-1 gap-1"
        >
          {steps.map((s) => (
            <span key={s.key} className={cn("h-full flex-1 rounded-full", s.done ? "bg-brand-gradient" : "bg-muted")} />
          ))}
        </div>
        <p className="text-[14px] font-semibold tabular-nums text-muted-foreground">
          {done}/{steps.length}
        </p>
      </div>

      <ol className="-mx-3 grid">
        {steps.map((s) => (
          <li key={s.key}>
            <Link href={s.href} className="group flex items-center gap-4 rounded-2xl px-3 py-3.5 transition-colors hover:bg-muted">
              <span
                aria-hidden
                className={cn("grid size-8 shrink-0 place-items-center rounded-full border-2", s.done ? "border-transparent bg-gold text-gold-foreground" : "border-gold-ink/70")}
              >
                {s.done && <Check className="size-[18px]" strokeWidth={3} />}
              </span>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="text-[16px] font-bold">
                  {s.title}
                  <span className="sr-only">{s.done ? " (done)" : ""}</span>
                </span>
                <span className="text-[14px] text-muted-foreground">{s.hint}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>

      <div className="-mx-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border bg-muted/50 px-6 py-3 text-[14px] text-muted-foreground">
        <div>{footer || "Already know your way around?"}</div>
        <button type="button" onClick={hide} className="inline-flex min-h-11 items-center font-semibold text-gold-ink underline-offset-4 hover:underline">
          Don’t show this again
        </button>
      </div>
    </Card>
  );
}
