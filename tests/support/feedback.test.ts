import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn<(row: unknown) => Promise<{ error: null | { message: string } }>>(async () => ({ error: null }));
const allow = vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => true);

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/dal", () => ({ requireUser: vi.fn(async () => ({ id: "u1", email: "student@example.com", role: "student" })) }));
vi.mock("@/lib/rate-limit", () => ({ allow: (...a: unknown[]) => allow(...a) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => ({ insert }) }) }));

import { sendFeedback } from "@/lib/support/actions";

beforeEach(() => {
  insert.mockClear();
  allow.mockClear();
  allow.mockResolvedValue(true);
});

describe("sendFeedback", () => {
  it("saves a good message with the student's id and email", async () => {
    const r = await sendFeedback({ kind: "payment", message: "I paid by JazzCash but Pro is not on.", page: "/dashboard/upgrade" });
    expect(r).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledWith({ user_id: "u1", kind: "payment", message: "I paid by JazzCash but Pro is not on.", page: "/dashboard/upgrade", email: "student@example.com" });
  });

  it("rejects a message that is too short or too long", async () => {
    expect("error" in (await sendFeedback({ kind: "idea", message: "hi" }))).toBe(true);
    expect("error" in (await sendFeedback({ kind: "idea", message: "x".repeat(2001) }))).toBe(true);
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects an unknown kind and a page that is not a path inside the app", async () => {
    expect("error" in (await sendFeedback({ kind: "spam", message: "Hello there, friend" }))).toBe(true);
    expect("error" in (await sendFeedback({ kind: "idea", message: "Hello there, friend", page: "https://evil.example/x" }))).toBe(true);
    expect(insert).not.toHaveBeenCalled();
  });

  it("stops after too many messages in an hour", async () => {
    allow.mockResolvedValue(false);
    const r = await sendFeedback({ kind: "question", message: "Another question for you" });
    expect("error" in r).toBe(true);
    expect(insert).not.toHaveBeenCalled();
  });

  it("shows a friendly error if saving fails", async () => {
    insert.mockResolvedValueOnce({ error: { message: "boom" } });
    const r = await sendFeedback({ kind: "problem", message: "Something is broken here" });
    expect("error" in r).toBe(true);
  });
});
