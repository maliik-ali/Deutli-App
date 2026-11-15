-- AI + teacher feedback on the written part (Schriftlicher Ausdruck) of a mock exam.
-- The server writes rows (secret key); students can only read their own.
-- Also: the task text of the writing part, so the AI can judge "task completion".

alter table public.mock_papers
  add column if not exists writing_task text not null default '' check (char_length(writing_task) <= 4000);

create table if not exists public.writing_feedback (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.mock_attempts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  summary text not null default '',
  -- [{id: "task"|"communication"|"accuracy", score, max, note}]
  criteria jsonb not null default '[]',
  -- [{start, end, type, message, fix, source}]
  mistakes jsonb not null default '[]',
  provider text not null default '',
  model text not null default '',
  -- How many AI checks were used for this attempt (limit is 2 = one check + one retry).
  checks_used int not null default 1 check (checks_used between 1 and 2),
  teacher_status text not null default 'pending' check (teacher_status in ('pending', 'confirmed', 'changed')),
  teacher_total numeric check (teacher_total between 0 and 45),
  teacher_comment text check (char_length(teacher_comment) <= 2000),
  teacher_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists writing_feedback_user_idx on public.writing_feedback (user_id, created_at desc);

alter table public.writing_feedback enable row level security;

drop policy if exists "Students read own writing feedback" on public.writing_feedback;
create policy "Students read own writing feedback" on public.writing_feedback
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Admins read all writing feedback" on public.writing_feedback;
create policy "Admins read all writing feedback" on public.writing_feedback
  for select to authenticated using ((select private.is_content_admin()));

-- No insert/update/delete policy on purpose: only the server (secret key) writes here.
revoke all on public.writing_feedback from anon, authenticated;
grant select on public.writing_feedback to authenticated;
