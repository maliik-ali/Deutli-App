-- Homework, notes, files and links, shared with one or more batches (one copy, many batches).
-- Files live in a private bucket; students get short-lived signed links only if they are in a batch the item is shared with.

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('homework', 'notes', 'file', 'link')),
  title text not null check (char_length(title) between 1 and 160),
  body text check (char_length(body) <= 8000),
  url text check (url ~ '^https://' and char_length(url) <= 500),
  file_path text,
  file_name text check (char_length(file_name) <= 200),
  due_on date,
  created_at timestamptz not null default now()
);
create index if not exists materials_academy_idx on public.materials (academy_id, created_at desc);
create index if not exists materials_owner_idx on public.materials (owner_id);

create table if not exists public.material_batches (
  material_id uuid not null references public.materials (id) on delete cascade,
  batch_id uuid not null references public.batches (id) on delete cascade,
  academy_id uuid not null references public.academies (id) on delete cascade,
  primary key (material_id, batch_id)
);
create index if not exists material_batches_batch_idx on public.material_batches (batch_id);

-- A student ticks homework as done; the teacher sees who did.
create table if not exists public.material_done (
  material_id uuid not null references public.materials (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  academy_id uuid not null references public.academies (id) on delete cascade,
  done_at timestamptz not null default now(),
  primary key (material_id, student_id)
);

alter table public.materials enable row level security;
alter table public.material_batches enable row level security;
alter table public.material_done enable row level security;

create or replace function private.can_see_material(p_material uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.material_batches mb
    join public.batch_members bm on bm.batch_id = mb.batch_id
    where mb.material_id = p_material and bm.student_id = (select auth.uid())
  )
$$;
revoke all on function private.can_see_material(uuid) from public, anon;
grant execute on function private.can_see_material(uuid) to authenticated;

drop policy if exists "Read materials" on public.materials;
create policy "Read materials" on public.materials for select to authenticated
  using ((select private.is_academy_member(academy_id)) or (select private.can_see_material(id)) or (select private.is_content_admin()));
drop policy if exists "Read material batches" on public.material_batches;
create policy "Read material batches" on public.material_batches for select to authenticated
  using ((select private.is_academy_member(academy_id)) or (select private.is_batch_member(batch_id)) or (select private.is_content_admin()));
drop policy if exists "Read own done marks" on public.material_done;
create policy "Read own done marks" on public.material_done for select to authenticated
  using (student_id = (select auth.uid()) or (select private.is_academy_member(academy_id)) or (select private.is_content_admin()));
grant select on public.materials, public.material_batches, public.material_done to authenticated;
-- Writes only by the server (secret key).

insert into storage.buckets (id, name, public, file_size_limit)
values ('materials', 'materials', false, 26214400)
on conflict (id) do nothing;
