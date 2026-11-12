import { getLanguage, LANGUAGES, type LanguageCode } from "@/lib/languages";

/** Reads CSV text into rows of cells. Handles quotes, commas or semicolons (Excel), and a BOM. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export type DictionaryRow = {
  line: number;
  german: string;
  article: "der" | "die" | "das" | null;
  plural: string | null;
  translations: Partial<Record<LanguageCode, string>>;
};

export type ParsedSheet = {
  rows: DictionaryRow[];
  problems: { line: number; reason: string }[];
  languages: LanguageCode[];
};

/** Matches a header like "en", "English" or "Urdu (ur)" to a language code. */
function languageForHeader(header: string): LanguageCode | null {
  const h = header.trim().toLowerCase();
  if (getLanguage(h)) return h as LanguageCode;
  const byName = LANGUAGES.find((l) => h === l.name.toLowerCase() || h.startsWith(`${l.name.toLowerCase()} `));
  return byName?.code ?? null;
}

export const MAX_ROWS = 5000;

/** Turns sheet rows into dictionary rows. The first row must be the header. */
export function readDictionarySheet(text: string): ParsedSheet | { error: string } {
  const table = parseCsv(text);
  if (table.length < 2) return { error: "The file is empty. Add a header row and at least one word." };

  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = (names: string[]) => header.findIndex((h) => names.includes(h));
  const germanCol = col(["german", "deutsch", "word", "wort"]);
  if (germanCol < 0) return { error: 'The first row needs a column called "german".' };
  const articleCol = col(["article", "artikel"]);
  const pluralCol = col(["plural"]);
  const languageCols = header
    .map((h, i) => ({ i, code: languageForHeader(h) }))
    .filter((c): c is { i: number; code: LanguageCode } => c.code !== null);
  if (languageCols.length === 0) {
    return { error: 'Add at least one language column, for example "en" or "ur".' };
  }
  if (table.length - 1 > MAX_ROWS) {
    return { error: `The file has ${table.length - 1} words. Upload at most ${MAX_ROWS} at a time.` };
  }

  const rows: DictionaryRow[] = [];
  const problems: { line: number; reason: string }[] = [];
  const seen = new Set<string>();
  table.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const get = (i: number) => (i >= 0 ? (cells[i] ?? "").trim() : "");
    const german = get(germanCol);
    if (!german) return problems.push({ line, reason: "No German word." });
    if (german.length > 80) return problems.push({ line, reason: "German word is too long (max 80 letters)." });

    const rawArticle = get(articleCol).toLowerCase();
    if (rawArticle && !["der", "die", "das"].includes(rawArticle)) {
      return problems.push({ line, reason: `Article must be der, die or das (found "${rawArticle}").` });
    }
    const plural = get(pluralCol) || null;
    if (plural && plural.length > 80) return problems.push({ line, reason: "Plural is too long (max 80 letters)." });

    const translations: Partial<Record<LanguageCode, string>> = {};
    for (const { i, code } of languageCols) {
      const value = get(i);
      if (value.length > 200)
        return problems.push({ line, reason: `Meaning in ${code} is too long (max 200 letters).` });
      if (value) translations[code] = value;
    }
    if (Object.keys(translations).length === 0) return problems.push({ line, reason: "No meaning in any language." });

    const key = german.toLowerCase();
    if (seen.has(key)) return problems.push({ line, reason: `"${german}" appears twice; the first one is used.` });
    seen.add(key);
    rows.push({ line, german, article: (rawArticle || null) as DictionaryRow["article"], plural, translations });
  });

  return { rows, problems, languages: [...new Set(languageCols.map((c) => c.code))] };
}
