-- Daily vocabulary activity (27 Nov 2026): how many answers a student gave each day, right and wrong.
-- It feeds "Your progress" on the Vocabulary page (accuracy this week, practice streak). Counted from now on.
-- Students read their own rows; nothing writes to the table except the function below (their own row, a recent day only).
-- Safe to run more than once.

create table if not exists public.vocab_activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  right_count integer not null default 0,
  wrong_count integer not null default 0,
  primary key (user_id, day)
);

alter table public.vocab_activity enable row level security;
revoke all on public.vocab_activity from anon, authenticated;
grant select on public.vocab_activity to authenticated;

drop policy if exists "Students read their own vocabulary activity" on public.vocab_activity;
create policy "Students read their own vocabulary activity" on public.vocab_activity for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.log_vocab_answer(p_right boolean, p_day date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then return; end if;
  -- The student's day comes from their own time zone, so allow a little either side of the server's date.
  if p_day < current_date - 2 or p_day > current_date + 2 then return; end if;
  insert into public.vocab_activity (user_id, day, right_count, wrong_count)
  values ((select auth.uid()), p_day, case when p_right then 1 else 0 end, case when p_right then 0 else 1 end)
  on conflict (user_id, day) do update
    set right_count = public.vocab_activity.right_count + excluded.right_count,
        wrong_count = public.vocab_activity.wrong_count + excluded.wrong_count;
end;
$$;
revoke all on function public.log_vocab_answer(boolean, date) from public, anon;
grant execute on function public.log_vocab_answer(boolean, date) to authenticated;
