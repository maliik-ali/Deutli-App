-- 25) Topics (categories) for the A1/A2/B1 word lists, e.g. "Kennenlernen", "Essen und Trinken".
-- Students learn a level topic by topic, in the topics' order. Words without a topic are
-- shown in sets of 50 until they get one.
-- Safe to run more than once.

create table if not exists public.level_topics (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('a1', 'a2', 'b1')),
  -- Order of the topic inside the level (lessons follow it).
  position integer not null default 0,
  -- The topic name as students see it, e.g. "Kennenlernen".
  name text not null check (char_length(name) between 1 and 80),
  -- The name in other languages, e.g. {"en": "Getting to know each other", "ur": "تعارف"}.
  translations jsonb not null default '{}'::jsonb
    check (jsonb_typeof(translations) = 'object' and pg_column_size(translations) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint level_topics_level_name_key unique (level, name)
);

create index if not exists level_topics_order_idx on public.level_topics (level, position);

alter table public.level_topics enable row level security;
revoke all on public.level_topics from anon, authenticated;
grant select on public.level_topics to authenticated;

drop policy if exists "Logged-in users can read level topics" on public.level_topics;
create policy "Logged-in users can read level topics"
  on public.level_topics for select to authenticated
  using (true);
-- No write policies: only the server's secret key (admin upload) writes.

-- Each word points to its topic. (The old free-text column level_words.topic is no longer used.)
alter table public.level_words
  add column if not exists topic_id uuid references public.level_topics (id) on delete set null;
create index if not exists level_words_topic_idx on public.level_words (topic_id);
