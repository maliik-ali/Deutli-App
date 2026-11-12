-- 10) Where a dictionary entry came from: 'sheet' (uploaded by an admin, checked) or 'ai'.
-- Sheet meanings always win; AI only fills languages that are still missing.
-- Safe to run more than once.

alter table public.word_dictionary
  add column if not exists source text not null default 'ai' check (source in ('ai', 'sheet'));

create index if not exists word_dictionary_updated_idx on public.word_dictionary (updated_at desc);
