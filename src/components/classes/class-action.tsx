"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cancelMyRegistration, getJoinLink, registerForClass } from "@/lib/classes/actions";
import { classPhase } from "@/lib/classes/constants";
import { cn } from "@/lib/utils";

type Props = {
  classId: string;
  /** Server time (ms) when the page was built; the button keeps its own clock after that. */
  serverNow: number;
  startsAt: string;
  durationMin: number;
  status: "scheduled" | "cancelled";
  registered: boolean;
  full: boolean;
  hasLink: boolean;
  /** Bigger buttons and a Cancel link (class page). */
  large?: boolean;
  /** A 1:1 lesson is "Book" / "Booked" instead of "Register" / "Registered". */
  oneToOne?: boolean;
};

/** Register / Registered / Join / Full for one class. Updates itself as the start time gets closer. */
export function ClassAction({ classId, serverNow, startsAt, durationMin, status, registered, full, hasLink, large, oneToOne = false }: Props) {
  const router = useRouter();
  const [now, setNow] = useState(serverNow);
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [passcode, setPasscode] = useState<string | null>(null);

  // Keep the clock fresh: every 15 seconds, and when the student comes back to the tab.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 15_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const phase = classPhase(startsAt, durationMin, now);
  const size = large ? "lg" : "sm";
  // 44px touch targets on phones, compact on desktop rows.
  const btn = large ? "" : "h-11 sm:h-9";

  function run(action: () => Promise<{ error: string } | { ok: true }>) {
    setError(null);
    startBusy(async () => {
      const r = await action();
      if ("error" in r) setError(r.error);
      else router.refresh();
    });
  }

  function join() {
    setError(null);
    // Open the tab right away (popup blockers allow it only on the click), then point it at Zoom.
    const tab = window.open("about:blank", "_blank");
    startBusy(async () => {
      const r = await getJoinLink(classId);
      if ("error" in r) {
        tab?.close();
        setError(r.error);
        return;
      }
      setPasscode(r.passcode);
      if (tab) {
        tab.opener = null;
        tab.location.href = r.url;
      } else {
        window.location.href = r.url;
      }
    });
  }

  let body: React.ReactNode;
  if (status === "cancelled") {
    body = <span className="rounded-full bg-destructive-soft px-3 py-1.5 text-[13px] font-semibold text-destructive">Cancelled</span>;
  } else if (phase === "ended") {
    body = <span className="rounded-full bg-muted px-3 py-1.5 text-[13px] font-semibold text-muted-foreground">Ended</span>;
  } else if (registered && (phase === "soon" || phase === "live")) {
    body = hasLink ? (
      <Button size={size} className={btn} onClick={join} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Video aria-hidden />} Join
      </Button>
    ) : (
      <span className="rounded-full bg-muted px-3 py-1.5 text-[13px] font-semibold text-muted-foreground">
        Link coming soon
      </span>
    );
  } else if (registered) {
    body = (
      <span className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-[13px] font-semibold text-success">
          <Check className="size-3.5" strokeWidth={3} aria-hidden /> {oneToOne ? "Booked" : "Registered"}
        </span>
        {large && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => cancelMyRegistration(classId))}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-60"
          >
            {busy ? "Cancelling…" : "Cancel"}
          </button>
        )}
      </span>
    );
  } else if (full) {
    body = <span className="rounded-full bg-muted px-3 py-1.5 text-[13px] font-semibold text-muted-foreground">Full</span>;
  } else {
    body = (
      <Button
        variant={large ? "default" : "outline"}
        size={size}
        className={btn}
        onClick={() => run(() => registerForClass(classId))}
        disabled={busy}
      >
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />} {oneToOne ? "Book this lesson" : "Register"}
      </Button>
    );
  }

  return (
    <div className={cn("grid gap-1.5", large ? "justify-items-start" : "justify-items-end")}>
      {body}
      {passcode && <p className="text-[13px] text-muted-foreground">Passcode: <span className="font-semibold text-foreground">{passcode}</span></p>}
      {error && (
        <p className={cn("max-w-56 text-[12px] leading-snug text-destructive", large ? "text-left" : "text-right")} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
