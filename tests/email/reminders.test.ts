import { describe, expect, it } from "vitest";

import { classReminderEmail, proEndingEmail } from "@/lib/email/templates";
import { classReminderWindow, localHour, proReminderKind } from "@/lib/reminders/rules";

describe("Pro reminder rules", () => {
  it("reminds 7 days and 1 day before the last day, only from 9am", () => {
    expect(proReminderKind("2026-12-01", "2026-11-24", 10)).toEqual({ kind: "pro_7d", days: 7 });
    expect(proReminderKind("2026-12-01", "2026-11-30", 9)).toEqual({ kind: "pro_1d", days: 1 });
    expect(proReminderKind("2026-12-01", "2026-11-24", 8)).toBeNull();
  });
  it("stays quiet on other days and without Pro", () => {
    for (const t of ["2026-11-23", "2026-11-26", "2026-12-01", "2026-12-05"]) expect(proReminderKind("2026-12-01", t, 12)).toBeNull();
    expect(proReminderKind(null, "2026-11-24", 12)).toBeNull();
  });
  it("reads the hour in the student's own time zone", () => {
    const at = new Date("2026-11-20T05:00:00Z");
    expect(localHour("Asia/Karachi", at)).toBe(10);
    expect(localHour("Europe/Berlin", at)).toBe(6);
  });
});

describe("class reminder window", () => {
  it("covers the next hour", () => {
    const w = classReminderWindow(new Date("2026-11-20T10:00:00Z"));
    expect(w.to).toBe("2026-11-20T11:00:00.000Z");
  });
});

describe("reminder emails", () => {
  it("says tomorrow for the last-day reminder and links to the plans page", () => {
    const m = proEndingEmail({ name: "Ayesha Khan", until: "2026-12-01", days: 1 });
    expect(m.subject).toBe("Your Deutli Pro ends tomorrow");
    expect(m.text).toContain("Hi Ayesha,");
    expect(m.text).toContain("/dashboard/upgrade");
  });
  it("shows the class time in the student's own time zone and never lets typed text add HTML", () => {
    const m = classReminderEmail({ name: null, title: "Lesen <b>Teil 1</b>", teacher: "Frau Koch", startsAt: "2026-11-20T14:00:00Z", timeZone: "Asia/Karachi", classId: "abc" });
    expect(m.text).toContain("7:00 PM");
    expect(m.html).not.toContain("<b>Teil 1</b>");
    expect(m.text).toContain("/dashboard/classes/abc");
  });
});
