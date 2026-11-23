import { describe, expect, it } from "vitest";

import { TELC_B1_PARTS, contentsLabel, grade, questionCount, sectionsInStructure } from "@/lib/papers/template";

const only = (...sections: string[]) => ({ parts: TELC_B1_PARTS.filter((p) => sections.includes(p.section)) });

describe("papers with only some sections", () => {
  it("full paper has no label and 60 questions", () => {
    expect(contentsLabel({ parts: TELC_B1_PARTS })).toBeNull();
    expect(questionCount({ parts: TELC_B1_PARTS })).toBe(60);
  });

  it("reading only", () => {
    const st = only("lesen");
    expect(contentsLabel(st)).toBe("Reading only");
    expect(questionCount(st)).toBe(20);
    expect(sectionsInStructure(st).map((s) => s.id)).toEqual(["lesen"]);
  });

  it("two sections", () => {
    expect(contentsLabel(only("lesen", "hoeren"))).toBe("Reading + Listening");
  });

  it("is marked only on the sections that exist", () => {
    const st = only("lesen");
    const key = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [String(i + 1), "a"]));
    const r = grade(st, key, { "1": "a", "2": "a" }, "");
    expect(r.max).toBe(75);
    expect(r.parts.every((p) => p.id.startsWith("lesen-"))).toBe(true);
  });
});
