"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cancelClass } from "@/lib/classes/actions";

/** "Cancel this class" with a clear confirmation step (it tells students the class is off). */
export function CancelClass({ classId, registered, doneHref }: { classId: string; registered: number; doneHref: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();

  if (!asking) {
    return (
      <Button type="button" variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive-soft hover:text-destructive" onClick={() => setAsking(true)}>
        Cancel this class
      </Button>
    );
  }
  return (
    <div className="grid gap-3 rounded-2xl border border-destructive/40 bg-destructive-soft/60 p-4">
      <p className="text-[15px] font-semibold">Cancel this class?</p>
      <p className="text-sm text-muted-foreground">
        {registered > 0
          ? `${registered} ${registered === 1 ? "student has" : "students have"} registered. They will see the class as cancelled.`
          : "Nobody has registered yet."}{" "}
        This can&apos;t be undone.
      </p>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ink"
          className="bg-destructive font-semibold text-background hover:bg-destructive/90"
          disabled={busy}
          onClick={() =>
            startBusy(async () => {
              const r = await cancelClass(classId);
              if ("error" in r) setError(r.error);
              else {
                router.push(doneHref);
                router.refresh();
              }
            })
          }
        >
          {busy ? "Cancelling…" : "Yes, cancel class"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setAsking(false)} disabled={busy}>
          Keep it
        </Button>
      </div>
    </div>
  );
}
