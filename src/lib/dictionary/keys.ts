/**
 * Ways a selected word can be found in the offline dictionary, best match first.
 * Students often select "der Name", "Namen," or "Hallo!" — all should find "name"/"hallo".
 */
const ARTICLE = /^(der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines)\s+/;

export function dictionaryKeys(word: string): string[] {
  const base = word.trim().toLowerCase().replace(/\s+/g, " ");
  const noPunct = base.replace(/^[„"'»«‚(]+|[.,;:!?…"'“”»«)]+$/g, "").trim();
  const noArticle = noPunct.replace(ARTICLE, "").trim();
  return [...new Set([base, noPunct, noArticle])].filter((k) => k.length > 0 && k.length <= 80);
}

/** The key a German word is stored under (lower case, no article). */
export function wordKey(word: string): string {
  return dictionaryKeys(word).at(-1) ?? word.trim().toLowerCase();
}
