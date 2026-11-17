"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { saveDetectedTimeZone } from "@/lib/account/actions";

/**
 * Saves the device's time zone once (the server ignores it when one is already saved),
 * then refreshes so "today", the greeting and dates use it. Renders nothing.
 */
export function TimeZoneSync() {
  const router = useRouter();
  useEffect(() => {
    let tz: string | undefined;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!tz) return;
    saveDetectedTimeZone(tz)
      .then((r) => {
        if ("changed" in r && r.changed) router.refresh();
      })
      .catch(() => {
        // Not saved: we try again on the next visit.
      });
  }, [router]);
  return null;
}
