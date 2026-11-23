import { describe, expect, it } from "vitest";

import { paperExamLabel } from "@/lib/papers/template";

describe("paperExamLabel", () => {
  it("reads old and new exam values", () => {
    expect(paperExamLabel("telc_b1", "b1")).toBe("telc · B1");
    expect(paperExamLabel("goethe", "a2")).toBe("Goethe · A2");
    expect(paperExamLabel("other", "c1")).toBe("C1");
    expect(paperExamLabel(undefined, undefined)).toBe("B1");
  });
});
