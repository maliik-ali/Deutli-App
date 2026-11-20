-- Support and feedback messages from students. Only the server writes them (after checking the user and a rate limit);
-- a student can read their own, admins read all through the server.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('problem', 'idea', 'question', 'payment')),
  message text not null check (char_length(message) between 5 and 2000),
  -- The page the student was on, so we can see where it happened.
  page text check (char_length(page) <= 200),
  -- The student's email at the time, so an admin can reply even if the account changes later.
  email text check (char_length(email) <= 320),
  status text not null default 'new' check (status in ('new', 'in_progress', 'done')),
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);
create index if not exists feedback_user_idx on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;

drop policy if exists "Students read own feedback" on public.feedback;
create policy "Students read own feedback" on public.feedback
  for select to authenticated using (user_id = (select auth.uid()));

-- No insert or update policy on purpose: the server writes with the secret key.
revoke all on public.feedback from anon, authenticated;
grant select on public.feedback to authenticated;
