import { beforeEach, describe, expect, it, vi } from "vitest";

const PLAN = "11111111-1111-4111-8111-111111111111";
const ORDER = "22222222-2222-4222-8222-222222222222";

// A tiny stand-in for the database client: every call returns the next prepared answer.
const answers: unknown[] = [];
const chain = (result: unknown): unknown =>
  new Proxy({}, { get: (_t, prop) => (prop === "maybeSingle" || prop === "single" ? async () => ({ data: result, error: null }) : prop === "then" ? undefined : () => chain(result)) });
const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: { id: ORDER }, error: null }) }) }));
const update = vi.fn(() => chain(null));
const retrieve = vi.fn();
const create = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth/dal", () => ({ requireUser: vi.fn(async () => ({ id: "u1", email: "s@example.com", role: "student" })) }));
vi.mock("@/lib/pro/data", () => ({ cardReady: () => true }));
vi.mock("@/lib/pro/stripe", () => ({ getStripe: () => ({ checkout: { sessions: { retrieve, create } } }), stripeCurrency: () => "pkr" }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: () => ({ select: () => chain({ id: PLAN, name: "3 months", months: 3, price_pkr: 5999 }) }) }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => ({ select: () => chain(answers.shift()), insert, update }) }) }));

import { buyProWithCard } from "@/lib/pro/actions";

const order = (over: Record<string, unknown> = {}) => ({ id: ORDER, plan_name: "3 months", months: 3, amount_pkr: 5999, method: "card", status: "pending", reference: "DT-ABC234", stripe_session_id: null, ...over });

beforeEach(() => {
  answers.length = 0;
  insert.mockClear();
  update.mockClear();
  retrieve.mockReset();
  create.mockReset();
  create.mockResolvedValue({ id: "cs_new", url: "https://pay.test/new" });
});

describe("starting a card payment", () => {
  it("creates one order and opens Stripe", async () => {
    answers.push(null, order());
    expect(await buyProWithCard({ planId: PLAN, agreed: true })).toEqual({ url: "https://pay.test/new" });
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("carries on with the waiting order instead of making a duplicate", async () => {
    answers.push({ id: ORDER }, order());
    expect(await buyProWithCard({ planId: PLAN, agreed: true })).toEqual({ url: "https://pay.test/new" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("sends the student back to Stripe's page if it is still open", async () => {
    answers.push({ id: ORDER }, order({ stripe_session_id: "cs_old" }));
    retrieve.mockResolvedValue({ status: "open", url: "https://pay.test/old" });
    expect(await buyProWithCard({ planId: PLAN, agreed: true })).toEqual({ url: "https://pay.test/old" });
    expect(create).not.toHaveBeenCalled();
  });

  it("opens a fresh Stripe page when the old one has expired", async () => {
    answers.push({ id: ORDER }, order({ stripe_session_id: "cs_old" }));
    retrieve.mockResolvedValue({ status: "expired", url: null });
    expect(await buyProWithCard({ planId: PLAN, agreed: true })).toEqual({ url: "https://pay.test/new" });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("does not open a second page when the first one was already paid", async () => {
    answers.push({ id: ORDER }, order({ stripe_session_id: "cs_old" }));
    retrieve.mockResolvedValue({ status: "complete", url: null });
    const r = await buyProWithCard({ planId: PLAN, agreed: true });
    expect("error" in r).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });

  it("needs the consent tick", async () => {
    const r = await buyProWithCard({ planId: PLAN, agreed: false });
    expect("error" in r).toBe(true);
    expect(insert).not.toHaveBeenCalled();
  });
});
