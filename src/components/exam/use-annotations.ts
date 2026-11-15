"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type Annotation =
  | { id: string; page: number; kind: "hl"; x: number; y: number; w: number; h: number }
  | { id: string; page: number; kind: "note"; x: number; y: number; text: string };

// Marks are kept in this browser only (positions are fractions of the page, so zoom does not matter).
const listeners = new Set<() => void>();
const memory = new Map<string, string>();

function read(key: string) {
  const m = memory.get(key);
  if (m !== undefined) return m;
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function useAnnotations(key: string) {
  const raw = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => read(key),
    () => "",
  );
  const items = useMemo<Annotation[]>(() => {
    try {
      return raw ? (JSON.parse(raw) as Annotation[]) : [];
    } catch {
      return [];
    }
  }, [raw]);
  const set = useCallback(
    (next: Annotation[]) => {
      const json = JSON.stringify(next);
      memory.set(key, json);
      try {
        localStorage.setItem(key, json);
      } catch {
        /* storage blocked: marks last until the page is closed */
      }
      listeners.forEach((l) => l());
    },
    [key],
  );
  return [items, set] as const;
}
