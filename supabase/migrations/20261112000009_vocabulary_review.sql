-- 12) Vocabulary page: mark words and review them with spaced repetition.
-- box: 0 = new … 5 = learned. A right answer moves the word up a box and sets the
-- next review further away (1, 3, 7, 14, 30 days); a wrong answer sends it back to box 0.
-- due_on: the day (Pakistan date) the word should be reviewed next.
-- Safe to run more than once.

alter table public.vocabulary_words
  add column if not exists starred boolean not null default false,
  add column if not exists box smallint not null default 0 check (box between 0 and 5),
  add column if not exists due_on date not null default current_date,
  add column if not exists reviewed_at timestamptz,
  add column if not exists right_count integer not null default 0 check (right_count >= 0),
  add column if not exists wrong_count integer not null default 0 check (wrong_count >= 0);

create index if not exists vocabulary_words_due_idx on public.vocabulary_words (user_id, due_on);

-- Students may change their own review progress and marks (RLS limits it to their own rows).
grant update (translations, dictionary_form, starred, box, due_on, reviewed_at, right_count, wrong_count)
  on public.vocabulary_words to authenticated;
