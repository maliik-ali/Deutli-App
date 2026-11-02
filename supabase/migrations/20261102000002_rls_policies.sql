-- 2) Security: helper functions, column permissions and RLS policies
-- Run this second. Safe to run more than once.

-- Helper functions live in a "private" schema that the public API cannot call.
-- They are SECURITY DEFINER so policies on profiles can look up the caller's
-- role without triggering the same policies again (avoids infinite recursion).
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create or replace function private.current_user_academy_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select academy_id from public.profiles where id = (select auth.uid())
$$;

revoke all on function private.current_user_role() from public, anon;
revoke all on function private.current_user_academy_id() from public, anon;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.current_user_academy_id() to authenticated;

-- Table permissions. Logged-out visitors (anon) get nothing.
revoke all on public.profiles from anon, authenticated;
revoke all on public.academies from anon, authenticated;

grant select on public.profiles to authenticated;
-- Users may only ever change these two columns. role and academy_id are
-- not in the list, so a student can never promote themselves.
grant update (full_name, phone) on public.profiles to authenticated;
grant select on public.academies to authenticated;

-- PROFILES -----------------------------------------------------------------

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Academy admins can read profiles in their academy" on public.profiles;
create policy "Academy admins can read profiles in their academy"
  on public.profiles for select
  to authenticated
  using (
    (select private.current_user_role()) = 'academy_admin'
    and academy_id is not null
    and academy_id = (select private.current_user_academy_id())
  );

drop policy if exists "Super admins can read all profiles" on public.profiles;
create policy "Super admins can read all profiles"
  on public.profiles for select
  to authenticated
  using ((select private.current_user_role()) = 'super_admin');

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Extra safety net: even if column permissions are changed by mistake later,
-- block any logged-in user from changing role or academy through the API.
-- (Changes made in the Supabase dashboard / SQL editor are not affected.)
create or replace function private.prevent_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and (new.role is distinct from old.role
          or new.academy_id is distinct from old.academy_id) then
    raise exception 'You are not allowed to change role or academy.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function private.prevent_role_change();

-- ACADEMIES ----------------------------------------------------------------

drop policy if exists "Members can read their own academy" on public.academies;
create policy "Members can read their own academy"
  on public.academies for select
  to authenticated
  using (id = (select private.current_user_academy_id()));

drop policy if exists "Super admins can read all academies" on public.academies;
create policy "Super admins can read all academies"
  on public.academies for select
  to authenticated
  using ((select private.current_user_role()) = 'super_admin');
