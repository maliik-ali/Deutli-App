-- 7) Vocabulary: a separate Urdu meaning next to the English one.
-- "meaning" stays the English meaning; "meaning_ur" is the Urdu meaning (shown in Nastaliq).
-- Safe to run more than once.

alter table public.vocabulary_words
  add column if not exists meaning_ur text check (char_length(meaning_ur) <= 200);

-- Only the meanings can be changed after saving.
grant update (meaning, meaning_ur) on public.vocabulary_words to authenticated;
