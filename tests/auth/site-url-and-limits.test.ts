import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "evil.example" }) }));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe("siteUrl", () => {
  it("uses SITE_URL when it is set", async () => {
    vi.stubEnv("SITE_URL", "https://app.deutli.com/");
    const { siteUrl } = await import("@/lib/site-url");
    expect(await siteUrl()).toBe("https://app.deutli.com");
  });
  it("refuses to trust the request address on the live site", async () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("VERCEL_ENV", "production");
    const { siteUrl } = await import("@/lib/site-url");
    await expect(siteUrl()).rejects.toThrow("SITE_URL");
  });
});

describe("rate limiter", () => {
  const load = async (rpc: () => Promise<{ data: unknown; error: unknown }>) => {
    vi.doMock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));
    return (await import("@/lib/rate-limit")).allow;
  };
  it("blocks when the database says the limit is used up", async () => {
    expect(await (await load(async () => ({ data: false, error: null })))("k", 1, 60)).toBe(false);
  });
  it("allows when the database says yes", async () => {
    expect(await (await load(async () => ({ data: true, error: null })))("k", 1, 60)).toBe(true);
  });
  it("lets people through (and logs) if the limiter itself breaks", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await (await load(async () => ({ data: null, error: { message: "boom" } })))("k", 1, 60)).toBe(true);
    expect(log).toHaveBeenCalled();
  });
});
