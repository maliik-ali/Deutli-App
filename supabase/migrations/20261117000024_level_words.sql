-- 24) Level vocabulary (A1, A2, B1): word lists the admin uploads as CSV.
-- Students pick a level on the Vocabulary page, learn the words topic by topic
-- in small lessons, and review them with the same spaced repetition as saved words.
-- A student's progress on a level word is a normal row in vocabulary_words
-- (matched by the German word), with source = 'level'.
-- Safe to run more than once.

create table if not exists public.level_words (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('a1', 'a2', 'b1')),
  -- Order in the list (the order of the sheet). Lessons follow this order.
  position integer not null default 0,
  -- Topic / category, e.g. "Kapitel 1 · Hallo" or "Wohnen". Lessons stay inside one topic.
  topic text check (char_length(topic) <= 80),
  german text not null check (char_length(german) between 1 and 80),
  -- The German word in lower case; one entry per word and level.
  word_key text not null check (char_length(word_key) between 1 and 80),
  article text check (article in ('der', 'die', 'das')),
  plural text check (char_length(plural) <= 80),
  -- Meanings by language code, e.g. {"en": "name", "ur": "نام"}.
  translations jsonb not null default '{}'::jsonb
    check (jsonb_typeof(translations) = 'object' and pg_column_size(translations) <= 8000),
  -- Example sentences by language code, e.g. {"de": "Wie ist Ihr Name?", "en": "What is your name?"}.
  examples jsonb not null default '{}'::jsonb
    check (jsonb_typeof(examples) = 'object' and pg_column_size(examples) <= 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.level_words drop constraint if exists level_words_level_word_key;
alter table public.level_words add constraint level_words_level_word_key unique (level, word_key);
create index if not exists level_words_order_idx on public.level_words (level, position);

alter table public.level_words enable row level security;
revoke all on public.level_words from anon, authenticated;
grant select on public.level_words to authenticated;

drop policy if exists "Logged-in users can read level words" on public.level_words;
create policy "Logged-in users can read level words"
  on public.level_words for select to authenticated
  using (true);
-- No insert/update/delete policies: only the server's secret key (admin upload) writes.

-- Where a student's word came from: 'reading' (saved in Improve Accent) or 'level' (learned from a level list).
alter table public.vocabulary_words
  add column if not exists source text not null default 'reading' check (source in ('reading', 'level'));
