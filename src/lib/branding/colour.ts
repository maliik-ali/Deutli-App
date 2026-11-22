/** Colour maths for school branding. Pure code: runs on the server and in the browser (live preview). */

const NAVY_CARD = "#0b1739"; // card surface of the app, where readable accent text sits
const NAVY_BG = "#081028";

export const hexOk = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/.test(v);
export const normaliseHex = (v: string) => {
  const t = v.trim().toLowerCase();
  const full = /^#[0-9a-f]{3}$/.test(t) ? `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}` : t;
  return hexOk(full) ? full : null;
};

const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = (c: number[]) => `#${c.map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: string, b: string, t: number) => {
  const x = rgb(a), y = rgb(b);
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t));
};

function luminance(h: string): number {
  const [r, g, b] = rgb(h).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours (1 to 21). */
export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** The main colour carries white button text, so it must reach 4.5:1 (WCAG AA). Returns a plain message if not. */
export function primaryProblem(hex: string): string | null {
  const c = contrast(hex, "#ffffff");
  return c >= 4.5 ? null : `White text on this colour is hard to read (contrast ${c.toFixed(1)}, needs 4.5). Choose a darker colour.`;
}
/** The accent only colours the end of the gradient and small details, so 3:1 is enough. */
export function accentProblem(hex: string): string | null {
  const c = contrast(hex, "#ffffff");
  return c >= 3 ? null : `This accent is too light next to white (contrast ${c.toFixed(1)}, needs 3). Choose a darker colour.`;
}

/** The CSS variables a workspace's colours replace. Everything in the app takes its colour from these tokens. */
export function themeVars(primary: string, accent: string): Record<string, string> {
  // Readable text colour on the dark card: lighten the main colour until it reaches 4.5:1.
  let ink = primary;
  for (let t = 0; t <= 1 && contrast(ink, NAVY_CARD) < 4.5; t += 0.05) ink = mix(primary, "#ffffff", t);
  return {
    "--gold": primary,
    "--gold-ink": ink,
    "--gold-soft": mix(NAVY_BG, primary, 0.28),
    "--ring": ink,
    "--brand-magenta": accent,
    "--brand-gradient": `linear-gradient(135deg, ${primary} 30%, ${accent} 91%)`,
  };
}

export const FONT_OPTIONS = [
  { key: "default", label: "Deutli standard (Figtree)", css: "var(--font-figtree)" },
  { key: "inter", label: "Inter", css: "var(--font-inter)" },
  { key: "poppins", label: "Poppins", css: "var(--font-poppins)" },
  { key: "nunito", label: "Nunito", css: "var(--font-nunito)" },
] as const;
export type FontKey = (typeof FONT_OPTIONS)[number]["key"];
