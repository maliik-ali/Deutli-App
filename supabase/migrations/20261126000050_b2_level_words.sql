-- B2 vocabulary list (26 Nov 2026): level lists now accept 'b2' as well as a1, a2, b1.
-- Safe to run more than once.
alter table public.level_words drop constraint if exists level_words_level_check;
alter table public.level_words add constraint level_words_level_check check (level in ('a1', 'a2', 'b1', 'b2'));
alter table public.level_topics drop constraint if exists level_topics_level_check;
alter table public.level_topics add constraint level_topics_level_check check (level in ('a1', 'a2', 'b1', 'b2'));
