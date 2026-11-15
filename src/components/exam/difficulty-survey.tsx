"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { saveDifficulty } from "@/lib/papers/actions";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { id: "much_easier", label: "Much easier" },
  { id: "easier", label: "Easier" },
  { id: "same", label: "About the same" },
  { id: "harder", label: "Harder" },
  { id: "much_harder", label: "Much harder" },
  { id: "not_taken", label: "I haven't taken the real exam" },
] as const;

/** Keeps our mocks honest: students who took the real exam tell us how hard this mock was in comparison. */
export function DifficultySurvey({ attemptId, initial }: { attemptId: string; initial: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  return (
    <Card>
      <div className="grid gap-1">
        <CardTitle>Was the real exam harder than this mock?</CardTitle>
        <CardDescription>Your answer helps us make the mocks as close to the real exam as possible.</CardDescription>
      </div>
      {value ? (
        <p className="flex items-center gap-2 text-[15px] text-success" role="status">
          <CheckCircle2 className="size-5" aria-hidden /> Thank you! Your answer: {OPTIONS.find((o) => o.id === value)?.label}.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              disabled={busy}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const r = await saveDifficulty(attemptId, o.id);
                  if ("error" in r) setError(r.error);
                  else setValue(o.id);
                })
              }
              className={cn("min-h-11 rounded-full border border-border px-4 text-[14px] font-medium transition-colors hover:bg-muted", busy && "opacity-60")}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="text-[14px] text-destructive">
          {error}
        </p>
      )}
    </Card>
  );
}
