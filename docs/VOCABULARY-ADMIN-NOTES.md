# Vocabulary: admin and database notes

For Malik and developers. Not for the AI agent (its brief is `VOCABULARY-AI-BRIEF.md`).

## Admin notes
- Upload limit: 5000 rows per file. Commas and semicolons both work.
- Meanings uploaded from a sheet win over AI translations, so skim the Urdu column in Excel or Google Sheets before you upload.
- Template: `public/templates/word-dictionary-template.csv`.

## Database structure (for developers)
Table `public.word_dictionary`, shared by all students. Only the server writes to it, using the secret key.

| Column | Type | Meaning |
|---|---|---|
| `word_key` | text, primary key | The word in lowercase, 1–80 characters (e.g. `mietvertrag`). |
| `dictionary_form` | text | The base form, up to 120 characters. |
| `translations` | jsonb | An object by language code, e.g. `{"en": "rental contract", "ur": "کرایہ نامہ"}`. Maximum about 8 KB. |
| `source` | text | `'sheet'` (admin-checked) or `'ai'`. |
| `created_at`, `updated_at` | timestamptz | Set automatically. |

A student's own saved words live in a different table, `vocabulary_words`, with one row per user and word. Don't insert into `word_dictionary` from the browser: Row Level Security blocks it, and the CSV upload does the same job safely.
