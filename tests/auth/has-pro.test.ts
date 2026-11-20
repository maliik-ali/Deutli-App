import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn(), cookies: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { hasPro } from "@/lib/auth/dal";

const today = new Date().toISOString().slice(0, 10);
const shift = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

describe("hasPro", () => {
  it("is off for a student with no Pro date", () => {
    expect(hasPro({ role: "student", proUntil: null })).toBe(false);
  });
  it("is on while Pro lasts and off after it ends", () => {
    expect(hasPro({ role: "student", proUntil: shift(30), timeZone: "UTC" })).toBe(true);
    expect(hasPro({ role: "student", proUntil: shift(-2), timeZone: "UTC" })).toBe(false);
    expect(today).toBeTruthy();
  });
  it("is on for staff, who need to test everything", () => {
    expect(hasPro({ role: "teacher", proUntil: null })).toBe(true);
    expect(hasPro({ role: "super_admin", proUntil: null })).toBe(true);
  });
});
