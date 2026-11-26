-- Find a teacher (marketplace step 3, 26 Nov 2026).
-- 1) An academy chooses to be listed for new students (opt-in, off by default).
-- 2) A standalone student sends a "request to join" a listed teacher. Deutli handles it by hand at first:
--    the admin sends a payment link, assigns the teacher after payment and pays the teacher by bank transfer.
-- Requests are written only by the server; a student can read their own, admins read all.
-- Safe to run more than once.

alter table public.academies add column if not exists is_listed boolean not null default false;
alter table public.academies add column if not exists listed_at timestamptz;
create index if not exists academies_listed_idx on public.academies (is_listed) where is_listed;

create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  academy_id uuid references public.academies (id) on delete set null,
  message text check (message is null or char_length(message) <= 300),
  status text not null default 'new' check (status in ('new', 'payment_sent', 'assigned', 'declined')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (student_id <> teacher_id)
);
-- One open request per student and teacher.
create unique index if not exists join_requests_open_idx on public.join_requests (student_id, teacher_id) where status in ('new', 'payment_sent');
create index if not exists join_requests_status_idx on public.join_requests (status, created_at desc);
create index if not exists join_requests_student_idx on public.join_requests (student_id, created_at desc);

alter table public.join_requests enable row level security;
revoke all on public.join_requests from anon, authenticated;
grant select on public.join_requests to authenticated;

drop policy if exists "Students read their own requests, admins read all" on public.join_requests;
create policy "Students read their own requests, admins read all" on public.join_requests for select to authenticated
  using (student_id = (select auth.uid()) or (select private.is_content_admin()));
-- No insert, update or delete grants: the server writes with the secret key after checking who may.
