import { getLanguage, LANGUAGES, type LanguageCode } from "@/lib/languages";
import { parseCsv } from "@/lib/dictionary/csv";

export type VerbRow = {
  line: number;
  key: string;
  german: string;
  praesens: string | null;
  praeteritum: string | null;
  perfekt: string | null;
  preposition: string | null;
  verbCase: string | null;
  translations: Partial<Record<LanguageCode, string>>;
  exampleDe: string | null;
  exampleTranslations: Partial<Record<LanguageCode, string>>;
};

export const MAX_VERBS = 2000;

function languageFor(header: string): LanguageCode | null {
  const h = header.trim().toLowerCase();
  if (getLanguage(h)) return h as LanguageCode;
  return LANGUAGES.find((l) => h === l.name.toLowerCase())?.code ?? null;
}

/**
 * Reads the verbs sheet: german, praesens, praeteritum, perfekt, preposition, case, one column per language
 * (en, ur…), example_de and example_de_<language> (the translation of the example).
 */
export function readVerbsSheet(text: string): { rows: VerbRow[]; problems: { line: number; reason: string }[] } | { error: string } {
  const table = parseCsv(text);
  if (table.length < 2) return { error: "The file is empty. Add a header row and at least one verb." };
  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = (names: string[]) => header.findIndex((h) => names.includes(h));
  const germanCol = col(["german", "deutsch", "verb", "infinitiv"]);
  if (germanCol < 0) return { error: 'The first row needs a column called "german".' };
  const praesensCol = col(["praesens", "präsens"]);
  const praeteritumCol = col(["praeteritum", "präteritum"]);
  const perfektCol = col(["perfekt"]);
  const prepCol = col(["preposition", "präposition"]);
  const caseCol = col(["case", "kasus"]);
  const exampleCol = col(["example_de", "example", "beispiel"]);
  const exampleLangCols = header.map((h, i) => ({ i, code: h.startsWith("example_de_") ? languageFor(h.slice("example_de_".length)) : null })).filter((c): c is { i: number; code: LanguageCode } => c.code !== null);
  const known = new Set([germanCol, praesensCol, praeteritumCol, perfektCol, prepCol, caseCol, exampleCol, ...exampleLangCols.map((c) => c.i)]);
  const langCols = header.map((h, i) => ({ i, code: known.has(i) ? null : languageFor(h) })).filter((c): c is { i: number; code: LanguageCode } => c.code !== null);
  if (langCols.length === 0) return { error: 'Add at least one language column, for example "en" or "ur".' };
  if (table.length - 1 > MAX_VERBS) return { error: `The file has ${table.length - 1} verbs. Upload at most ${MAX_VERBS} at a time.` };

  const rows: VerbRow[] = [];
  const problems: { line: number; reason: string }[] = [];
  const seen = new Set<string>();
  table.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const get = (i: number) => (i >= 0 ? (cells[i] ?? "").trim() : "");
    const german = get(germanCol);
    if (!german) return problems.push({ line, reason: "No verb." });
    if (german.length > 40) return problems.push({ line, reason: "The verb is too long (max 40 letters)." });
    const translations: Partial<Record<LanguageCode, string>> = {};
    for (const { i, code } of langCols) {
      const v = get(i);
      if (v.length > 200) return problems.push({ line, reason: `Meaning in ${code} is too long (max 200 letters).` });
      if (v) translations[code] = v;
    }
    if (Object.keys(translations).length === 0) return problems.push({ line, reason: "No meaning in any language." });
    const exampleDe = get(exampleCol) || null;
    if (exampleDe && exampleDe.length > 300) return problems.push({ line, reason: "Example sentence is too long (max 300 letters)." });
    const exampleTranslations: Partial<Record<LanguageCode, string>> = {};
    for (const { i, code } of exampleLangCols) if (get(i)) exampleTranslations[code] = get(i).slice(0, 300);
    const forms = [get(praesensCol), get(praeteritumCol), get(perfektCol)];
    if (forms.some((f) => f.length > 60)) return problems.push({ line, reason: "A verb form is too long (max 60 letters)." });
    const preposition = get(prepCol) || null;
    const verbCase = get(caseCol) || null;
    if ((preposition?.length ?? 0) > 20 || (verbCase?.length ?? 0) > 20) return problems.push({ line, reason: "Preposition or case is too long." });

    const key = [german, preposition ?? "", verbCase ?? "", translations.en ?? Object.values(translations)[0] ?? ""].join("|").toLowerCase();
    if (seen.has(key)) return problems.push({ line, reason: `"${german}" appears twice with the same meaning; the first one is used.` });
    seen.add(key);
    rows.push({ line, key, german, praesens: forms[0] || null, praeteritum: forms[1] || null, perfekt: forms[2] || null, preposition, verbCase, translations, exampleDe, exampleTranslations });
  });
  return { rows, problems };
}
