"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { setFeedbackStatus } from "@/lib/support/actions";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { id: "new", label: "New" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" },
] as const;

/** Three buttons that move a message between New, In progress and Done. */
export function FeedbackStatus({ id, status }: { id: string; status: "new" | "in_progress" | "done" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Status" className="inline-flex rounded-xl border border-border bg-card p-1">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={status === o.id}
            disabled={busy}
            onClick={() =>
              start(async () => {
                setError(null);
                const r = await setFeedbackStatus(id, o.id);
                if ("error" in r) setError(r.error);
                else router.refresh();
              })
            }
            className={cn("min-h-9 rounded-lg px-3 text-[13px] font-semibold transition-colors", status === o.id ? "bg-brand-gradient text-white" : "text-muted-foreground hover:text-foreground")}
          >
            {o.label}
          </button>
        ))}
      </div>
      {error && <span className="text-[13px] text-destructive">{error}</span>}
    </div>
  );
}
