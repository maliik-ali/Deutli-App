-- Google and Apple sign-in: take the name from the provider (full_name or name) when there is no signup form.
-- The role is still always 'student' here.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')), 120), ''),
    nullif(left(trim(new.raw_user_meta_data ->> 'phone'), 30), '')
  );
  return new;
end;
$$;
