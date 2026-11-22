-- Chapter tests taken on the platform. Questions are visible to the batches the test is shared with;
-- the correct answers live in test_keys, which no student (or teacher) can read through the API: only the server.

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  instructions text check (char_length(instructions) <= 2000),
  time_limit_min int check (time_limit_min between 1 and 240),
  opens_at timestamptz,
  closes_at timestamptz,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists tests_academy_idx on public.tests (academy_id, created_at desc);

create table if not exists public.test_batches (
  test_id uuid not null references public.tests (id) on delete cascade,
  batch_id uuid not null references public.batches (id) on delete cascade,
  academy_id uuid not null references public.academies (id) on delete cascade,
  primary key (test_id, batch_id)
);
create index if not exists test_batches_batch_idx on public.test_batches (batch_id);

create table if not exists public.test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete cascade,
  position int not null,
  kind text not null check (kind in ('mc', 'tf', 'fill')),
  prompt text not null check (char_length(prompt) between 1 and 1000),
  options jsonb not null default '[]',   -- multiple choice: ["a", "b", ...]
  points numeric not null default 1 check (points > 0 and points <= 100)
);
create index if not exists test_questions_test_idx on public.test_questions (test_id, position);

-- Correct answers: no policy for anyone, so only the secret key can read or write.
create table if not exists public.test_keys (
  question_id uuid primary key references public.test_questions (id) on delete cascade,
  answer jsonb not null   -- mc: option index; tf: true/false; fill: ["accepted", "answers"]
);

create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  academy_id uuid not null references public.academies (id) on delete cascade,
  answers jsonb not null default '{}',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,
  max_score numeric,
  result jsonb
);
create unique index if not exists test_attempts_one_per_student on public.test_attempts (test_id, student_id);

alter table public.tests enable row level security;
alter table public.test_batches enable row level security;
alter table public.test_questions enable row level security;
alter table public.test_keys enable row level security;
alter table public.test_attempts enable row level security;

create or replace function private.can_see_test(p_test uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.test_batches tb
    join public.batch_members bm on bm.batch_id = tb.batch_id
    join public.tests t on t.id = tb.test_id
    where tb.test_id = p_test and t.published and bm.student_id = (select auth.uid())
  )
$$;
revoke all on function private.can_see_test(uuid) from public, anon;
grant execute on function private.can_see_test(uuid) to authenticated;

drop policy if exists "Read tests" on public.tests;
create policy "Read tests" on public.tests for select to authenticated
  using ((select private.is_academy_member(academy_id)) or (select private.can_see_test(id)) or (select private.is_content_admin()));
drop policy if exists "Read test batches" on public.test_batches;
create policy "Read test batches" on public.test_batches for select to authenticated
  using ((select private.is_academy_member(academy_id)) or (select private.is_batch_member(batch_id)) or (select private.is_content_admin()));
drop policy if exists "Read test questions" on public.test_questions;
create policy "Read test questions" on public.test_questions for select to authenticated
  using ((select private.can_see_test(test_id)) or exists (select 1 from public.tests t where t.id = test_id and (select private.is_academy_member(t.academy_id))) or (select private.is_content_admin()));
-- test_keys: no policy at all.
drop policy if exists "Read own test attempts" on public.test_attempts;
create policy "Read own test attempts" on public.test_attempts for select to authenticated
  using (student_id = (select auth.uid()) or (select private.is_academy_member(academy_id)) or (select private.is_content_admin()));

grant select on public.tests, public.test_batches, public.test_questions, public.test_attempts to authenticated;
-- No insert/update/delete grants: attempts, answers and scores are written by the server only.
