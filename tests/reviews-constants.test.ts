import { describe, expect, it } from "vitest";

import { HELPED, HELPED_IDS, MIN_DAYS_IN_BATCH, MIN_REVIEWS_FOR_AVERAGE, shortName } from "@/lib/reviews/constants";

describe("reviews constants", () => {
  it("shows a first name and a last initial, nothing more", () => {
    expect(shortName("Ayesha Khan")).toBe("Ayesha K.");
    expect(shortName("  Ali  bin  hamza ")).toBe("Ali H.");
    expect(shortName("Bilal")).toBe("Bilal");
    expect(shortName("")).toBe("A student");
    expect(shortName(null)).toBe("A student");
  });
  it("keeps the rules in one place", () => {
    expect(MIN_DAYS_IN_BATCH).toBe(14);
    expect(MIN_REVIEWS_FOR_AVERAGE).toBe(3);
    expect(HELPED_IDS).toEqual(HELPED.map((h) => h.id));
    expect(new Set(HELPED_IDS).size).toBe(HELPED.length);
  });
});
