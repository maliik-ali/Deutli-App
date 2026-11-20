import { describe, expect, it } from "vitest";

import { longDay, proReminder } from "@/lib/pro/reminder";

describe("proReminder", () => {
  const today = "2027-02-10";
  it("says nothing without a Pro date", () => {
    expect(proReminder(null, today)).toBeNull();
  });
  it("says nothing while Pro still has more than a week", () => {
    expect(proReminder("2027-02-18", today)).toBeNull();
  });
  it("reminds in the last week, including the last day", () => {
    expect(proReminder("2027-02-17", today)).toEqual({ kind: "ending", days: 7 });
    expect(proReminder("2027-02-11", today)).toEqual({ kind: "ending", days: 1 });
    expect(proReminder("2027-02-10", today)).toEqual({ kind: "ending", days: 0 });
  });
  it("offers a renewal for two weeks after Pro ended", () => {
    expect(proReminder("2027-02-09", today)).toEqual({ kind: "ended", days: 1 });
    expect(proReminder("2027-01-27", today)).toEqual({ kind: "ended", days: 14 });
  });
  it("stops after that", () => {
    expect(proReminder("2027-01-26", today)).toBeNull();
  });
});

describe("longDay", () => {
  it("writes a plain date the same everywhere", () => {
    expect(longDay("2027-02-14")).toBe("14 February 2027");
  });
});
