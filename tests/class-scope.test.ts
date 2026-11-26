import { describe, expect, it } from "vitest";

import { inScope } from "@/lib/classes/scope";

describe("which teachers' classes a student may see", () => {
  it("a school student sees only their school's teachers", () => {
    const scope = { kind: "only" as const, ids: ["mine"] };
    expect(inScope(scope, "mine")).toBe(true);
    expect(inScope(scope, "other-school")).toBe(false);
  });
  it("a student on their own sees everyone except teachers of unlisted schools", () => {
    const scope = { kind: "except" as const, ids: ["private"] };
    expect(inScope(scope, "listed-or-no-school")).toBe(true);
    expect(inScope(scope, "private")).toBe(false);
  });
  it("admins see everyone", () => {
    expect(inScope({ kind: "all" }, "anyone")).toBe(true);
  });
  it("an empty school list shows nothing, an empty exception list shows everything", () => {
    expect(inScope({ kind: "only", ids: [] }, "x")).toBe(false);
    expect(inScope({ kind: "except", ids: [] }, "x")).toBe(true);
  });
});
