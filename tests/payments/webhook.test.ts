import { beforeEach, describe, expect, it, vi } from "vitest";

const fulfil = vi.fn(async () => ({ ok: true as const }));
const constructEvent = vi.fn();
let order: Record<string, unknown> | null = null;

vi.mock("@/lib/pro/fulfil", () => ({ fulfilOrder: (...a: unknown[]) => fulfil(...(a as [])) }));
vi.mock("@/lib/pro/stripe", () => ({
  getStripe: () => ({ webhooks: { constructEvent } }),
  stripeCurrency: () => "pkr",
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: order }) }) }) }) }),
}));

import { POST } from "@/app/api/stripe/webhook/route";

const req = (sig: string | null) =>
  new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}", headers: sig ? { "stripe-signature": sig } : {} }) as never;

const paid = (over: Record<string, unknown> = {}) => ({
  type: "checkout.session.completed",
  data: { object: { id: "cs_1", client_reference_id: "o1", payment_status: "paid", amount_total: 500000, currency: "pkr", ...over } },
});

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  fulfil.mockClear();
  constructEvent.mockReset();
  order = { id: "o1", amount_pkr: 5000, method: "card", stripe_session_id: "cs_1" };
});

describe("Stripe webhook", () => {
  it("rejects a call without a signature", async () => {
    expect((await POST(req(null))).status).toBe(400);
    expect(fulfil).not.toHaveBeenCalled();
  });

  it("rejects a forged signature", async () => {
    constructEvent.mockImplementation(() => { throw new Error("bad"); });
    expect((await POST(req("x"))).status).toBe(400);
    expect(fulfil).not.toHaveBeenCalled();
  });

  it("turns Pro on for a correct, paid order", async () => {
    constructEvent.mockReturnValue(paid());
    expect((await POST(req("ok"))).status).toBe(200);
    expect(fulfil).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the amount does not match our order", async () => {
    constructEvent.mockReturnValue(paid({ amount_total: 100 }));
    await POST(req("ok"));
    expect(fulfil).not.toHaveBeenCalled();
  });

  it("does nothing when the currency is wrong", async () => {
    constructEvent.mockReturnValue(paid({ currency: "usd" }));
    await POST(req("ok"));
    expect(fulfil).not.toHaveBeenCalled();
  });

  it("does nothing when the session is not the one stored on the order", async () => {
    constructEvent.mockReturnValue(paid({ id: "cs_other" }));
    await POST(req("ok"));
    expect(fulfil).not.toHaveBeenCalled();
  });

  it("does nothing when the payment is not paid yet", async () => {
    constructEvent.mockReturnValue(paid({ payment_status: "unpaid" }));
    await POST(req("ok"));
    expect(fulfil).not.toHaveBeenCalled();
  });

  it("does nothing for a bank-transfer order (those are approved by an admin)", async () => {
    order = { ...order, method: "bank" };
    constructEvent.mockReturnValue(paid());
    await POST(req("ok"));
    expect(fulfil).not.toHaveBeenCalled();
  });
});
