"use client";

import { useEffect } from "react";

/** Saves the student's level + skill choice in a cookie so the Classes page opens on it next time. */
export function RememberFilters({ level, skill }: { level: string; skill: string }) {
  useEffect(() => {
    try {
      document.cookie = `classes_filter=${level}.${skill}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch {
      /* cookies blocked: the page still works, it just won't remember */
    }
  }, [level, skill]);
  return null;
}
