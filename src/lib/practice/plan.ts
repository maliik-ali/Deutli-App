/**
 * Daily Practice plan: one new text, yesterday's text again, and one older text.
 * Each text comes back on different days — that is what makes it stick.
 * Pure functions (no database), so they are easy to test.
 */

export type TrackSummary = {
  id: string;
  title: string;
  position: number;
  setId: string;
  setTitle: string;
  hasAudio: boolean;
  /** Days this track was practised, as YYYY-MM-DD. */
  days: string[];
};

export type PlanSlot = {
  kind: "new" | "yesterday" | "older";
  label: string;
  minutes: number;
  hint: string;
  track: TrackSummary | null;
  doneToday: boolean;
};

/** Today's date in Pakistan time (the pilot students' time zone), as YYYY-MM-DD. */
export function todayPKT(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(now);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Last day before today on which the track was practised, or null. */
function lastBefore(track: TrackSummary, today: string): string | null {
  const earlier = track.days.filter((d) => d < today).sort();
  return earlier.length ? earlier[earlier.length - 1] : null;
}

/** `tracks` must be in learning order (set by set, track by track). */
export function buildPlan(tracks: TrackSummary[], today: string): PlanSlot[] {
  const done = (t: TrackSummary | null) => Boolean(t && t.days.includes(today));

  // New: the first text never practised before today.
  const fresh = tracks.find((t) => lastBefore(t, today) === null) ?? null;

  // Yesterday: the text practised most recently before today.
  const seen = tracks
    .map((t) => ({ t, last: lastBefore(t, today) }))
    .filter((x): x is { t: TrackSummary; last: string } => x.last !== null);
  const recent = [...seen].sort((a, b) => b.last.localeCompare(a.last))[0]?.t ?? null;

  // Older: practised 3+ days ago; the one waiting longest comes first.
  const older =
    seen
      .filter((x) => x.t.id !== recent?.id && daysBetween(x.last, today) >= 3)
      .sort((a, b) => a.last.localeCompare(b.last))[0]?.t ?? null;

  return [
    {
      kind: "new",
      label: "New text",
      minutes: 12,
      hint: fresh ? "Listen, then read, then speak along." : "You have practised every text. More are coming.",
      track: fresh,
      doneToday: done(fresh),
    },
    {
      kind: "yesterday",
      label: "Last text again",
      minutes: 5,
      hint: recent ? "Speak along once more." : "Shows up after your first practice day.",
      track: recent,
      doneToday: done(recent),
    },
    {
      kind: "older",
      label: "Older text",
      minutes: 3,
      hint: older ? "One quick round so you don't forget it." : "Shows up after a few days of practice.",
      track: older,
      doneToday: done(older),
    },
  ];
}

/** Days in a row with at least one practised text, counting back from today (or yesterday). */
export function practiceStreak(tracks: TrackSummary[], today: string): number {
  const days = new Set(tracks.flatMap((t) => t.days));
  const step = (d: string, by: number) =>
    new Date(Date.parse(`${d}T00:00:00Z`) + by * 86_400_000).toISOString().slice(0, 10);
  let cursor = days.has(today) ? today : step(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = step(cursor, -1);
  }
  return streak;
}

/** "today", "yesterday", "3 days ago" … */
export function lastPractisedLabel(track: TrackSummary, today: string): string | null {
  if (!track.days.length) return null;
  const last = [...track.days].sort()[track.days.length - 1];
  const diff = daysBetween(last, today);
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  return `${diff} days ago`;
}

/** A word or phrase the student saved while reading. */
/** A saved word. `meaning` is English, `meaningUr` is Urdu. */
export type SavedWord = { id: string; word: string; meaning: string | null; meaningUr: string | null };

/** Columns to read for a SavedWord (Urdu is renamed to meaningUr). */
export const SAVED_WORD_COLUMNS = "id, word, meaning, meaningUr:meaning_ur";
