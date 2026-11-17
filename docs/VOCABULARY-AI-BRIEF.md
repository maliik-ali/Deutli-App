# Brief: German A1 / A2 / B1 vocabulary CSV for Deutli

## Context
Deutli is a German exam-prep app (A1, A2 and B1) for students in Pakistan, who speak Urdu and English. You will create vocabulary lists that the admin uploads as a CSV file at `/admin/dictionary`. Students see these meanings when they save words while reading or listening.

## Your task
Create a CSV file of German vocabulary on the topic and level I give you. I will say the **level (A1, A2 or B1)**, the topic and the number of words, for example "B1, Wohnen, 100 words".

## Output format (strict)
- Output only the CSV. No explanations, no markdown code fences, no extra text.
- The first row is exactly: `german,article,plural,en,ur`
- One word per row, UTF-8 text.
- Put quotes around any cell that contains a comma.

## Columns
| Column | Rule |
|---|---|
| `german` | Dictionary form. Nouns are capitalized with no article in this cell. Verbs are in the infinitive. Adjectives are in the base form. |
| `article` | `der`, `die` or `das` for nouns only. Leave it empty for verbs, adjectives and other words. |
| `plural` | The plural form for nouns. Leave it empty if there is none or the word is not a noun. |
| `en` | Short, natural English meaning, max 4 words. Verbs start with "to" (e.g. `to rent`). |
| `ur` | The Urdu meaning in Urdu script, short and natural, the way a student would say it. Not transliteration. |

## Example
```
german,article,plural,en,ur
Mietvertrag,der,Mietverträge,rental contract,کرایہ نامہ
Kaffeeküche,die,Kaffeeküchen,coffee kitchen,کافی کچن
mieten,,,to rent,کرایہ پر لینا
```

## Quality rules
- Stay strictly at the level I ask for (A1, A2 or B1), based on the CEFR word lists of Goethe, telc and ÖSD. Don't mix in words from a higher level, and don't repeat words from the lower levels unless I ask. Never go above B1.
- Check that the article and plural are correct. If you are not sure about a word, leave it out.
- No duplicates, and no multi-word phrases unless they are fixed expressions.
- If a word has several meanings, give the most common one for that level.
- Keep the German spelling correct, including ä, ö, ü and ß.
- Don't invent words.

## If I ask for another language
Add a column with its language code after `ur`, for example `hi` for Hindi, and follow the same rules.

## Before you answer
Check each row: the header is correct, every row has 5 columns, and the articles are only der, die or das.
