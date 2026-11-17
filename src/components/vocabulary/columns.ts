import { getLanguage, type LanguageCode } from "@/lib/languages";

// Shared by the server page and the client table, so it must not live in a "use client" file.

export type ColumnId = `meaning:${string}` | `example:${string}` | "from" | "progress";
export type Column = { id: ColumnId; label: string };

/** Columns a list can show, from the languages and examples it has. */
export function buildColumns(opts: {
  languages: LanguageCode[];
  exampleLanguages: string[];
  fromLabel: string;
}): Column[] {
  return [
    ...opts.languages.map((c) => ({ id: `meaning:${c}` as ColumnId, label: `${getLanguage(c)?.name ?? c} meaning` })),
    ...opts.exampleLanguages.map((c) => ({
      id: `example:${c}` as ColumnId,
      label: c === "de" ? "German sentence" : `${getLanguage(c)?.name ?? c} sentence`,
    })),
    { id: "from", label: opts.fromLabel },
    { id: "progress", label: "Progress" },
  ];
}
