import "server-only";

import type { Mistake, MistakeType } from "./types";

/**
 * Free German grammar and spelling checker: LanguageTool (https://languagetool.org, open source).
 * The public server is free but has limits (20 requests/minute, no guarantees), so set
 * LANGUAGETOOL_URL to your own server later if the pilot grows. If it is down or slow,
 * we simply skip it — the AI check still works.
 */
const URL_DEFAULT = "https://api.languagetool.org/v2/check";

type LtMatch = {
  message: string;
  offset: number;
  length: number;
  replacements?: { value: string }[];
  rule?: { id?: string; issueType?: string; category?: { id?: string } };
};

function typeOf(m: LtMatch): MistakeType | null {
  const issue = (m.rule?.issueType ?? "").toLowerCase();
  const id = (m.rule?.id ?? "").toUpperCase();
  const cat = (m.rule?.category?.id ?? "").toUpperCase();
  if (issue === "whitespace" || issue === "typographical" || cat === "TYPOGRAPHY" || cat === "PUNCTUATION") return null;
  if (issue === "misspelling" || cat === "TYPOS") return "spelling";
  if (/WORD_ORDER|WORTSTELLUNG|ENDSTELLUNG|VERBEND|NEBENSATZ|VERB_ZWEITSTELLUNG/.test(id)) return "word_order";
  if (issue === "grammar" || cat === "GRAMMAR") return "grammar";
  return "style";
}

/** Returns the mistakes found, or null if the checker could not be reached. */
export async function checkGerman(text: string): Promise<Mistake[] | null> {
  try {
    const res = await fetch(process.env.LANGUAGETOOL_URL || URL_DEFAULT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ text: text.slice(0, 6000), language: "de-DE" }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { matches?: LtMatch[] };
    const out: Mistake[] = [];
    for (const m of json.matches ?? []) {
      const type = typeOf(m);
      if (!type) continue;
      out.push({
        start: m.offset,
        end: m.offset + m.length,
        type,
        message: m.message,
        fix: m.replacements?.[0]?.value ?? null,
        source: "rules",
      });
    }
    return out.slice(0, 30);
  } catch {
    return null;
  }
}
