-- 1) Section timers survive a reload: the seconds spent per section are saved with the attempt.
alter table public.mock_attempts add column if not exists timer jsonb not null default '{}';
grant update (answers, writing, timer) on public.mock_attempts to authenticated;

-- 2) "How hard was the real exam compared to this mock?" (one answer per attempt)
create table if not exists public.mock_feedback (
  attempt_id uuid primary key references public.mock_attempts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  difficulty text not null check (difficulty in ('much_easier', 'easier', 'same', 'harder', 'much_harder', 'not_taken')),
  created_at timestamptz not null default now()
);
alter table public.mock_feedback enable row level security;

drop policy if exists "Students read own mock feedback" on public.mock_feedback;
create policy "Students read own mock feedback" on public.mock_feedback for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Students give feedback on own attempts" on public.mock_feedback;
create policy "Students give feedback on own attempts" on public.mock_feedback for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.mock_attempts a where a.id = attempt_id and a.user_id = (select auth.uid())));

drop policy if exists "Admins read all mock feedback" on public.mock_feedback;
create policy "Admins read all mock feedback" on public.mock_feedback for select to authenticated using ((select private.is_content_admin()));

grant select, insert on public.mock_feedback to authenticated;
