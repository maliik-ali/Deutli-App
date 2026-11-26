-- Spaced review for verbs (27 Nov 2026): the same review boxes as the word lists.
-- box 0 = new, 5 = learned; due_on = the day the verb comes back (the student's own date).
-- Safe to run more than once.
alter table public.verb_progress add column if not exists box smallint not null default 0 check (box between 0 and 5);
alter table public.verb_progress add column if not exists due_on date;
create index if not exists verb_progress_due_idx on public.verb_progress (user_id, due_on);
-- RLS is unchanged: students read and write only their own rows.
