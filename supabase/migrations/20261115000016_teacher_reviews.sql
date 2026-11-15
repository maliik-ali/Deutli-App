-- Teacher link + teacher checks of the written part.
--  * profiles.teacher_id: the student's own teacher (set by the server only; not in any update grant).
--  * profiles.teacher_code: a short code a teacher gives to students so they can send emails to them.
--  * writing_reviews: one teacher check per attempt (requested -> done). The teacher's score lives here.

alter table public.profiles add column if not exists teacher_id uuid references public.profiles (id) on delete set null;
alter table public.profiles add column if not exists teacher_code text unique check (teacher_code ~ '^[A-Z0-9]{6}$');
create index if not exists profiles_teacher_id_idx on public.profiles (teacher_id);

-- The teacher's decision now lives in writing_reviews (these columns were never used).
alter table public.writing_feedback
  drop column if exists teacher_status,
  drop column if exists teacher_total,
  drop column if exists teacher_comment,
  drop column if exists teacher_id;

create table if not exists public.writing_reviews (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.mock_attempts (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  -- null = open request (a standalone student asked for a teacher check; any teacher may take it)
  teacher_id uuid references public.profiles (id) on delete set null,
  -- assigned = student's own teacher, code = sent with a teacher code, offer = standalone student asked for a teacher
  source text not null check (source in ('assigned', 'code', 'offer')),
  status text not null default 'requested' check (status in ('requested', 'done')),
  -- [{id: "task"|"communication"|"accuracy", score, max}]
  criteria jsonb not null default '[]',
  total numeric check (total between 0 and 45),
  comment text check (char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists writing_reviews_teacher_idx on public.writing_reviews (teacher_id, status, created_at desc);
create index if not exists writing_reviews_student_idx on public.writing_reviews (student_id);

alter table public.writing_reviews enable row level security;

drop policy if exists "Students read own writing reviews" on public.writing_reviews;
create policy "Students read own writing reviews" on public.writing_reviews
  for select to authenticated using (student_id = (select auth.uid()));

drop policy if exists "Teachers read their writing reviews" on public.writing_reviews;
create policy "Teachers read their writing reviews" on public.writing_reviews
  for select to authenticated using (teacher_id = (select auth.uid()));

drop policy if exists "Admins read all writing reviews" on public.writing_reviews;
create policy "Admins read all writing reviews" on public.writing_reviews
  for select to authenticated using ((select private.is_content_admin()));

-- Only the server (secret key) creates and changes reviews, after checking roles in code.
revoke all on public.writing_reviews from anon, authenticated;
grant select on public.writing_reviews to authenticated;
