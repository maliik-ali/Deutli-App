-- Live classes: teacher profiles, classes, Zoom links, registrations.
--  * teacher_profiles: what students see about a teacher (headline, bio, topics).
--  * live_classes: one row per class session. "Course" = course_title; what a teacher teaches
--    right now is worked out from their upcoming classes (never goes stale).
--  * live_class_links: the Zoom (or Meet/Teams) link, kept apart so students can never read it
--    directly. The server hands it out only to registered students shortly before the class.
--  * class_registrations: who signed up, joined, attended and how they rated the class.
-- Students never write these rows directly: the server does it with the secret key.

create table if not exists public.teacher_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  headline text check (char_length(headline) <= 120),
  bio text check (char_length(bio) <= 1200),
  specialties text[] not null default '{}' check (cardinality(specialties) <= 6),
  speaks text[] not null default '{}' check (cardinality(speaks) <= 6),
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.live_classes (
  id uuid primary key default gen_random_uuid(),
  -- Reserved for selling Deutli to several academies later; not used yet.
  academy_id uuid references public.academies (id) on delete set null,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  course_title text not null check (char_length(course_title) between 2 and 80),
  title text not null check (char_length(title) between 2 and 120),
  description text check (char_length(description) <= 300),
  syllabus text check (char_length(syllabus) <= 3000),
  skill text not null default 'general'
    check (skill in ('general', 'reading', 'listening', 'writing', 'speaking', 'grammar', 'vocabulary')),
  level text not null default 'b1' check (level in ('all', 'a1', 'a2', 'b1', 'b2')),
  starts_at timestamptz not null,
  duration_min int not null default 60 check (duration_min between 15 and 240),
  capacity int check (capacity is null or capacity between 1 and 500),
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists live_classes_starts_idx on public.live_classes (starts_at);
create index if not exists live_classes_teacher_idx on public.live_classes (teacher_id, starts_at);

create table if not exists public.live_class_links (
  class_id uuid primary key references public.live_classes (id) on delete cascade,
  join_url text not null check (join_url ~* '^https://' and char_length(join_url) <= 500),
  passcode text check (char_length(passcode) <= 40)
);

create table if not exists public.class_registrations (
  class_id uuid not null references public.live_classes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'cancelled')),
  registered_at timestamptz not null default now(),
  joined_at timestamptz,
  attended boolean,
  rating smallint check (rating between 1 and 5),
  primary key (class_id, user_id)
);
create index if not exists class_registrations_user_idx on public.class_registrations (user_id, status);

alter table public.teacher_profiles enable row level security;
alter table public.live_classes enable row level security;
alter table public.live_class_links enable row level security;
alter table public.class_registrations enable row level security;

-- Teacher profiles: everyone logged in sees public ones; a teacher edits their own; admins edit all.
drop policy if exists "See public teacher profiles" on public.teacher_profiles;
create policy "See public teacher profiles" on public.teacher_profiles for select to authenticated
  using (is_public or user_id = (select auth.uid()) or (select private.is_content_admin()));

drop policy if exists "Teachers add their own profile" on public.teacher_profiles;
create policy "Teachers add their own profile" on public.teacher_profiles for insert to authenticated
  with check (
    (select private.is_content_admin())
    or (user_id = (select auth.uid()) and (select private.current_user_role()) = 'teacher')
  );

drop policy if exists "Teachers edit their own profile" on public.teacher_profiles;
create policy "Teachers edit their own profile" on public.teacher_profiles for update to authenticated
  using ((select private.is_content_admin()) or user_id = (select auth.uid()))
  with check ((select private.is_content_admin()) or user_id = (select auth.uid()));

-- Classes: everyone logged in can see them (the link is kept in another table).
drop policy if exists "See classes" on public.live_classes;
create policy "See classes" on public.live_classes for select to authenticated using (true);

drop policy if exists "Teachers add their own classes" on public.live_classes;
create policy "Teachers add their own classes" on public.live_classes for insert to authenticated
  with check (
    (select private.is_content_admin())
    or (teacher_id = (select auth.uid()) and (select private.current_user_role()) = 'teacher')
  );

drop policy if exists "Teachers edit their own classes" on public.live_classes;
create policy "Teachers edit their own classes" on public.live_classes for update to authenticated
  using ((select private.is_content_admin()) or teacher_id = (select auth.uid()))
  with check ((select private.is_content_admin()) or teacher_id = (select auth.uid()));

drop policy if exists "Teachers delete their own classes" on public.live_classes;
create policy "Teachers delete their own classes" on public.live_classes for delete to authenticated
  using ((select private.is_content_admin()) or teacher_id = (select auth.uid()));

-- Links: only the class's teacher and admins. Students get the link from the server.
drop policy if exists "Teachers manage their class links" on public.live_class_links;
create policy "Teachers manage their class links" on public.live_class_links for all to authenticated
  using (
    (select private.is_content_admin())
    or exists (select 1 from public.live_classes c where c.id = class_id and c.teacher_id = (select auth.uid()))
  )
  with check (
    (select private.is_content_admin())
    or exists (select 1 from public.live_classes c where c.id = class_id and c.teacher_id = (select auth.uid()))
  );

-- Registrations: you see your own; a teacher sees who signed up for their classes; admins see all.
drop policy if exists "See registrations" on public.class_registrations;
create policy "See registrations" on public.class_registrations for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_content_admin())
    or exists (select 1 from public.live_classes c where c.id = class_id and c.teacher_id = (select auth.uid()))
  );

-- Signing up: one step that locks the class row, so the last seat can never be given out twice.
-- Only the server (service_role) may call it.
create or replace function public.register_for_class(p_class uuid, p_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  taken int;
begin
  select * into c from public.live_classes where id = p_class for update;
  if not found then return 'not_found'; end if;
  if c.status <> 'scheduled' then return 'cancelled'; end if;
  if c.starts_at + make_interval(mins => c.duration_min) <= now() then return 'ended'; end if;
  if exists (
    select 1 from public.class_registrations
    where class_id = p_class and user_id = p_user and status = 'registered'
  ) then
    return 'ok';
  end if;
  if c.capacity is not null then
    select count(*) into taken from public.class_registrations where class_id = p_class and status = 'registered';
    if taken >= c.capacity then return 'full'; end if;
  end if;
  insert into public.class_registrations (class_id, user_id, status)
  values (p_class, p_user, 'registered')
  on conflict (class_id, user_id) do update set status = 'registered', registered_at = now();
  return 'ok';
end;
$$;

revoke all on function public.register_for_class(uuid, uuid) from public, anon, authenticated;
grant execute on function public.register_for_class(uuid, uuid) to service_role;
