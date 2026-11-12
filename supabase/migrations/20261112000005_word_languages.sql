-- 8) Meanings in each student's own languages (auto-translated).
-- profiles.languages: the languages a student wants meanings in (1 to 3, e.g. {en,ur}).
-- vocabulary_words.translations: meanings by language code, e.g. {"en": "work area", "ur": "کام کی جگہ"}.
-- vocabulary_words.dictionary_form: the word as in a dictionary, e.g. "der Arbeitsbereich".
-- Safe to run more than once.

-- Languages on the profile ---------------------------------------------------
alter table public.profiles
  add column if not exists languages text[] not null default '{en}';

alter table public.profiles drop constraint if exists profiles_languages_check;
alter table public.profiles add constraint profiles_languages_check check (
  cardinality(languages) between 1 and 3
  and languages <@ array['en','ur','hi','ar','fa','ps','bn','tr','es','fr','it','pt','ru','zh']::text[]
);

-- Students may change their own languages (the existing update policy limits it to their own row).
grant update (full_name, phone, languages) on public.profiles to authenticated;

-- Meanings on saved words ----------------------------------------------------
alter table public.vocabulary_words
  add column if not exists translations jsonb not null default '{}'::jsonb,
  add column if not exists dictionary_form text check (char_length(dictionary_form) <= 120);

alter table public.vocabulary_words drop constraint if exists vocabulary_words_translations_check;
alter table public.vocabulary_words add constraint vocabulary_words_translations_check check (
  jsonb_typeof(translations) = 'object' and pg_column_size(translations) <= 4000
);

-- Move meanings typed earlier into the new column, then remove the old columns.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'vocabulary_words' and column_name = 'meaning') then
    update public.vocabulary_words
      set translations = translations
        || case when meaning is not null then jsonb_build_object('en', meaning) else '{}'::jsonb end
        || case when meaning_ur is not null then jsonb_build_object('ur', meaning_ur) else '{}'::jsonb end
      where meaning is not null or meaning_ur is not null;
    alter table public.vocabulary_words drop column meaning;
    alter table public.vocabulary_words drop column if exists meaning_ur;
  end if;
end $$;

-- Only the meanings and the dictionary form can be changed after saving.
revoke update on public.vocabulary_words from authenticated;
grant update (translations, dictionary_form) on public.vocabulary_words to authenticated;
