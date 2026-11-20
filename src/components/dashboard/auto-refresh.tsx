"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-reads the page every few seconds so the student sees "Payment confirmed" without pressing anything.
 * Stops after about a minute (the page then still offers a Refresh button) and waits while the tab is hidden.
 */
export function AutoRefresh({ everyMs = 3000, maxTries = 20 }: { everyMs?: number; maxTries?: number }) {
  const router = useRouter();

  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      if (document.hidden) return;
      tries += 1;
      router.refresh();
      if (tries >= maxTries) clearInterval(timer);
    }, everyMs);
    return () => clearInterval(timer);
  }, [router, everyMs, maxTries]);

  return null;
}
