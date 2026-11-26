import { describe, expect, it } from "vitest";

import { SKILL_IDS } from "@/lib/classes/constants";
import { MIN_REVIEWS_FOR_AVERAGE } from "@/lib/reviews/constants";

describe("find a teacher rules", () => {
  it("only shows an average from enough reviews, and offers real skills as filters", () => {
    expect(MIN_REVIEWS_FOR_AVERAGE).toBeGreaterThanOrEqual(3);
    expect(SKILL_IDS).toContain("speaking");
  });
});
