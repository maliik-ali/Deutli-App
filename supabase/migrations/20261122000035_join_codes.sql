-- Join codes: a student joins a teacher or school with a code, a link or a QR.
-- The old 6-letter profiles.teacher_code is copied here (same letters), so there is one system.
-- batch_id is reserved for batches (not built yet). Written only by the server.

create table if not exists public.join_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  academy_id uuid not null references public.academies (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  batch_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists join_codes_teacher_idx on public.join_codes (teacher_id, active);
create index if not exists join_codes_academy_idx on public.join_codes (academy_id);

alter table public.join_codes enable row level security;
drop policy if exists "Teachers and members read their codes" on public.join_codes;
create policy "Teachers and members read their codes" on public.join_codes for select to authenticated
  using (teacher_id = (select auth.uid()) or (select private.is_academy_member(academy_id)) or (select private.is_content_admin()));
grant select on public.join_codes to authenticated;
-- No insert/update/delete grants: the server writes with the secret key after checking the role.

-- Copy each teacher's existing code into their workspace.
insert into public.join_codes (code, academy_id, teacher_id)
select p.teacher_code, m.academy_id, p.id
from public.profiles p
join lateral (
  select academy_id from public.academy_members
  where user_id = p.id order by (role = 'owner') desc, created_at limit 1
) m on true
where p.role = 'teacher' and p.teacher_code is not null
on conflict (code) do nothing;
