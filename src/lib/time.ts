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
