import { describe, expect, it } from "vitest";

import { accentProblem, DEFAULT_ACCENT, DEFAULT_PRIMARY, primaryProblem } from "@/lib/branding/colour";

describe("branding colours", () => {
  it("always accepts Deutli's own colours", () => {
    expect(primaryProblem(DEFAULT_PRIMARY)).toBeNull();
    expect(accentProblem(DEFAULT_ACCENT)).toBeNull();
  });

  it("refuses a main colour that is too light for white text", () => {
    expect(primaryProblem("#a0c4ff")).toMatch(/hard to read/);
  });

  it("accepts a dark main colour and a mid accent", () => {
    expect(primaryProblem("#1d4ed8")).toBeNull();
    expect(accentProblem("#7c3aed")).toBeNull();
  });
});
