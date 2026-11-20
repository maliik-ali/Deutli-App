/** Rules for reminder emails. Pure functions, so they are easy to test. */

/** Reminders go out from this local hour on, so nobody is woken at midnight. */
export const SEND_FROM_HOUR = 9;

/** Which Pro reminder is due: 7 days or 1 day before the last day of Pro (in the student's own time zone). */
export function proReminderKind(proUntil: string | null, today: string, localHour: number): { kind: "pro_7d" | "pro_1d"; days: number } | null {
  if (!proUntil || localHour < SEND_FROM_HOUR) return null;
  const diff = Math.round((Date.parse(proUntil) - Date.parse(today)) / 86_400_000);
  if (diff === 7) return { kind: "pro_7d", days: 7 };
  if (diff === 1) return { kind: "pro_1d", days: 1 };
  return null;
}

/** Hour of the day (0-23) in a time zone. */
export function localHour(timeZone: string, now: Date = new Date()): number {
  const h = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now);
  return Number(h) % 24;
}

/** A class is worth a reminder when it starts within the next hour (and has not started). */
export const CLASS_REMIND_MINUTES = 60;
export const classReminderWindow = (now: Date = new Date()) => ({
  from: now.toISOString(),
  to: new Date(now.getTime() + CLASS_REMIND_MINUTES * 60_000).toISOString(),
});
