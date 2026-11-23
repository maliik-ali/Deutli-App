/**
 * Time zones. Each user has their own (profiles.time_zone, detected from the device);
 * until it is known we use Pakistan time, as the app did before.
 */
export const DEFAULT_TIME_ZONE = "Asia/Karachi";

/** True for a time zone name the browser/server understands, e.g. "Europe/Berlin". */
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function cleanTimeZone(value: unknown): string {
  return isTimeZone(value) ? value : DEFAULT_TIME_ZONE;
}

/** Today's date (YYYY-MM-DD) in a time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: cleanTimeZone(timeZone) }).format(now);
}

/** "Berlin (GMT+1)" — a short, readable label for a time zone. */
export function timeZoneLabel(timeZone: string, now: Date = new Date()): string {
  const tz = cleanTimeZone(timeZone);
  const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
  const offset =
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value ?? "";
  return offset ? `${city} (${offset})` : city;
}

/** How far a time zone is ahead of UTC at a moment, in milliseconds. */
function zoneOffsetMs(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** "2026-11-18" + "10:30" in a time zone → the exact moment (UTC). Null if the text is not a date/time. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const [year, month, day, hour, minute] = [+d[1], +d[2], +d[3], +t[1], +t[2]];
  // Reject impossible dates and times (month 13, 31 February, 25:99) instead of letting them roll over.
  if (month < 1 || month > 12 || hour > 23 || minute > 59) return null;
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const tz = cleanTimeZone(timeZone);
  // Two passes handle clock changes (summer time) around the guessed moment.
  let ts = guess - zoneOffsetMs(tz, new Date(guess));
  ts = guess - zoneOffsetMs(tz, new Date(ts));
  const result = new Date(ts);
  return Number.isNaN(result.getTime()) ? null : result;
}

/** The calendar day (YYYY-MM-DD) a moment falls on in a time zone. */
export function dayKeyIn(timeZone: string, at: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: cleanTimeZone(timeZone) }).format(new Date(at));
}

/** Adds days to a YYYY-MM-DD date (pure calendar maths, no time zone involved). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** "10:30 AM" in a time zone. */
export function formatClock(at: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: cleanTimeZone(timeZone),
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(at));
}

/** "18 Nov 2026" for a YYYY-MM-DD day. */
export function formatDayMedium(day: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${day}T12:00:00Z`));
}

/** "Wednesday, 18 November" for a YYYY-MM-DD day. */
export function formatDayLong(day: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(
    new Date(`${day}T12:00:00Z`),
  );
}

/** "Wed" and "18" for a YYYY-MM-DD day (for the day strip). */
export function formatDayShort(day: string): { weekday: string; date: string } {
  const at = new Date(`${day}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short" }).format(at),
    date: new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric" }).format(at),
  };
}

/** "10:30" (24-hour) for a moment in a time zone, as used by the class form. */
export function timeKeyIn(timeZone: string, at: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: cleanTimeZone(timeZone),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(at));
}

/** "Wed, 18 Nov" for a moment, in a time zone. */
export function formatShortDate(at: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: cleanTimeZone(timeZone),
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(at));
}
