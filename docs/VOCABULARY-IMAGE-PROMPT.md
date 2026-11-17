# Prompt: vocabulary table from an image

Use this with any AI tool that accepts images. Upload a photo or screenshot of a German vocabulary page, then paste the prompt below. The result is a CSV you can upload at `/admin/dictionary`.

---

## Prompt

I am uploading an image of a German vocabulary page (a textbook page, word list or notes). Extract every German word or fixed expression you can see and give me its English meaning, as a CSV table.

**Output format (strict)**
- Output only the CSV. No explanations, no markdown code fences, no extra text.
- The first row is exactly: `german,article,plural,en`
- One word per row, UTF-8 text.
- Put quotes around any cell that contains a comma.

**Columns**
| Column | Rule |
|---|---|
| `german` | Dictionary form. Nouns are capitalized with no article in this cell. Verbs are in the infinitive. Adjectives are in the base form. |
| `article` | `der`, `die` or `das` for nouns only. Leave it empty for other words. |
| `plural` | The plural form for nouns. If the image shows it, use that. Leave it empty for other words. |
| `en` | Short, natural English meaning, max 4 words. Verbs start with "to" (e.g. `to rent`). |

**Rules**
- Only use words that are really in the image. Don't add words that aren't there.
- If the image already shows a translation, check it. If it is wrong, give the correct one.
- If a word is blurry or you can't read it, skip it. Don't guess.
- If the image shows words inside example sentences, extract only the important vocabulary words, not every word of the sentence.
- Fix obvious typos and keep the German spelling correct, including ä, ö, ü and ß.
- If the article or plural is not shown and you are not sure, leave the cell empty. Don't guess.
- No duplicates.
- If the image has a level (A1, A2 or B1), keep to it. Don't add words from other levels.

**Example output**
```
german,article,plural,en
Mietvertrag,der,Mietverträge,rental contract
Kaffeeküche,die,Kaffeeküchen,coffee kitchen
mieten,,,to rent
```

After the CSV, on a new line, write `UNCLEAR:` and list any words you skipped because they were unreadable. If there are none, write `UNCLEAR: none`.

---

## Optional: add Urdu

To get Urdu meanings too, change the header to `german,article,plural,en,ur` and add this rule:
`ur`: the Urdu meaning in Urdu script, short and natural, not transliteration.

## Before you upload to Deutli
- Delete the `UNCLEAR:` line from the file before you upload it.
- Skim the English column in Excel or Google Sheets. Meanings from a sheet win over AI translations, so a mistake would stay in the dictionary until you fix it.
- Only upload vocabulary you are allowed to use. Don't upload publisher word lists from books you don't own the rights to.
