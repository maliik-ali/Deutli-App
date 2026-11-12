-- 9) Shared word dictionary + daily translation limit.
-- word_dictionary: each German word is translated by AI only once; every student reuses it.
--   Only the server (secret key) writes here, so students cannot change shared meanings.
-- translation_usage: how many AI translations each student used per day (Pakistan date).
-- Safe to run more than once.

create table if not exists public.word_dictionary (
  -- The word in lower case, e.g. "arbeitsbereiche".
  word_key text primary key check (char_length(word_key) between 1 and 80),
  dictionary_form text check (char_length(dictionary_form) <= 120),
  translations jsonb not null default '{}'::jsonb
    check (jsonb_typeof(translations) = 'object' and pg_column_size(translations) <= 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.word_dictionary enable row level security;
revoke all on public.word_dictionary from anon, authenticated;
grant select on public.word_dictionary to authenticated;

drop policy if exists "Logged-in users can read the dictionary" on public.word_dictionary;
create policy "Logged-in users can read the dictionary"
  on public.word_dictionary for select to authenticated
  using (true);
-- No insert/update/delete policies: only the server's secret key (which bypasses RLS) writes.

create table if not exists public.translation_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  used integer not null default 0 check (used >= 0),
  primary key (user_id, day)
);

alter table public.translation_usage enable row level security;
revoke all on public.translation_usage from anon, authenticated;
grant select on public.translation_usage to authenticated;

drop policy if exists "Users can read their own usage" on public.translation_usage;
create policy "Users can read their own usage"
  on public.translation_usage for select to authenticated
  using (user_id = (select auth.uid()));
-- No write policies: only the server counts usage, through the function below.

-- Counts one AI translation for a student, if they are under the daily limit.
-- Returns true when allowed. Only the server (service_role) may call it.
create or replace function public.use_translation(p_user uuid, p_day date, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_used integer;
begin
  insert into public.translation_usage as u (user_id, day, used)
  values (p_user, p_day, 1)
  on conflict (user_id, day) do update set used = u.used + 1
    where u.used < p_limit
  returning u.used into new_used;
  return new_used is not null;
end;
$$;

revoke all on function public.use_translation(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.use_translation(uuid, date, integer) to service_role;
