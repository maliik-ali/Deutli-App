-- 11) Profile pictures.
-- Private bucket "avatars": each user has a folder named after their user id.
-- Users can only add, replace or delete files in their own folder.
-- Any logged-in user may view avatars (teachers and classmates will see them later),
-- always through short-lived signed links created by the server. Never public.
-- Safe to run more than once.

alter table public.profiles
  add column if not exists avatar_path text check (char_length(avatar_path) <= 200);

-- Users may change their own photo (the existing update policy limits it to their own row).
grant update (full_name, phone, languages, avatar_path) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 524288, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Logged-in users can view avatars" on storage.objects;
create policy "Logged-in users can view avatars"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can replace their own avatar" on storage.objects;
create policy "Users can replace their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
