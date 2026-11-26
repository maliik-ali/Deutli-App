import { describe, expect, it } from "vitest";

import { checkLinks, cleanSocial, cleanWebsite, toProfileLinks } from "@/lib/profile/links";

describe("profile links", () => {
  it("adds https and keeps good addresses", () => {
    expect(cleanWebsite("www.myschool.com")).toBe("https://www.myschool.com/");
    expect(cleanWebsite("https://myschool.com/about")).toBe("https://myschool.com/about");
    expect(cleanWebsite("http://myschool.com")).toBe("https://myschool.com/");
  });
  it("refuses other schemes, spaces, secrets in the address and non-sites", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "mailto:a@b.com", "ftp://x.com", "my school.com", "https://user:pw@x.com", "localhost", "", "x".repeat(250)]) {
      expect(cleanWebsite(bad)).toBeNull();
    }
  });
  it("each social link must be on its own site", () => {
    expect(cleanSocial("instagram", "instagram.com/my.school")).toBe("https://instagram.com/my.school");
    expect(cleanSocial("instagram", "https://evil.com/instagram.com")).toBeNull();
    expect(cleanSocial("youtube", "https://m.youtube.com/@x")).toBe("https://m.youtube.com/@x");
    expect(cleanSocial("youtube", "https://notyoutube.com/@x")).toBeNull();
    expect(cleanSocial("whatsapp", "wa.me/491512345678")).toBe("https://wa.me/491512345678");
  });
  it("checkLinks names the field that is wrong", () => {
    expect(checkLinks({ website: "ok.com", social: { facebook: "twitter.com/x" } })).toEqual({ error: expect.stringContaining("Facebook") });
    expect(checkLinks({ social: { tiktok: "tiktok.com/@a" } })).toEqual({ website: null, social: { tiktok: "https://tiktok.com/@a" } });
  });
  it("shows only links that pass, in a fixed order", () => {
    const out = toProfileLinks("javascript:alert(1)", { youtube: "https://youtube.com/@a", instagram: "https://evil.com", facebook: "https://facebook.com/a", junk: "x" });
    expect(out.map((l) => l.key)).toEqual(["facebook", "youtube"]);
    expect(toProfileLinks(null, [])).toEqual([]);
  });
});
