-- 6) Vocabulary: words a student saves while reading (Daily Practice)
-- Each person has their own list. The Vocabulary page will use the same table.
-- Safe to run more than once.

create table if not exists public.vocabulary_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The word or short phrase exactly as the student selected it.
  word text not null check (char_length(word) between 1 and 80),
  -- What it means (the student can add this later).
  meaning text check (char_length(meaning) <= 200),
  -- The sentence it was found in, so it can be shown as an example.
  context text check (char_length(context) <= 500),
  track_id uuid references public.practice_tracks (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists vocabulary_words_user_idx on public.vocabulary_words (user_id, created_at desc);
create index if not exists vocabulary_words_track_idx on public.vocabulary_words (track_id);
-- The same word is saved only once per person (ignoring capital letters).
create unique index if not exists vocabulary_words_unique_idx on public.vocabulary_words (user_id, lower(word));

alter table public.vocabulary_words enable row level security;

revoke all on public.vocabulary_words from anon, authenticated;
grant select, insert, delete on public.vocabulary_words to authenticated;
-- Only the meaning can be changed after saving.
grant update (meaning) on public.vocabulary_words to authenticated;

drop policy if exists "Users can read their own words" on public.vocabulary_words;
create policy "Users can read their own words"
  on public.vocabulary_words for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can save their own words" on public.vocabulary_words;
create policy "Users can save their own words"
  on public.vocabulary_words for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can change their own words" on public.vocabulary_words;
create policy "Users can change their own words"
  on public.vocabulary_words for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete their own words" on public.vocabulary_words;
create policy "Users can delete their own words"
  on public.vocabulary_words for delete to authenticated
  using (user_id = (select auth.uid()));
