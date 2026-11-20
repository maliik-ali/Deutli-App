import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { adminNewFeedbackEmail, esc, paymentDetailsEmail, proActiveEmail } from "@/lib/email/templates";

describe("email templates", () => {
  it("never lets typed text add HTML", () => {
    expect(esc(`<script>alert("x")</script> & 'y'`)).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;");
    const m = proActiveEmail({ name: "<b>Evil</b> Name", planName: "3 <i>months</i>", until: "2027-02-14" });
    expect(m.html).not.toContain("<b>Evil</b>");
    expect(m.html).not.toContain("<i>months</i>");
  });

  it("tells the student the end date in plain words", () => {
    const m = proActiveEmail({ name: "Ayesha Khan", planName: "3 months", until: "2027-02-14" });
    expect(m.subject).toBe("Your Deutli Pro is active");
    expect(m.text).toContain("Hi Ayesha,");
    expect(m.text).toContain("14 February 2027");
  });

  it("names the order in the payment receipt", () => {
    const m = paymentDetailsEmail({ name: null, planName: "1 month", amount: 2299, reference: "DT-ABC234" });
    expect(m.subject).toContain("DT-ABC234");
    expect(m.text).toContain("Hi there,");
    expect(m.text).toContain("2,299");
  });

  it("keeps a long support message short in the inbox alert", () => {
    const m = adminNewFeedbackEmail({ kind: "problem", name: "A", email: "a@example.com", message: "x".repeat(5000), page: "/dashboard/upgrade" });
    expect(m.text.length).toBeLessThan(2600);
  });
});

describe("sendEmail", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  const mail = { to: "s@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi" };

  it("sends nothing when there is no key, and does not fail", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { sendEmail } = await import("@/lib/email/send");
    expect(await sendEmail(mail)).toEqual({ skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls Resend with the key, sender and reply-to", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Deutli <hello@deutli.com>");
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const { sendEmail } = await import("@/lib/email/send");
    expect(await sendEmail(mail)).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body)).toMatchObject({ from: "Deutli <hello@deutli.com>", to: ["s@example.com"], reply_to: "help@deutli.com" });
  });

  it("reports a refusal or a network error instead of throwing", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { sendEmail } = await import("@/lib/email/send");
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });
    expect("error" in (await sendEmail(mail))).toBe(true);
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect("error" in (await sendEmail(mail))).toBe(true);
  });
});
