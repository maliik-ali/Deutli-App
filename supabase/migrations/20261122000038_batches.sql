-- Batches (a teacher's group of students) and announcements. Replaces WhatsApp groups.
-- Every table carries academy_id. Students see only their own batches; written only by the server.

create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  level text check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  exam text check (char_length(exam) <= 40),
  starts_on date,
  ends_on date,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists batches_academy_idx on public.batches (academy_id, archived);
create index if not exists batches_teacher_idx on public.batches (teacher_id);

create table if not exists public.batch_members (
  batch_id uuid not null references public.batches (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  academy_id uuid not null references public.academies (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (batch_id, student_id)
);
create index if not exists batch_members_student_idx on public.batch_members (student_id);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches (id) on delete cascade,
  academy_id uuid not null references public.academies (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists announcements_batch_idx on public.announcements (batch_id, created_at desc);

alter table public.live_classes add column if not exists batch_id uuid references public.batches (id) on delete set null;
create index if not exists live_classes_batch_idx on public.live_classes (batch_id);
do $$ begin
  alter table public.join_codes add constraint join_codes_batch_fk foreign key (batch_id) references public.batches (id) on delete cascade;
exception when duplicate_object then null; end $$;

-- Helper: is the logged-in student in this batch? (private, so the policies do not loop)
create or replace function private.is_batch_member(p_batch uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.batch_members where batch_id = p_batch and student_id = (select auth.uid()))
$$;
revoke all on function private.is_batch_member(uuid) from public, anon;
grant execute on function private.is_batch_member(uuid) to authenticated;

alter table public.batches enable row level security;
alter table public.batch_members enable row level security;
alter table public.announcements enable row level security;

drop policy if exists "Members of the workspace or the batch read batches" on public.batches;
create policy "Members of the workspace or the batch read batches" on public.batches for select to authenticated
  using ((select private.is_academy_member(academy_id)) or (select private.is_batch_member(id)) or (select private.is_content_admin()));
drop policy if exists "Read batch members" on public.batch_members;
create policy "Read batch members" on public.batch_members for select to authenticated
  using (student_id = (select auth.uid()) or (select private.is_academy_member(academy_id)) or (select private.is_content_admin()));
drop policy if exists "Read announcements" on public.announcements;
create policy "Read announcements" on public.announcements for select to authenticated
  using ((select private.is_batch_member(batch_id)) or (select private.is_academy_member(academy_id)) or (select private.is_content_admin()));

grant select on public.batches, public.batch_members, public.announcements to authenticated;
-- No insert/update/delete grants: the server writes with the secret key after checking who is asking.
