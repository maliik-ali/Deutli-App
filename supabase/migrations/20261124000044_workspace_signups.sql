-- Self-signup for teachers and schools (24 Nov 2026).
-- A new teacher answers a few questions while setting up a free workspace. We keep the answers so
-- Deutli can see who signed up, what they need, and what to offer. Written only by the server.
-- Safe to run more than once.

create table if not exists public.workspace_signups (
  academy_id uuid primary key references public.academies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  account_type text not null check (account_type in ('solo', 'school')),
  exams text[] not null default '{}',
  levels text[] not null default '{}',
  student_count text check (student_count in ('1-5', '6-30', '31-100', '100+')),
  tools text[] not null default '{}',
  wants text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists workspace_signups_created_idx on public.workspace_signups (created_at desc);

alter table public.workspace_signups enable row level security;
drop policy if exists "Owner and admins read signup answers" on public.workspace_signups;
create policy "Owner and admins read signup answers" on public.workspace_signups for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_content_admin()));
revoke all on public.workspace_signups from anon, authenticated;   -- Supabase grants everything by default; take it back
grant select on public.workspace_signups to authenticated;
-- No insert/update/delete grants: the server writes with the secret key after checking the role.
