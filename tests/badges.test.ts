import { describe, expect, it } from "vitest";

import { earnedBadges, nextBadgeHint, type TeacherStats } from "../src/lib/reputation/badges";
import { lessonPriceLabel } from "../src/lib/classes/trial";

const base: TeacherStats = { reviewCount: 0, average: 0, replied: 0, classesTaught: 0, verified: false };
const ids = (s: Partial<TeacherStats>) => earnedBadges({ ...base, ...s }).map((b) => b.id);

describe("badges", () => {
  it("a new teacher has none", () => expect(ids({})).toEqual([]));
  it("verified only comes from the flag", () => expect(ids({ verified: true })).toEqual(["verified"]));
  it("top rated needs 5 reviews and 4.5", () => {
    expect(ids({ reviewCount: 4, average: 5 })).not.toContain("top_rated");
    expect(ids({ reviewCount: 5, average: 4.4 })).not.toContain("top_rated");
    expect(ids({ reviewCount: 5, average: 4.5 })).toContain("top_rated");
  });
  it("replies needs 3 reviews and 80% answered", () => {
    expect(ids({ reviewCount: 2, replied: 2 })).not.toContain("replies");
    expect(ids({ reviewCount: 5, replied: 3 })).not.toContain("replies");
    expect(ids({ reviewCount: 5, replied: 4 })).toContain("replies");
  });
  it("experienced steps from 20 to 100", () => {
    expect(ids({ classesTaught: 19 })).toEqual([]);
    expect(earnedBadges({ ...base, classesTaught: 20 })[0].label).toBe("20+ classes taught");
    expect(earnedBadges({ ...base, classesTaught: 120 })[0].label).toBe("100+ classes taught");
  });
  it("gives a hint for the nearest badge", () => {
    expect(nextBadgeHint({ ...base, reviewCount: 3, average: 5, replied: 3, classesTaught: 50 })).toContain("2 more verified reviews");
  });
});

describe("lessonPriceLabel", () => {
  it("labels trials and prices", () => {
    expect(lessonPriceLabel(true, 0)).toBe("Free trial lesson");
    expect(lessonPriceLabel(false, null)).toBe("Price agreed with the teacher");
    expect(lessonPriceLabel(false, 1500)).toContain("15");
  });
});
