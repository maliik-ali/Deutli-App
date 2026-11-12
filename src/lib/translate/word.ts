import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { getLanguage, type LanguageCode } from "@/lib/languages";

const MODEL = "claude-haiku-5-5";

export type WordTranslation = {
  /** The word as it appears in a dictionary, e.g. "der Arbeitsbereich". */
  dictionaryForm: string | null;
  /** Short meaning per language code. */
  translations: Partial<Record<LanguageCode, string>>;
};

let client: Anthropic | null = null;
function getClient() {
  // The key is read only on the server, at runtime. Without it, translation is simply skipped.
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ timeout: 20_000, maxRetries: 1 });
  return client;
}

const SYSTEM = `You help German learners (level A2–B1) understand words they pick while reading.
You get a German word or short phrase and the sentence it came from.
Give:
- dictionary_form: the dictionary form. Nouns in singular with article ("der Arbeitsbereich"), verbs in the infinitive ("sich freuen"), adjectives without endings. For a phrase, keep the phrase in its basic form.
- a short meaning for each requested language, as it is meant in that sentence: one to four words, like a dictionary entry, no explanations, no quotation marks. Write each meaning in that language's normal script.`;

/** Translates a saved word into the given languages. Returns null if translation is not available. */
export async function translateWord(
  word: string,
  context: string | null,
  languages: LanguageCode[]
): Promise<WordTranslation | null> {
  const anthropic = getClient();
  if (!anthropic || languages.length === 0) return null;

  const schema = z.object({
    dictionary_form: z.string(),
    meanings: z.object(Object.fromEntries(languages.map((code) => [code, z.string()]))),
  });
  const names = languages.map((code) => `${code} (${getLanguage(code)?.name ?? code})`).join(", ");

  try {
    const response = await anthropic.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: "low", format: zodOutputFormat(schema) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Word: ${word}\nSentence: ${context || "(none)"}\nLanguages: ${names}`,
        },
      ],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return null;

    const out = response.parsed_output;
    const translations: Partial<Record<LanguageCode, string>> = {};
    for (const code of languages) {
      const meaning = String(out.meanings[code] ?? "").trim().slice(0, 200);
      if (meaning) translations[code] = meaning;
    }
    const dictionaryForm = out.dictionary_form.trim().slice(0, 120) || null;
    return { dictionaryForm, translations };
  } catch (error) {
    console.error("translateWord failed", error instanceof Anthropic.APIError ? error.status : error);
    return null;
  }
}
