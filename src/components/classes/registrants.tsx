"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { markAttended } from "@/lib/classes/actions";
import { cn } from "@/lib/utils";

export type RegistrantView = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** e.g. "Joined 10:32 AM", or null if they have not joined. */
  joinedLabel: string | null;
  attended: boolean | null;
  rating: number | null;
};

/** Who signed up. The teacher ticks "Present" after the class. */
export function Registrants({ classId, people }: { classId: string; people: RegistrantView[] }) {
  const [attended, setAttended] = useState(() => new Map(people.map((p) => [p.userId, p.attended === true])));
  const [error, setError] = useState<string | null>(null);
  const [, startBusy] = useTransition();

  function toggle(userId: string, next: boolean) {
    setError(null);
    setAttended((m) => new Map(m).set(userId, next));
    startBusy(async () => {
      const r = await markAttended(classId, userId, next);
      if ("error" in r) {
        setAttended((m) => new Map(m).set(userId, !next));
        setError(r.error);
      }
    });
  }

  if (people.length === 0) {
    return <p className="text-[15px] text-muted-foreground">Nobody has registered yet.</p>;
  }
  return (
    <div className="grid gap-3">
      <ul className="divide-y divide-border">
        {people.map((p) => {
          const on = attended.get(p.userId) === true;
          return (
            <li key={p.userId} className="flex items-center gap-3 py-2.5">
              <Avatar name={p.name} url={p.avatarUrl} className="size-9" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{p.name}</span>
                <span className="block text-[13px] text-subtle-foreground">{p.joinedLabel ?? "Has not joined"}</span>
              </span>
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[14px] font-medium text-muted-foreground hover:text-foreground">
                <input type="checkbox" checked={on} onChange={(e) => toggle(p.userId, e.target.checked)} className="peer sr-only" />
                <span
                  aria-hidden
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-gold-ink peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card",
                    on ? "border-gold bg-gold text-white" : "border-border",
                  )}
                >
                  {on && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                Present
              </label>
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
