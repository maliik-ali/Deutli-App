/**
 * Languages a student can get word meanings in. Keep the codes in sync with
 * the check on public.profiles.languages (migration 20261112000005).
 */
export const LANGUAGES = [
  { code: "en", name: "English", native: "English", rtl: false },
  { code: "ur", name: "Urdu", native: "اردو", rtl: true },
  { code: "hi", name: "Hindi", native: "हिन्दी", rtl: false },
  { code: "ar", name: "Arabic", native: "العربية", rtl: true },
  { code: "fa", name: "Persian", native: "فارسی", rtl: true },
  { code: "ps", name: "Pashto", native: "پښتو", rtl: true },
  { code: "bn", name: "Bengali", native: "বাংলা", rtl: false },
  { code: "tr", name: "Turkish", native: "Türkçe", rtl: false },
  { code: "es", name: "Spanish", native: "Español", rtl: false },
  { code: "fr", name: "French", native: "Français", rtl: false },
  { code: "it", name: "Italian", native: "Italiano", rtl: false },
  { code: "pt", name: "Portuguese", native: "Português", rtl: false },
  { code: "ru", name: "Russian", native: "Русский", rtl: false },
  { code: "zh", name: "Chinese", native: "中文", rtl: false },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as [LanguageCode, ...LanguageCode[]];
export const MAX_LANGUAGES = 3;
export const DEFAULT_LANGUAGES: LanguageCode[] = ["en"];

export function getLanguage(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

/** Keeps only known codes, without repeats, at most MAX_LANGUAGES. Falls back to English. */
export function cleanLanguages(value: unknown): LanguageCode[] {
  const list = Array.isArray(value) ? value : [];
  const codes = [...new Set(list.filter((c): c is LanguageCode => typeof c === "string" && !!getLanguage(c)))];
  return codes.length ? codes.slice(0, MAX_LANGUAGES) : DEFAULT_LANGUAGES;
}

/** Props for an element showing text in this language: direction, lang and the right font. */
export function textProps(code: string): { lang: string; dir: "rtl" | "ltr"; className: string } {
  const lang = getLanguage(code);
  return {
    lang: code,
    dir: lang?.rtl ? "rtl" : "ltr",
    className: code === "ur" ? "urdu" : code === "hi" ? "devanagari" : "",
  };
}
