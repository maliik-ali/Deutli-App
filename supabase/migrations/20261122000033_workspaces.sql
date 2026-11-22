-- Workspaces: every teacher or school is a row in public.academies.
-- A solo teacher gets a personal workspace (kind = 'teacher'); a school is kind = 'school'.
-- The workspace owns the students, branding and the plan, and is what gets billed.
-- Safe to run more than once. Student plans and checkout are not changed.

-- 1) Plans: add the workspace (teacher / school) plans next to the student Pro plans.
alter table public.plans add column if not exists kind text not null default 'student' check (kind in ('student', 'teacher', 'school'));
alter table public.plans add column if not exists code text unique;                 -- stable name for seeding, e.g. 'teacher_free'
alter table public.plans add column if not exists max_students int check (max_students >= 0);  -- null = no fixed limit
alter table public.plans add column if not exists max_teachers int check (max_teachers >= 0);
alter table public.plans add column if not exists features text[] not null default '{}';       -- e.g. logo, colour, font, batches, reports, subdomain, remove_branding
alter table public.plans add column if not exists extra_student_eur_cents int check (extra_student_eur_cents >= 0);
alter table public.plans add column if not exists extra_student_pkr int check (extra_student_pkr >= 0);

-- Students must never see workspace plans in checkout: only kind = 'student' is readable by logged-in users.
-- (Admin screens read workspace plans with the secret key.)
drop policy if exists "Anyone logged in sees active plans" on public.plans;
create policy "Anyone logged in sees active plans" on public.plans for select to authenticated
  using (kind = 'student' and (active or (select private.is_content_admin())));

-- 2) Prices per region. 'global' is EUR; 'south_asia' is a fixed PKR price (not converted from EUR).
create table if not exists public.plan_prices (
  plan_id uuid not null references public.plans (id) on delete cascade,
  region text not null check (region in ('global', 'south_asia')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor int not null check (amount_minor >= 0),   -- cents / paisa
  primary key (plan_id, region)
);
alter table public.plan_prices enable row level security;
drop policy if exists "Admins read plan prices" on public.plan_prices;
create policy "Admins read plan prices" on public.plan_prices for select to authenticated using ((select private.is_content_admin()));
grant select on public.plan_prices to authenticated;
-- Writes: only the server, with the secret key.

-- 3) Academies become workspaces.
alter table public.academies add column if not exists kind text not null default 'school' check (kind in ('teacher', 'school'));
alter table public.academies add column if not exists slug text unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,40}$');
alter table public.academies add column if not exists owner_id uuid references auth.users (id) on delete set null;
alter table public.academies add column if not exists plan_id uuid references public.plans (id) on delete set null;
alter table public.academies add column if not exists show_powered_by boolean not null default true;
alter table public.academies add column if not exists discount_percent int not null default 0 check (discount_percent between 0 and 100);
alter table public.academies add column if not exists discount_until date;
create index if not exists academies_owner_idx on public.academies (owner_id);

-- 4) Members of a workspace. One person can belong to several workspaces.
create table if not exists public.academy_members (
  academy_id uuid not null references public.academies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'teacher')),
  created_at timestamptz not null default now(),
  primary key (academy_id, user_id)
);
create index if not exists academy_members_user_idx on public.academy_members (user_id);
alter table public.academy_members enable row level security;

-- Helper (private, so the policies do not loop on themselves).
create or replace function private.is_academy_member(p_academy uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.academy_members
    where academy_id = p_academy and user_id = (select auth.uid())
  )
$$;
revoke all on function private.is_academy_member(uuid) from public, anon;
grant execute on function private.is_academy_member(uuid) to authenticated;

drop policy if exists "Members read their memberships" on public.academy_members;
create policy "Members read their memberships" on public.academy_members for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_academy_member(academy_id)) or (select private.is_content_admin()));
grant select on public.academy_members to authenticated;

drop policy if exists "Members read their workspace" on public.academies;
create policy "Members read their workspace" on public.academies for select to authenticated
  using ((select private.is_academy_member(id)));
-- Writes to academies and academy_members: only the server, with the secret key.

-- 5) A personal workspace for every existing teacher (existing students are not touched).
do $$
declare
  t record;
  new_id uuid;
  free_plan uuid;
begin
  select id into free_plan from public.plans where code = 'teacher_free';  -- null until the seed migration runs; filled there
  for t in select id, full_name from public.profiles where role = 'teacher' and not exists (
    select 1 from public.academy_members m where m.user_id = profiles.id and m.role = 'owner'
  ) loop
    insert into public.academies (name, kind, owner_id, plan_id)
      values (coalesce(nullif(t.full_name, ''), 'Teacher') || '''s workspace', 'teacher', t.id, free_plan)
      returning id into new_id;
    insert into public.academy_members (academy_id, user_id, role) values (new_id, t.id, 'owner');
    update public.profiles set academy_id = new_id where id = t.id and academy_id is null;
  end loop;
end $$;
