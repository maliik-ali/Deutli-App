import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { SetupStep } from "@/lib/teachers/setup";
import { cn } from "@/lib/utils";

/** The first steps for a new teacher. Ticks itself off as they work, and disappears when everything is done. */
export function GettingStarted({ steps }: { steps: SetupStep[] }) {
  const done = steps.filter((s) => s.done).length;
  if (steps.length === 0 || done === steps.length) return null;
  const next = steps.findIndex((s) => !s.done);

  return (
    <Card className="gap-5" aria-labelledby="getting-started">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="grid gap-1">
          <CardTitle id="getting-started" className="text-lg">
            Get started
          </CardTitle>
          <CardDescription>Do these in order. Each step ticks off by itself when you have done it.</CardDescription>
        </div>
        <p className="text-[13px] font-semibold text-muted-foreground">
          {done} of {steps.length} done
        </p>
      </div>
      <Progress value={(done / steps.length) * 100} tone="gold" aria-label={`${done} of ${steps.length} steps done`} />
      <ol className="grid gap-2">
        {steps.map((s, i) => (
          <li key={s.key} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-3 py-3 sm:flex-nowrap", i === next && "bg-gold-soft")}>
            <span
              aria-hidden
              className={cn("grid size-7 shrink-0 place-items-center rounded-full border text-[13px] font-bold", s.done ? "border-transparent bg-success-soft text-success" : "border-border text-muted-foreground")}
            >
              {s.done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
            </span>
            <span className="grid min-w-0 flex-1 basis-48 gap-0.5">
              <span className={cn("text-[15px] font-semibold", s.done && "text-muted-foreground line-through decoration-1")}>
                {s.title}
                <span className="sr-only">{s.done ? " (done)" : ""}</span>
              </span>
              {!s.done && <span className="text-[13px] text-muted-foreground">{s.hint}</span>}
            </span>
            {!s.done && (
              <Button asChild size="sm" variant={i === next ? "default" : "outline"} className="ml-11 h-11 sm:ml-0 sm:h-9">
                <Link href={s.href}>{i === next ? "Start" : "Open"}</Link>
              </Button>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}
