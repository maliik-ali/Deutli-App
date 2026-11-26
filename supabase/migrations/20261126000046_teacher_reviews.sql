-- Verified reviews of teachers (marketplace step 2, 26 Nov 2026).
-- One review per student per teacher. Who may write is checked on the server: a member of the teacher's batch
-- for 14 days or more, or marked present in one of the teacher's classes. Reviews are written, replied to and
-- moderated only by the server (secret key); logged-in users can only read their own review, admins read all.
-- Public pages read through the server and show only published reviews.
-- Safe to run more than once.

create table if not exists public.teacher_reviews (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  -- The academy the student studied in (for the academy page). Kept if the academy is deleted: set to null.
  academy_id uuid references public.academies (id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  helped text[] not null default '{}' check (cardinality(helped) <= 5),
  body text check (body is null or char_length(body) <= 600),
  reply text check (reply is null or char_length(reply) <= 400),
  replied_at timestamptz,
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, student_id),
  check (teacher_id <> student_id)
);
create index if not exists teacher_reviews_teacher_idx on public.teacher_reviews (teacher_id, status, created_at desc);
create index if not exists teacher_reviews_academy_idx on public.teacher_reviews (academy_id, status, created_at desc);

create table if not exists public.review_reports (
  review_id uuid not null references public.teacher_reviews (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('fake', 'offensive', 'spam', 'other')),
  note text check (note is null or char_length(note) <= 300),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (review_id, reporter_id)
);
create index if not exists review_reports_open_idx on public.review_reports (resolved, created_at desc);

alter table public.teacher_reviews enable row level security;
alter table public.review_reports enable row level security;

-- Supabase grants everything by default; take it back, then give back only reading.
revoke all on public.teacher_reviews from anon, authenticated;
revoke all on public.review_reports from anon, authenticated;
grant select on public.teacher_reviews to authenticated;
grant select on public.review_reports to authenticated;

drop policy if exists "Students read their own review, admins read all" on public.teacher_reviews;
create policy "Students read their own review, admins read all" on public.teacher_reviews for select to authenticated
  using (student_id = (select auth.uid()) or (select private.is_content_admin()));

drop policy if exists "Admins read review reports" on public.review_reports;
create policy "Admins read review reports" on public.review_reports for select to authenticated
  using ((select private.is_content_admin()));
-- No insert, update or delete grants: the server writes with the secret key after checking who may.
