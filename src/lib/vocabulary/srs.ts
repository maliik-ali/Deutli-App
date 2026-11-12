/**
 * Simple spaced repetition (Leitner boxes). Box 0 = new, box 5 = learned.
 * After a right answer the word moves up one box and comes back after the box's interval.
 * After a wrong answer it goes back to box 0 and is due again the same day.
 */
export const MAX_BOX = 5;
export const LEARNED_BOX = 4;
const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function nextReview(box: number, right: boolean, today: string): { box: number; dueOn: string } {
  if (!right) return { box: 0, dueOn: today };
  const next = Math.min(MAX_BOX, box + 1);
  return { box: next, dueOn: addDays(today, INTERVAL_DAYS[next]) };
}

export type WordStatus = "new" | "learning" | "learned";
export function statusOf(box: number): WordStatus {
  if (box === 0) return "new";
  return box >= LEARNED_BOX ? "learned" : "learning";
}
