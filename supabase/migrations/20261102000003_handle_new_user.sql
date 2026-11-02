-- 3) Create a profile automatically when someone signs up
-- Run this third. Safe to run more than once.

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Role is always 'student' here. We never read a role from signup data,
  -- so nobody can sign themselves up as a teacher or admin.
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 120), ''),
    nullif(left(trim(new.raw_user_meta_data ->> 'phone'), 30), '')
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
