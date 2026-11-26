/**
 * Links on teacher and academy profiles: a website plus a short list of social pages.
 * Rules, checked when saving AND again when showing (so a value written around the app is never shown as a link):
 * https only, no user:password in the address, a known site for each social platform, at most 200 characters.
 * Pure code: runs on the server and in the browser.
 */

export const SOCIAL_SITES = [
  { key: "instagram", label: "Instagram", hosts: ["instagram.com"], placeholder: "instagram.com/your.school" },
  { key: "facebook", label: "Facebook", hosts: ["facebook.com", "fb.com", "fb.me"], placeholder: "facebook.com/yourschool" },
  { key: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be"], placeholder: "youtube.com/@yourchannel" },
  { key: "tiktok", label: "TikTok", hosts: ["tiktok.com"], placeholder: "tiktok.com/@yourname" },
  { key: "linkedin", label: "LinkedIn", hosts: ["linkedin.com"], placeholder: "linkedin.com/in/yourname" },
  { key: "whatsapp", label: "WhatsApp", hosts: ["wa.me", "whatsapp.com"], placeholder: "wa.me/491512345678" },
] as const;

export type SocialKey = (typeof SOCIAL_SITES)[number]["key"];
export type SocialLinks = Partial<Record<SocialKey, string>>;
export type ProfileLink = { key: "website" | SocialKey; label: string; url: string };

const MAX_URL = 200;

/** Turns what a person typed ("instagram.com/x", "https://…") into a clean https address, or null if it is not allowed. */
function normalise(raw: string, hosts?: readonly string[]): string | null {
  const t = raw.trim();
  if (!t || t.length > MAX_URL || /\s/.test(t)) return null;
  const withScheme = /^https?:\/\//i.test(t) ? t.replace(/^http:\/\//i, "https://") : /^[a-z][a-z0-9+.-]*:/i.test(t) ? "" : `https://${t}`;
  if (!withScheme) return null; // javascript:, data:, mailto: and friends
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password || !u.hostname.includes(".")) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (hosts && !hosts.some((h) => host === h || host.endsWith(`.${h}`))) return null;
  const out = u.toString();
  return out.length <= MAX_URL ? out : null;
}

export const cleanWebsite = (raw: string) => normalise(raw);

export function cleanSocial(key: SocialKey, raw: string): string | null {
  const site = SOCIAL_SITES.find((s) => s.key === key);
  return site ? normalise(raw, site.hosts) : null;
}

/** For saving: every filled field must be a valid address. Returns clean values or a plain message naming the field. */
export function checkLinks(input: { website?: string; social?: Partial<Record<SocialKey, string>> }): { error: string } | { website: string | null; social: SocialLinks } {
  let website: string | null = null;
  if (input.website?.trim()) {
    website = cleanWebsite(input.website);
    if (!website) return { error: "The website must be a normal web address, like www.yourschool.com." };
  }
  const social: SocialLinks = {};
  for (const s of SOCIAL_SITES) {
    const raw = input.social?.[s.key];
    if (!raw?.trim()) continue;
    const url = cleanSocial(s.key, raw);
    if (!url) return { error: `The ${s.label} link must be an address on ${s.hosts[0]}, like ${s.placeholder}.` };
    social[s.key] = url;
  }
  return { website, social };
}

/** For showing: only links that pass the rules, in a fixed order, ready to render. */
export function toProfileLinks(website: unknown, social: unknown): ProfileLink[] {
  const out: ProfileLink[] = [];
  const site = typeof website === "string" ? cleanWebsite(website) : null;
  if (site) out.push({ key: "website", label: "Website", url: site });
  if (social && typeof social === "object" && !Array.isArray(social)) {
    for (const s of SOCIAL_SITES) {
      const raw = (social as Record<string, unknown>)[s.key];
      const url = typeof raw === "string" ? cleanSocial(s.key, raw) : null;
      if (url) out.push({ key: s.key, label: s.label, url });
    }
  }
  return out;
}
