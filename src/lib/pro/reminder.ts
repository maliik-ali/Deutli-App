/** Days before the end of Pro that we start reminding, and days after the end that we keep offering a renewal. */
export const REMIND_BEFORE_DAYS = 7;
export const REMIND_AFTER_DAYS = 14;

export type ProReminder = { kind: "ending" | "ended"; days: number };

/**
 * Should we remind this student to renew? `proUntil` is the last day of Pro (YYYY-MM-DD),
 * `today` is today's date in the student's own time zone (YYYY-MM-DD).
 * "ending": Pro runs out within a week (days = days left, 0 = last day).
 * "ended": Pro ran out in the last two weeks (days = days since).
 */
export function proReminder(proUntil: string | null, today: string): ProReminder | null {
  if (!proUntil) return null;
  const diff = Math.round((Date.parse(proUntil) - Date.parse(today)) / 86_400_000);
  if (Number.isNaN(diff)) return null;
  if (diff >= 0 && diff <= REMIND_BEFORE_DAYS) return { kind: "ending", days: diff };
  if (diff < 0 && -diff <= REMIND_AFTER_DAYS) return { kind: "ended", days: -diff };
  return null;
}

/** "14 February 2027" from a plain date, the same on every device. */
export const longDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
